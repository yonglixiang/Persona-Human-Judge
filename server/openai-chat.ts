import type {Env} from './types.ts';
import {settings} from './settings.ts';
export type HistoryTurn={user_text:string;assistant_text:string};
export function responseBody(env:Env,condition:string,history:HistoryTurn[],text:string,personaSkill:string){
 const cfg=settings(env);if(!['without_skill','with_skill'].includes(condition))throw Error('Invalid condition');
 if(condition==='with_skill'&&!personaSkill.trim())throw Error('Missing skill');
 return {model:cfg.model,reasoning:{effort:cfg.effort},store:false,max_output_tokens:cfg.maxOutput,instructions:'Respond naturally to the user in their language. Be concise and conversational.'+(condition==='with_skill'?'\n\n'+personaSkill:''),input:[...history.flatMap(t=>[{role:'user',content:t.user_text},{role:'assistant',content:t.assistant_text}]),{role:'user',content:text}]};
}
export function outputText(response:any){if(response.status!=='completed')throw Error('回复未完整生成，请重试');const text=(response.output??[]).filter((x:any)=>x.type==='message').flatMap((x:any)=>x.content??[]).filter((x:any)=>x.type==='output_text'||x.type==='refusal').map((x:any)=>x.type==='refusal'?x.refusal:x.text).join('\n').trim();if(!text)throw Error('模型未返回可显示的回复，请重试');return text;}
