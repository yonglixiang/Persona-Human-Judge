import type {Env} from './types.ts';
const enc=new TextEncoder();
async function key(secret:string){return crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
const b64=(a:Uint8Array)=>btoa(String.fromCharCode(...a)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const from64=(s:string)=>Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
export async function issue(secret:string,ttl=86400*30){const payload=b64(enc.encode(JSON.stringify({sub:crypto.randomUUID(),exp:Math.floor(Date.now()/1000)+ttl})));const sig=await crypto.subtle.sign('HMAC',await key(secret),enc.encode(payload));return payload+'.'+b64(new Uint8Array(sig));}
export async function verify(token:string,secret:string){try{const [payload,sig,...rest]=token.split('.');if(rest.length||!await crypto.subtle.verify('HMAC',await key(secret),from64(sig),enc.encode(payload)))return null;const data=JSON.parse(new TextDecoder().decode(from64(payload)));return /^[0-9a-f-]{36}$/i.test(data.sub)&&Number.isFinite(data.exp)&&data.exp>Date.now()/1000?data.sub:null;}catch{return null}}
export async function login(request:Request,env:Env,ttl=86400*30){
 if(!env.SESSION_SECRET||env.SESSION_SECRET.length<32||!env.STUDY_ACCESS_CODE)return Response.json({error:'研究访问配置尚未完成'}, {status:503});
 if(env.AUTH_LIMITER&&!((await env.AUTH_LIMITER.limit({key:request.headers.get('CF-Connecting-IP')??'unknown'})).success))return Response.json({error:'尝试过于频繁，请稍后再试'},{status:429});
 const raw=await request.text();if(raw.length>1000)return Response.json({error:'请求无效'},{status:400});
 let code;try{code=JSON.parse(raw).code}catch{return Response.json({error:'请求无效'},{status:400})}
 const digest=async(v:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(v)));
 const a=await digest(typeof code==='string'?code:''),b=await digest(env.STUDY_ACCESS_CODE);let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];
 if(diff)return Response.json({error:'访问口令不正确'},{status:401});
 return Response.json({token:await issue(env.SESSION_SECRET,ttl)});
}
