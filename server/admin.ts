import type {Env} from './types.ts';
import {login,verify} from './auth.ts';
import {metadata} from './personas.ts';
const base=`WITH eligible AS (
 SELECT s.* FROM study_sessions s WHERE EXISTS (
 SELECT 1 FROM study_events e WHERE e.session_id=s.id AND json_extract(e.payload,'$.mode')='study')
), ranked AS (
 SELECT e.session_id,e.seq,e.received_at,json_extract(e.payload,'$.personaId') persona_id,
 json_extract(e.payload,'$.condition') condition,json_extract(e.payload,'$.score') score,
 json_extract(e.payload,'$.note') note,json_extract(e.payload,'$.turns') turns,
 ROW_NUMBER() OVER (PARTITION BY e.session_id,json_extract(e.payload,'$.personaId'),json_extract(e.payload,'$.condition') ORDER BY e.seq DESC,e.received_at DESC) rank
 FROM study_events e JOIN eligible s ON s.id=e.session_id
 WHERE json_extract(e.payload,'$.mode')='study' AND json_extract(e.payload,'$.type')='rating'
 AND json_extract(e.payload,'$.personaId') IN ('p01','p02','p03','p04','p05')
 AND json_extract(e.payload,'$.condition') IN ('without_skill','with_skill')
 AND json_extract(e.payload,'$.score') IN (1,2,3,4,5)
), ratings AS (SELECT * FROM ranked WHERE rank=1)`;
export async function handle(request:Request,env:Env){
 if(!env.ADMIN_ACCESS_CODE||!env.SESSION_SECRET)return Response.json({error:'请先配置 ADMIN_ACCESS_CODE'},{status:503});
 if(env.ADMIN_ACCESS_CODE===env.STUDY_ACCESS_CODE)return Response.json({error:'管理员口令必须与参与者口令不同'},{status:503});
 const secret=env.SESSION_SECRET+':research-admin-v1';const url=new URL(request.url);
 if(url.pathname==='/api/admin/login'&&request.method==='POST')return login(request,{...env,SESSION_SECRET:secret,STUDY_ACCESS_CODE:env.ADMIN_ACCESS_CODE},3600);
 if(!await verify(request.headers.get('Authorization')?.replace(/^Bearer /,'')||'',secret))return Response.json({error:'请使用管理员口令登录',code:'ADMIN_AUTH_REQUIRED'},{status:401});
 if(request.method!=='GET')return Response.json({error:'Method not allowed'},{status:405});
 if(url.pathname==='/api/admin/summary'){
 const [counts,groups]=await env.DB.batch([
 env.DB.prepare(base+` SELECT (SELECT COUNT(DISTINCT owner) FROM eligible) participants,
 (SELECT COUNT(*) FROM eligible) sessions,(SELECT COUNT(*) FROM ratings) ratings,
 (SELECT COUNT(DISTINCT s.owner) FROM eligible s JOIN ratings r ON r.session_id=s.id) ratedParticipants,
 (SELECT COUNT(*) FROM (SELECT session_id FROM ratings GROUP BY session_id HAVING COUNT(*)=10)) completedSessions,
 (SELECT COUNT(DISTINCT owner) FROM eligible WHERE id IN (SELECT session_id FROM ratings GROUP BY session_id HAVING COUNT(*)=10)) completedParticipants`),
 env.DB.prepare(base+` SELECT persona_id,condition,COUNT(*) n,AVG(score) mean FROM ratings GROUP BY persona_id,condition`)]);
 let names:Record<string,string>={};try{names=Object.fromEntries((await metadata(env)).map(p=>[String(p.id),String(p.name)]))}catch{}
 return Response.json({counts:counts.results[0],groups:groups.results,names,updatedAt:new Date().toISOString()});
 }
 if(url.pathname==='/api/admin/sessions'){
 const page=Math.max(1,Math.min(100000,Number(url.searchParams.get('page'))||1));
 const search=(url.searchParams.get('search')||'').trim();if(!/^[a-z0-9-]{0,36}$/i.test(search))return Response.json({error:'请输入匿名参与者或会话 ID'},{status:400});
 const filter=' WHERE (s.owner LIKE ? OR s.id LIKE ?)';const pattern='%'+search+'%';
 const [total,rows]=await env.DB.batch([
 env.DB.prepare(base+' SELECT COUNT(*) total FROM eligible s'+filter).bind(pattern,pattern),
 env.DB.prepare(base+` SELECT s.id,s.owner,s.created_at,
 (SELECT MAX(received_at) FROM study_events e WHERE e.session_id=s.id) last_activity,
 (SELECT json_group_array(json_object('personaId',r.persona_id,'condition',r.condition,'score',r.score,'note',r.note,'turns',r.turns,'receivedAt',r.received_at)) FROM ratings r WHERE r.session_id=s.id) ratings
 FROM eligible s`+filter+' ORDER BY last_activity DESC,s.id LIMIT 25 OFFSET ?').bind(pattern,pattern,(Math.floor(page)-1)*25)]);
 return Response.json({page:Math.floor(page),pageSize:25,total:(total.results[0] as any).total,sessions:rows.results.map((r:any)=>({...r,ratings:JSON.parse(r.ratings||'[]')}))});
 }
 return Response.json({error:'Not found'},{status:404});
}
