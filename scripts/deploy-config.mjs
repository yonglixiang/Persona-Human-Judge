import {mkdir,writeFile} from 'node:fs/promises';
const db=process.env.CLOUDFLARE_D1_DATABASE_ID;if(!db||!/[a-f0-9-]{36}/i.test(db))throw Error('Set CLOUDFLARE_D1_DATABASE_ID');
const origin=process.env.ALLOWED_ORIGIN||'https://yonglixiang.github.io';if(new URL(origin).origin!==origin)throw Error('ALLOWED_ORIGIN must be an origin, not a project path');
const vars={ALLOWED_ORIGIN:origin};
const name=process.env.WORKER_NAME||'persona-human-judge-api';const bucket=process.env.PERSONAS_BUCKET||'persona-human-judge-personas';
await mkdir('.deploy',{recursive:true});await writeFile('.deploy/wrangler.json',JSON.stringify({name,main:'../server/index.ts',compatibility_date:'2026-05-15',compatibility_flags:['nodejs_compat'],workers_dev:true,vars,d1_databases:[{binding:'DB',database_name:'persona-human-judge',database_id:db,migrations_dir:'../migrations'}],r2_buckets:[{binding:'PERSONAS',bucket_name:bucket}],ratelimits:[{name:'AUTH_LIMITER',namespace_id:'1001',simple:{limit:10,period:60}}]},null,2));
console.log('Deployment configuration generated. Secrets are not written to this file.');
