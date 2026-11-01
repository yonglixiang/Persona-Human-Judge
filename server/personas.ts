import type {Env} from './types.ts';
export async function metadata(env:Env){
 const manifest=await env.PERSONAS.get('manifest.json');if(!manifest)throw Error('人格资料尚未上传');
 const data=await manifest.json<{ids:string[]}>();if(!Array.isArray(data.ids)||data.ids.join(',')!=='p01,p02,p03,p04,p05')throw Error('人格清单格式错误');
 return Promise.all(data.ids.map(async id=>{const object=await env.PERSONAS.get(`${id}/metadata.json`);if(!object)throw Error('人格资料不完整');const item=await object.json<Record<string,unknown>>();const out:Record<string,unknown>={id};
 for(const k of ['name','en','role','age','city','bio','values','interests','voice','quote']){if(typeof item[k]!=='string'||(item[k] as string).length>5000)throw Error('人格字段无效');out[k]=item[k]}
 if(!Array.isArray(item.tags)||item.tags.length>10||item.tags.some(x=>typeof x!=='string'||x.length>100))throw Error('人格标签无效');out.tags=item.tags;return out;}));
}
export async function skill(env:Env,id:string){if(!/^p0[1-5]$/.test(id))throw Error('Invalid persona');const obj=await env.PERSONAS.get(`${id}/skill.md`);if(!obj||obj.size>200000)throw Error('人格 skill 尚未配置或过大');const text=await obj.text();if(!text.trim())throw Error('人格 skill 为空');const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return {text,version:Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('')};}
