import {STUDY_PROTOCOL,STUDY_START_AT} from './study.ts';
import {settings} from './settings.ts';
import type {Env} from './types.ts';

const uuid=/^[a-f0-9-]{36}$/i;
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:Request, env:Env){
 const owner=request.headers.get('oai-authenticated-user-id');
 if(!owner)return reply({error:'请先登录后上传'},401);
 const origin=request.headers.get('origin');if(origin&&origin!==env.ALLOWED_ORIGIN)return reply({error:'来源无效'},403);
 if(!request.headers.get('content-type')?.includes('application/json'))return reply({error:'格式无效'},415);
 const body=await request.text();if(body.length>15000)return reply({error:'记录过大'},413);
 let e:any;try{e=JSON.parse(body)}catch{return reply({error:'JSON 无效'},400)}
 if(e?.protocol!==STUDY_PROTOCOL||Date.parse(e?.at)<Date.parse(STUDY_START_AT))return reply({error:'正式评测已开始，请刷新页面开启新评测；旧测试记录不再接收。'},409);
 if(!e||!uuid.test(e.id)||!uuid.test(e.sessionId)||!Number.isInteger(e.seq)||e.seq<1||e.seq>1000||!['p01','p02','p03','p04','p05'].includes(e.personaId)||!['without_skill','with_skill'].includes(e.condition)||!['start','user_message','agent_message','end','rating','complete'].includes(e.type)||!Number.isFinite(Date.parse(e.at))||e.protocol!==STUDY_PROTOCOL||!['demo','api_preview','study'].includes(e.mode))return reply({error:'记录字段无效'},400);
 if(['user_message','agent_message'].includes(e.type)&&(typeof e.text!=='string'||!e.text.trim()||e.text.length>2000||!Number.isInteger(e.turn)||e.turn<1||e.turn>settings(env).maxTurns))return reply({error:'消息或轮次无效'},400);
 if(e.type==='rating'&&(!Number.isInteger(e.score)||e.score<1||e.score>5||typeof e.note!=='string'||e.note.length>2000))return reply({error:'评分无效'},400);
 if(!env.DB)return reply({error:'数据库未就绪'},503);
 try{
 const now=new Date().toISOString();
 await env.DB.prepare('INSERT INTO study_sessions (id,owner,created_at) VALUES (?,?,?) ON CONFLICT(id) DO NOTHING').bind(e.sessionId,owner,now).run();
 const session=await env.DB.prepare('SELECT owner FROM study_sessions WHERE id=?').bind(e.sessionId).first<{owner:string}>();
 if(session?.owner!==owner)return reply({error:'无权访问此会话'},403);
 const prior=await env.DB.prepare('SELECT payload,received_at FROM study_events WHERE id=? AND session_id=?').bind(e.id,e.sessionId).first<{payload:string,received_at:string}>();
 if(prior)return prior.payload===body?reply({saved:true,id:e.id,receivedAt:prior.received_at}):reply({error:'重复 ID 的内容不一致'},409);
 await env.DB.prepare('INSERT INTO study_events (id,session_id,seq,payload,received_at) VALUES (?,?,?,?,?)').bind(e.id,e.sessionId,e.seq,body,now).run();
 return reply({saved:true,id:e.id,receivedAt:now});
 }catch{return reply({error:'保存失败，请重试'},503)}
}
export async function GET(request:Request, env:Env){
 const owner=request.headers.get('oai-authenticated-user-id');if(!owner)return reply({error:'请先登录'},401);
 const sessionId=new URL(request.url).searchParams.get('sessionId');if(!sessionId||!uuid.test(sessionId))return reply({error:'会话 ID 无效'},400);
 if(!env.DB)return reply({error:'数据库未就绪'},503);
 const s=await env.DB.prepare('SELECT owner FROM study_sessions WHERE id=?').bind(sessionId).first<{owner:string}>();
 if(!s||s.owner!==owner)return reply({error:'记录不存在'},404);
 const result=await env.DB.prepare('SELECT payload,received_at FROM study_events WHERE session_id=? ORDER BY seq').bind(sessionId).all<{payload:string,received_at:string}>();
 const turns=await env.DB.prepare('SELECT persona_id,condition,turn,user_text,assistant_text,status,response_id,usage,error,created_at,updated_at FROM model_turns WHERE session_id=? ORDER BY created_at').bind(sessionId).all();
 return reply({sessionId,modelTurns:turns.results,events:result.results.map(x=>({...JSON.parse(x.payload),receivedAt:x.received_at}))});
}
