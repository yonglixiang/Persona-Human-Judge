import {settings} from './settings.ts';
import {skill,metadata} from './personas.ts';
import type {Env} from './types.ts';
import {responseBody,outputText} from './openai-chat.ts';

const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const uuid=/^[a-f0-9-]{36}$/i;
type Turn={request_id:string;session_id:string;persona_id:string;condition:string;turn:number;status:string;user_text:string;assistant_text:string;response_id:string;updated_at:string};
export async function GET(request:Request, env:Env){
 if(!request.headers.get('oai-authenticated-user-id'))return reply({ready:false,error:'请先登录'},401);
 const cfg=settings(env);let personasReady=false;try{await metadata(env);await Promise.all(['p01','p02','p03','p04','p05'].map(id=>skill(env,id)));personasReady=true}catch{}return reply({ready:!!env.OPENAI_API_KEY&&personasReady,maxTurns:cfg.maxTurns,mode:'study',error:!personasReady?'人格资料尚未上传':!env.OPENAI_API_KEY?'模型服务尚未配置':''});
}
export async function POST(request:Request, env:Env){
 const owner=request.headers.get('oai-authenticated-user-id');if(!owner)return reply({error:'请先登录'},401);
 const origin=request.headers.get('origin');if(origin&&origin!==env.ALLOWED_ORIGIN)return reply({error:'来源无效'},403);
 const raw=await request.text();if(raw.length>2000)return reply({error:'请求过大'},413);
 let b:any;try{b=JSON.parse(raw)}catch{return reply({error:'请求格式错误'},400)}
 if(!b||!uuid.test(b.sessionId)||!uuid.test(b.eventId)||!['p01','p02','p03','p04','p05'].includes(b.personaId)||!['without_skill','with_skill'].includes(b.condition))return reply({error:'请求字段无效'},400);
 if(!env.DB)return reply({error:'数据库未就绪'},503);
 const db=env.DB;const cfg=settings(env);const MODEL=cfg.model,EFFORT=cfg.effort;
 try{
 const session=await db.prepare('SELECT owner FROM study_sessions WHERE id=?').bind(b.sessionId).first<{owner:string}>();
 if(!session||session.owner!==owner)return reply({error:'会话不存在'},404);
 const existing=await db.prepare('SELECT * FROM model_turns WHERE request_id=?').bind(b.eventId).first<Turn>();
 if(existing&&(existing.session_id!==b.sessionId||existing.persona_id!==b.personaId||existing.condition!==b.condition))return reply({error:'请求不匹配'},409);
 if(existing?.status==='completed')return reply({text:existing.assistant_text,requestId:b.eventId,responseId:existing.response_id,cached:true});
 if(!env.OPENAI_API_KEY)return reply({error:'服务端尚未配置 OpenAI API 密钥'},503);
 const events=await db.prepare('SELECT payload FROM study_events WHERE session_id=? ORDER BY seq').bind(b.sessionId).all<{payload:string}>();
 const trialEvents=events.results.map(x=>JSON.parse(x.payload)).filter(x=>x.personaId===b.personaId&&x.condition===b.condition);
 const event=trialEvents.find(x=>x.id===b.eventId&&x.type==='user_message'&&x.mode==='study');
 if(!event)return reply({error:'消息尚未保存，请重试'},409);
 if(trialEvents.some(x=>x.type==='rating'||x.type==='end'))return reply({error:'本段对话已结束'},409);
 const rows=await db.prepare("SELECT * FROM model_turns WHERE session_id=? AND persona_id=? AND condition=? AND status='completed' ORDER BY turn").bind(b.sessionId,b.personaId,b.condition).all<Turn>();
 if(rows.results.length>=cfg.maxTurns)return reply({error:'已达到对话轮次上限'},409);
 const turn=rows.results.length+1;if(event.turn!==turn)return reply({error:'对话轮次不一致，请刷新后重试'},409);
 const personaSkill=b.condition==='with_skill'?await skill(env,b.personaId):{text:'',version:'without-skill'};const PROMPT_VERSION=personaSkill.version;
 const now=new Date().toISOString();
 if(existing){
 // A stale/uncertain call is not automatically duplicated: the original may still be running.
 if(existing.status==='pending')return reply({error:'此回复仍在处理中，请稍后重试'},409);
 const update=await db.prepare("UPDATE model_turns SET status='pending',error=NULL,updated_at=? WHERE request_id=? AND status='failed'").bind(now,b.eventId).run();
 if(update.meta.changes!==1)return reply({error:'回复正在处理中'},409);
 }else{
 const insert=await db.prepare("INSERT INTO model_turns(request_id,session_id,persona_id,condition,turn,user_text,status,model,reasoning,prompt_version,created_at,updated_at) VALUES(?,?,?,?,?,?,'pending',?,?,?,?,?) ON CONFLICT DO NOTHING").bind(b.eventId,b.sessionId,b.personaId,b.condition,turn,event.text,MODEL,EFFORT,PROMPT_VERSION,now,now).run();
 if(insert.meta.changes!==1)return reply({error:'本轮已有请求，请重试原消息'},409);
 }
 try{
 const upstream=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(responseBody(env,b.condition,rows.results,event.text,personaSkill.text)),signal:AbortSignal.timeout(90000)});
 if(!upstream.ok)throw Error(upstream.status===429?'模型服务繁忙或额度不足，请稍后重试':upstream.status===401||upstream.status===403?'模型访问配置不可用，请联系研究负责人':`模型服务暂时不可用（${upstream.status}）`);
 const data:any=await upstream.json();const text=outputText(data);
 await db.prepare("UPDATE model_turns SET status='completed',assistant_text=?,response_id=?,usage=?,updated_at=? WHERE request_id=?").bind(text,data.id??null,JSON.stringify(data.usage??{}),new Date().toISOString(),b.eventId).run();
 return reply({text,requestId:b.eventId,responseId:data.id});
 }catch(error){
 const message=error instanceof Error&&error.name==='TimeoutError'?'模型回复超时，请重试':error instanceof Error?error.message:'模型调用失败，请重试';
 // Never return provider response bodies, prompts or credentials.
 const safe=message.startsWith('模型')||message.startsWith('回复')?message:'模型调用失败，请重试';
 await db.prepare("UPDATE model_turns SET status='failed',error=?,updated_at=? WHERE request_id=? AND status='pending'").bind(safe,new Date().toISOString(),b.eventId).run();
 return reply({error:safe},502);
 }
 }catch{return reply({error:'对话保存失败，请重试'},503)}
}
