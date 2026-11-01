import {handle as admin} from './admin.ts';
import type {Env} from './types.ts';
import {login,verify} from './auth.ts';
import * as chat from './chat.ts';
import * as events from './events.ts';
import {metadata} from './personas.ts';
export default {async fetch(request:Request,env:Env){
 const origin=request.headers.get('Origin');const allowed=origin===env.ALLOWED_ORIGIN;
 const headers:Record<string,string>={'Cache-Control':'no-store','Vary':'Origin'};
 if(allowed)Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, OPTIONS'});
 const finish=(r:Response)=>{const result=new Response(r.body,r);for(const [k,v]of Object.entries(headers))result.headers.set(k,v);return result};
 if(origin&&!allowed)return finish(Response.json({error:'来源不允许'},{status:403}));
 if(request.method==='OPTIONS')return finish(new Response(null,{status:204,headers}));
 const path=new URL(request.url).pathname;
 try{
 if(path.startsWith('/api/admin/'))return finish(await admin(request,env));
 if(path==='/api/session'&&request.method==='POST')return finish(await login(request,env));
 if(!env.SESSION_SECRET)return finish(Response.json({error:'服务端尚未配置'},{status:503}));
 const token=request.headers.get('Authorization')?.replace(/^Bearer /,'')??'';const owner=await verify(token,env.SESSION_SECRET);
 if(!owner)return finish(Response.json({error:'请先输入研究访问口令',code:'AUTH_REQUIRED'},{status:401}));
 const incoming=new Headers(request.headers);incoming.delete('oai-authenticated-user-id');incoming.delete('oai-authenticated-user-email');incoming.set('oai-authenticated-user-id',owner);
 const req=new Request(request,{headers:incoming});
 if(path==='/api/personas'&&request.method==='GET')return finish(Response.json({personas:await metadata(env)}));
 if(path==='/api/chat'&&request.method==='GET')return finish(await chat.GET(req,env));
 if(path==='/api/chat'&&request.method==='POST')return finish(await chat.POST(req,env));
 if(path==='/api/events'&&request.method==='GET')return finish(await events.GET(req,env));
 if(path==='/api/events'&&request.method==='POST')return finish(await events.POST(req,env));
 return finish(Response.json({error:'Not found'},{status:404}));
 }catch{return finish(Response.json({error:'服务配置或资料不可用，请联系研究负责人'},{status:503}))}
}};
