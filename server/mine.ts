import type {Env} from './types.ts';
import {base} from './admin.ts';
export async function GET(request:Request,env:Env){
 const owner=request.headers.get('oai-authenticated-user-id');if(!owner)return Response.json({error:'请先登录'},{status:401});
 const page=Math.max(1,Math.min(100000,Math.floor(Number(new URL(request.url).searchParams.get('page'))||1)));
 const filter=' WHERE s.owner=? AND EXISTS (SELECT 1 FROM ratings r WHERE r.session_id=s.id)';
 const [total,rows]=await env.DB.batch([
 env.DB.prepare(base+' SELECT COUNT(*) total FROM eligible s'+filter).bind(owner),
 env.DB.prepare(base+` SELECT s.id,s.created_at,
 (SELECT json_group_array(json_object('personaId',r.persona_id,'condition',r.condition,'score',r.score,'note',r.note,'turns',r.turns,'receivedAt',r.received_at)) FROM ratings r WHERE r.session_id=s.id) ratings
 FROM eligible s`+filter+' ORDER BY s.created_at DESC,s.id LIMIT 25 OFFSET ?').bind(owner,(page-1)*25)]);
 return Response.json({page,pageSize:25,total:(total.results[0] as any).total,sessions:rows.results.map((r:any)=>({...r,ratings:JSON.parse(r.ratings||'[]')}))});
}
