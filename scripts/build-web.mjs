import {mkdir,cp,writeFile,rm} from 'node:fs/promises';
const endpoint=process.env.API_BASE_URL||'';
if(endpoint){const url=new URL(endpoint);if(url.protocol!=='https:'&&url.hostname!=='127.0.0.1'&&url.hostname!=='localhost')throw Error('API_BASE_URL must use HTTPS');if(url.username||url.password||url.search||url.hash)throw Error('API_BASE_URL must not contain credentials or query data');}
await rm('site',{recursive:true,force:true});await mkdir('site',{recursive:true});await cp('web','site',{recursive:true});
await writeFile('site/config.js','window.STUDY_CONFIG='+JSON.stringify({apiBaseUrl:endpoint.replace(/\/$/,'')})+';\n');await writeFile('site/.nojekyll','');
console.log(endpoint?'Frontend built with configured API origin.':'Frontend built in setup mode (no backend configured).');
