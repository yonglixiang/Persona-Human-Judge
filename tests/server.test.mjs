import {test} from 'node:test';import assert from 'node:assert/strict';
import {issue,verify} from '../server/auth.ts';import {settings} from '../server/settings.ts';import {responseBody,outputText} from '../server/openai-chat.ts';import worker from '../server/index.ts';
const secret='test-only-secret-01234567890123456789';
const cfg={OPENAI_MODEL:'model-fixture',REASONING_EFFORT:'medium',MAX_TURNS:'4',MAX_OUTPUT_TOKENS:'4096'};
test('signed participant token rejects forgery and wrong secret',async()=>{const t=await issue(secret);assert.ok(await verify(t,secret));assert.equal(await verify(t,secret+'x'),null);assert.equal(await verify(t+'x',secret),null);});
test('server config validates bounds and requires private model setting',()=>{assert.equal(settings(cfg).maxTurns,4);assert.throws(()=>settings({...cfg,MAX_TURNS:'0'}));assert.throws(()=>settings({...cfg,OPENAI_MODEL:''}));});
test('control has no persona skill; settings identical across groups',()=>{const a=responseBody(cfg,'without_skill',[],'hello','private fixture');const b=responseBody(cfg,'with_skill',[],'hello','private fixture');assert.ok(!a.instructions.includes('private fixture'));assert.ok(b.instructions.includes('private fixture'));assert.deepEqual({...a,instructions:''},{...b,instructions:''});assert.equal(a.model,cfg.OPENAI_MODEL);assert.equal(a.store,false);});
test('visible responses only; rejects incomplete response',()=>{assert.equal(outputText({status:'completed',output:[{type:'reasoning',summary:'hidden'},{type:'message',content:[{type:'output_text',text:'hello'}]}]}),'hello');assert.throws(()=>outputText({status:'incomplete'}));});
test('forged Sites identity headers do not authenticate the standalone Worker',async()=>{const r=await worker.fetch(new Request('https://backend.test/api/events?sessionId=x',{headers:{'oai-authenticated-user-id':'attacker',Origin:'https://allowed.test'}}),{SESSION_SECRET:secret,ALLOWED_ORIGIN:'https://allowed.test'});assert.equal(r.status,401);});
test('cross-origin request rejected; allowed preflight succeeds',async()=>{const env={ALLOWED_ORIGIN:'https://allowed.test'};assert.equal((await worker.fetch(new Request('https://backend.test/api/session',{method:'POST',headers:{Origin:'https://evil.test'}}),env)).status,403);const r=await worker.fetch(new Request('https://backend.test/api/chat',{method:'OPTIONS',headers:{Origin:env.ALLOWED_ORIGIN}}),env);assert.equal(r.status,204);assert.equal(r.headers.get('Access-Control-Allow-Origin'),env.ALLOWED_ORIGIN);});

test('persona API returns three fixed questions but never raw private fields',async()=>{
 const {metadata}=await import('../server/personas.ts');const item={name:'Fixture',en:'',role:'Role',age:'',city:'',bio:'Bio',values:'Values',interests:'Interests',voice:'Voice',quote:'',tags:[],suggested_questions:['Question one?','Question two?','Question three?'],private_notes:'do not expose',skill:'do not expose'};
 const env={PERSONAS:{get:async key=>({json:async()=>key==='manifest.json'?{ids:['p01','p02','p03','p04','p05']}:item})}};
 const result=await metadata(env);assert.equal(result.length,5);assert.deepEqual(result[0].suggested_questions,item.suggested_questions);assert.ok(!('skill' in result[0]));assert.ok(!('private_notes' in result[0]));
 item.suggested_questions=['duplicate','duplicate','third'];await assert.rejects(()=>metadata(env));
});
test('translated metadata is whitelisted and translations require both locales',async()=>{
 const {metadata}=await import('../server/personas.ts');const fields={name:'Fixture',en:'',age:'',role:'Role',city:'',bio:'Bio',values:'Values',interests:'Interests',voice:'Voice',quote:'',tags:[],suggested_questions:['One?','Two?','Three?']};const item={...fields,translations:{zh:{...fields,skill:'private'},en:{...fields,secret:'private'}}};const env={PERSONAS:{get:async key=>({json:async()=>key==='manifest.json'?{ids:['p01','p02','p03','p04','p05']}:item})}};const result=await metadata(env);assert.ok(!('skill' in result[0].translations.zh));assert.ok(!('secret' in result[0].translations.en));delete item.translations.en;await assert.rejects(()=>metadata(env));
});

test('source metadata is preserved verbatim and questions remain supplemental',async()=>{
 const {metadata}=await import('../server/personas.ts');
 const keys=['persona','name','age','gender','race','born place','general experience','personality','occupation','education','big_five','language_style','character'];
 const source=Object.fromEntries(keys.map(k=>[k,`${k}: original text\nSecond paragraph.`]));
 const original=structuredClone(source);const questions={zh:['一？','二？','三？'],en:['One?','Two?','Three?']};
 const env={PERSONAS:{get:async key=>({json:async()=>key==='manifest.json'?{ids:['p01','p02','p03','p04','p05']}:key.endsWith('questions.json')?questions:source})}};
 const result=await metadata(env);
 assert.deepEqual(result[0].source_metadata,original);assert.deepEqual(source,original);
 assert.equal(result[0].role,source.occupation);assert.equal(result[0].city,'');
 assert.deepEqual(result[0].translations.en,{suggested_questions:questions.en});
 assert.ok(!('bio' in result[0]));
});

test('only group B receives explicit first-person role-play instructions and verbatim skill',()=>{
 const skill='Original skill\nKeep this content unchanged.';
 const a=responseBody(cfg,'without_skill',[],'Hello',skill),b=responseBody(cfg,'with_skill',[],'Hello',skill);
 assert.equal(a.instructions,'Respond naturally to the user in their language. Be concise and conversational.');
 assert.match(b.instructions,/Role-play as the persona/);assert.match(b.instructions,/first person/);assert.ok(b.instructions.endsWith(skill));
});
