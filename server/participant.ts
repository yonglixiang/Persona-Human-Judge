import type {Env} from './types.ts';
export async function handle(request:Request,env:Env){
 const owner=request.headers.get('oai-authenticated-user-id');if(!owner)return Response.json({error:'请先登录'},{status:401});
 if(request.method==='GET'){const profile=await env.DB.prepare('SELECT nickname FROM participant_profiles WHERE owner=?').bind(owner).first<{nickname:string}>();return Response.json({nickname:profile?.nickname||null});}
 if(request.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});
 const raw=await request.text();if(raw.length>1000)return Response.json({error:'昵称过长'},{status:400});
 let data:any;try{data=JSON.parse(raw)}catch{return Response.json({error:'请求无效'},{status:400})}
 const nickname=typeof data.nickname==='string'?data.nickname.trim():'';
 if(!nickname||Array.from(nickname).length>40||/[\u0000-\u001f\u007f]/.test(nickname))return Response.json({error:'请填写 1–40 个字符的昵称'},{status:400});
 await env.DB.prepare('INSERT INTO participant_profiles(owner,nickname,created_at) VALUES(?,?,?) ON CONFLICT(owner) DO NOTHING').bind(owner,nickname,new Date().toISOString()).run();
 const saved=await env.DB.prepare('SELECT nickname FROM participant_profiles WHERE owner=?').bind(owner).first<{nickname:string}>();return Response.json({nickname:saved?.nickname});
}
