let personas=[];
const KEY='persona-study-github-v4';
const fresh=()=>({id:crypto.randomUUID(),index:0,group:0,stage:'intro',seq:0,queue:[],sessions:Array.from({length:10},()=>({messages:[],rating:null,note:'',submitted:false,acknowledged:false,started:false,ended:false,request:null,chatError:''})),completeQueued:false});
let state=fresh();try{const old=JSON.parse(localStorage.getItem(KEY));if(old&&old.sessions?.length===10&&old.id&&Array.isArray(old.queue))state=old}catch{}
let maxTurns=6;let config={ready:false,loading:true,error:'',authRequired:false};let selectedQuestionText=null;let submitting=false;let pending=false,run=0,storageOK=true,uploadBusy=false,uploadError='',uploadPromise=null;
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch{storageOK=false}};
const session=()=>state.sessions[state.index*2+state.group];
const rounds=()=>session().messages.filter(m=>m.role==='agent').length;
const condition=()=>state.group===0?'without_skill':'with_skill';
const groupLabel=()=>state.group===0?'A':'B';
function status(){const el=$('#uploadStatus');if(el)el.textContent=uploadBusy?tr('正在上传…'):uploadError?tr('上传失败：{error}（记录保留，可重试）',{error:errorText(uploadError)}):state.queue.length?tr('待上传 {n} 条记录',{n:state.queue.length}):tr('全部记录已上传');const b=$('#retryUpload');if(b)b.hidden=!state.queue.length||uploadBusy;}
function event(type,extra={}){state.queue.push({id:crypto.randomUUID(),sessionId:state.id,seq:++state.seq,protocol:'paired-fixed-v2',mode:'study',uiLanguage,personaId:personas[state.index].id,condition:condition(),type,at:new Date().toISOString(),...extra});save();status();return state.queue.at(-1).id;}
async function flush(){if(!state.queue.length)return true;if(uploadPromise)return uploadPromise;uploadPromise=(async()=>{uploadBusy=true;uploadError='';status();try{while(state.queue.length){const e=state.queue[0];const r=await apiFetch('/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(e),signal:AbortSignal.timeout(12000)});const body=await r.json();if(!r.ok||body.saved!==true||body.id!==e.id)throw Error(body.error||'服务器未确认保存');state.queue.shift();save();}return true;}catch(e){uploadError=e.message||'网络异常';return false;}finally{uploadBusy=false;uploadPromise=null;status();}})();return uploadPromise;}
window.addEventListener('online',()=>flush());
function change(stage){state.stage=stage;save();render();$('#main').focus({preventScroll:true});window.scrollTo({top:0});$('#viewport').scrollTop=0}
function rememberDraft(){const input=$('#input');if(input)session().draft=input.value;save();}
function resumePersona(index){
 state.index=index;state.group=state.sessions[index*2].acknowledged?1:0;
 const s=session();state.stage=s.ended||s.submitted?'rating':s.started?'chat':'intro';
}
function switchPersona(index){
 if(pending||submitting||!Number.isInteger(index)||index<0||index>=personas.length)return;
 rememberDraft();selectedQuestionText=null;resumePersona(index);change(state.stage);
}
function advanceAfterRating(){
 if(state.sessions.every(s=>s.acknowledged)){change('done');return;}
 if(state.group===0){state.group=1;const s=session();change(s.ended?'rating':s.started?'chat':'intro');return;}
 for(let offset=1;offset<=personas.length;offset++){const i=(state.index+offset)%personas.length;if(!state.sessions[i*2+1].acknowledged){resumePersona(i);change(state.stage);return;}}
}
function bind(){
 document.querySelectorAll('[data-persona]').forEach(b=>b.onclick=()=>switchPersona(Number(b.dataset.persona)));
 if($('#input'))$('#input').value=session().draft||'';

 document.querySelectorAll('.question-choice').forEach(button=>button.onclick=()=>{const input=$('#input');if(!input||input.disabled)return;input.value=button.textContent;selectedQuestionText=button.textContent;$('#send').disabled=false;input.focus();});
 if($('#signIn'))$('#signIn').onclick=async()=>{const code=$('#accessCode').value;$('#signIn').disabled=true;try{await signInStudy(code);await checkModel()}catch(e){config.error=e.message;render()}};
 if($('#checkModel'))$('#checkModel').onclick=()=>checkModel();if($('#retryChat'))$('#retryChat').onclick=()=>requestReply();
 if($('#retryUpload'))$('#retryUpload').onclick=()=>flush();
 if($('#start'))$('#start').onclick=()=>{if(!config.ready)return;if(!session().started){session().started=true;event('start');flush()}change('chat')};
 if($('#finish'))$('#finish').onclick=()=>{run++;pending=false;if(!session().ended){session().ended=true;event('end',{turns:rounds(),reason:rounds()===maxTurns?'limit':'early_stop',pendingCancelled:session().messages.at(-1)?.role==='user'});flush()}change('rating')};
 
 if($('#form')){$('#send').disabled=!$('#input').value.trim()||pending||!!session().request;$('#input').oninput=()=>{session().draft=$('#input').value;save();$('#send').disabled=!$('#input').value.trim()||pending};$('#input').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();send()}};$('#form').onsubmit=e=>{e.preventDefault();send()}};
 document.querySelectorAll('[data-score]').forEach(b=>b.onclick=()=>{if(session().submitted)return;session().rating=Number(b.dataset.score);save();document.querySelectorAll('[data-score]').forEach(x=>x.setAttribute('aria-pressed',x===b));$('#scoreHint').textContent=tr('已选择 {n} 分',{n:session().rating});$('#next').disabled=false});
 if($('#note'))$('#note').disabled=session().submitted; if(session().submitted)document.querySelectorAll('[data-score]').forEach(b=>b.disabled=true); if($('#note'))$('#note').oninput=()=>{session().note=$('#note').value;save()};
 if($('#next')&&submitting){$('#next').disabled=true;$('#next').textContent=tr('正在保存，请稍候…');}if($('#next'))$('#next').onclick=async()=>{if(!session().rating||submitting||session().acknowledged)return;submitting=true;$('#next').disabled=true;$('#next').textContent=tr('正在保存，请稍候…');if(!session().submitted){session().submitted=true;$('#note').disabled=true;document.querySelectorAll('[data-score]').forEach(b=>b.disabled=true);event('rating',{score:session().rating,note:session().note,turns:rounds()})}if(state.sessions.every(s=>s.submitted)&&!state.completeQueued){state.completeQueued=true;event('complete')};const ok=await flush();submitting=false;if(!ok){$('#next').disabled=false;$('#next').textContent=tr('重试保存并继续 →');return}session().acknowledged=true;save();advanceAfterRating()};
 if($('#export'))$('#export').onclick=async()=>{const r=await apiFetch('/api/events?sessionId='+encodeURIComponent(state.id));if(!r.ok){alert(tr('导出失败，请稍后重试'));return}const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(await r.json(),null,2)],{type:'application/json'}));a.download='persona-study-'+state.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
 if($('#reset'))$('#reset').onclick=()=>{state=fresh();save();change('intro')};
}
async function checkModel(){config.loading=true;render();try{const r=await apiFetch('/api/chat');const data=await r.json();config={...data,loading:false,authRequired:r.status===401,error:data.error||''};if(r.ok){maxTurns=data.maxTurns||6;if(data.ready){const pr=await apiFetch('/api/personas');const pd=await pr.json();if(!pr.ok)throw Error(pd.error||'人格资料读取失败');const escapeAll=x=>typeof x==='string'?esc(x):Array.isArray(x)?x.map(escapeAll):Object.fromEntries(Object.entries(x).map(([k,v])=>[k,k==='id'?v:escapeAll(v)]));personas=pd.personas.map(escapeAll);}}}catch(e){config={ready:false,loading:false,authRequired:false,error:e.message||'无法连接服务器，请重试。'}}render();}
function send(){const text=$('#input')?.value.trim();if(!text||pending||session().request||rounds()>=maxTurns||state.stage!=='chat'||!config.ready)return;const s=session();s.draft='';s.messages.push({role:'user',text});const eventId=event('user_message',{text,turn:rounds()+1,inputSource:selectedQuestionText===text?'suggested':'custom'});selectedQuestionText=null;s.request={eventId,sessionId:state.id,personaId:personas[state.index].id,condition:condition()};s.chatError='';save();requestReply();}
async function requestReply(){const target=session(),request=target.request;if(!request||pending)return;pending=true;target.chatError='';const thisRun=++run;render();$('#messages').scrollTop=99999;
 try{if(!await flush())throw Error('消息上传失败，请重试。');if(thisRun!==run)return;
 const r=await apiFetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(100000)});const data=await r.json();if(!r.ok||!data.text)throw Error(data.error||'模型回复失败，请重试');
 if(thisRun!==run||target.ended)return;
 target.messages.push({role:'agent',text:data.text,model:data.model,responseId:data.responseId});target.request=null;
 }catch(e){if(thisRun===run)target.chatError=e.message||'连接失败，请重试';}
 finally{save();if(thisRun===run){pending=false;render();if($('#messages'))$('#messages').scrollTop=99999;}}
}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{$('#viewport').classList.toggle('mobile',b.dataset.view==='mobile');document.querySelectorAll('[data-view]').forEach(x=>x.setAttribute('aria-pressed',x===b))});render();if(state.queue.length)flush();

checkModel();

document.querySelectorAll("[data-language]").forEach(b=>b.onclick=()=>switchLanguage(b.dataset.language));applyLanguage();
