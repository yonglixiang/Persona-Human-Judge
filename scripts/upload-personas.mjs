import {readFile,readdir} from 'node:fs/promises';import {resolve,join} from 'node:path';import {spawnSync} from 'node:child_process';
const root=resolve(process.argv[2]||'private-personas');const bucket=process.env.PERSONAS_BUCKET||'persona-human-judge-personas';const dry=process.argv.includes('--check');
const ids=['p01','p02','p03','p04','p05'];const manifest=JSON.parse(await readFile(join(root,'manifest.json'),'utf8'));if(JSON.stringify(manifest.ids)!==JSON.stringify(ids))throw Error('manifest.json must contain ids p01..p05 in order');
const files=[];
for(const id of ids){const dir=join(root,id);const names=await readdir(dir);if(names.some(x=>!['metadata.json','skill.md'].includes(x)))throw Error(`${id}: unexpected file; only metadata.json and skill.md are permitted`);
 const m=JSON.parse(await readFile(join(dir,'metadata.json'),'utf8'));for(const k of ['name','en','age','role','city','bio','values','interests','voice','quote'])if(typeof m[k]!=='string'||m[k].length>5000)throw Error(`${id}: invalid ${k}`);if(!Array.isArray(m.tags)||m.tags.length>10||m.tags.some(x=>typeof x!=='string'||x.length>100))throw Error(`${id}: invalid tags`);
 const permitted=['id','name','en','age','role','city','bio','values','interests','voice','quote','tags'];if(Object.keys(m).some(k=>!permitted.includes(k)))throw Error(`${id}: metadata contains extra fields; move private data out of participant metadata`);
 const skill=await readFile(join(dir,'skill.md'),'utf8');if(!skill.trim()||Buffer.byteLength(skill)>200000)throw Error(`${id}: invalid skill`);
 if(/sk-(?:proj-)?[A-Za-z0-9_-]{20,}/.test(skill+JSON.stringify(m)))throw Error(`${id}: possible API secret; remove before upload`);
 files.push(`${id}/metadata.json`,`${id}/skill.md`);
}
files.push('manifest.json');console.log('Validated five personas. Metadata will be shown to participants; skills stay private.');
if(!dry)for(const file of files){const r=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','r2','object','put',`${bucket}/${file}`,'--file',join(root,file),'--remote'],{stdio:'inherit'});if(r.status!==0)process.exit(r.status??1);}
