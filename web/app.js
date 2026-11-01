let personas=[
{id:'p01',name:'林知夏',en:'Zhixia Lin',role:'城市建筑师',age:'29 岁',city:'杭州',tags:['细致理性','关注日常','温和直接'],bio:'在一家小型建筑事务所工作，关注老城区改造与公共空间。习惯先观察，再提出建议。',values:'看重实用与长期价值，尊重不同人的生活方式。',interests:'周末散步、胶片摄影、独立书店。',voice:'表达有条理，喜欢用生活中的具体例子，不喜欢夸大其词。',quote:'好的空间，应该让普通的一天更舒服。'},
{id:'p02',name:'陈牧',en:'Mu Chen',role:'自然教育工作者',age:'34 岁',city:'成都',tags:['耐心','亲近自然','行动派'],bio:'为孩子们设计户外课程，曾长期参与社区自然观察活动。',values:'相信亲身体验比标准答案更重要。',interests:'徒步、观鸟、记录植物。',voice:'语气亲切，会用提问引导思考。',quote:'先走出去，答案往往就在路上。'},
{id:'p03',name:'许言',en:'Yan Xu',role:'独立游戏开发者',age:'26 岁',city:'上海',tags:['好奇','坦率','喜欢实验'],bio:'独立制作叙事游戏，喜欢研究互动如何改变故事。',values:'珍惜创作自由，也在意作品是否真正打动人。',interests:'解谜游戏、科幻小说、电子音乐。',voice:'简洁直接，偶尔幽默，愿意承认不确定。',quote:'有趣的选择，比完美的答案更吸引我。'},
{id:'p04',name:'周禾',en:'He Zhou',role:'社区烘焙店主',age:'38 岁',city:'苏州',tags:['热情','务实','重视关系'],bio:'经营一家街角面包店，熟悉许多邻居的口味与生活节奏。',values:'重视人与人之间的信任，愿意为品质花时间。',interests:'做面包、逛菜场、收集旧食谱。',voice:'自然亲切，常从日常经验出发。',quote:'认真做好的东西，大家能尝出来。'},
{id:'p05',name:'沈遥',en:'Yao Shen',role:'科学编辑',age:'31 岁',city:'北京',tags:['审慎','求知','清晰表达'],bio:'将复杂的科学研究转化为公众能理解的文章。',values:'尊重证据，区分事实与观点。',interests:'阅读、博物馆、长距离跑步。',voice:'表达准确克制，会说明判断的依据与边界。',quote:'把一件事说清楚，要先承认我们还不知道什么。'}
];
personas.forEach((p,i)=>p.suggested_questions=[["你会怎样改造一个不太好用的公共空间？", "如果美观和实用发生冲突，你会怎么选？", "空闲的一天，你喜欢怎么度过？"], ["你会怎样让孩子对户外活动感兴趣？", "一次活动没有按计划进行，你会怎么调整？", "最近有什么自然现象让你好奇？"], ["你会怎样设计一个让人记住的游戏选择？", "创意很好但实现很难，你会怎么取舍？", "卡在一个问题上时，你通常怎么换换思路？"], ["客人对面包不满意，你会怎么回应？", "忙碌的时候，你怎样保证出品质量？", "如果能空出一天，你最想做什么？"], ["你会怎样把一个复杂的科学问题讲清楚？", "有人把不确定的结论说得很肯定，你会怎么回应？", "遇到自己不熟悉的话题时，你通常从哪里开始？"]][i]);
personas.forEach((p,i)=>p.translations={en:SAMPLE_EN[i]});
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
function bind(){
 document.querySelectorAll('.question-choice').forEach(button=>button.onclick=()=>{const input=$('#input');if(!input||input.disabled)return;input.value=button.textContent;selectedQuestionText=button.textContent;$('#send').disabled=false;input.focus();});
 if($('#signIn'))$('#signIn').onclick=async()=>{const code=$('#accessCode').value;$('#signIn').disabled=true;try{await signInStudy(code);await checkModel()}catch(e){config.error=e.message;render()}};
 if($('#checkModel'))$('#checkModel').onclick=()=>checkModel();if($('#retryChat'))$('#retryChat').onclick=()=>requestReply();
 if($('#retryUpload'))$('#retryUpload').onclick=()=>flush();
 if($('#start'))$('#start').onclick=()=>{if(!config.ready)return;if(!session().started){session().started=true;event('start');flush()}change('chat')};
 if($('#finish'))$('#finish').onclick=()=>{run++;pending=false;if(!session().ended){session().ended=true;event('end',{turns:rounds(),reason:rounds()===maxTurns?'limit':'early_stop',pendingCancelled:session().messages.at(-1)?.role==='user'});flush()}change('rating')};
 
 if($('#form')){$('#input').oninput=()=>$('#send').disabled=!$('#input').value.trim()||pending;$('#input').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();send()}};$('#form').onsubmit=e=>{e.preventDefault();send()}};
 document.querySelectorAll('[data-score]').forEach(b=>b.onclick=()=>{if(session().submitted)return;session().rating=Number(b.dataset.score);save();document.querySelectorAll('[data-score]').forEach(x=>x.setAttribute('aria-pressed',x===b));$('#scoreHint').textContent=tr('已选择 {n} 分',{n:session().rating});$('#next').disabled=false});
 if($('#note'))$('#note').disabled=session().submitted; if(session().submitted)document.querySelectorAll('[data-score]').forEach(b=>b.disabled=true); if($('#note'))$('#note').oninput=()=>{session().note=$('#note').value;save()};
 if($('#next')&&submitting){$('#next').disabled=true;$('#next').textContent=tr('正在保存，请稍候…');}if($('#next'))$('#next').onclick=async()=>{if(!session().rating||submitting)return;submitting=true;$('#next').disabled=true;$('#next').textContent=tr('正在保存，请稍候…');if(!session().submitted){session().submitted=true;$('#note').disabled=true;document.querySelectorAll('[data-score]').forEach(b=>b.disabled=true);event('rating',{score:session().rating,note:session().note,turns:rounds()})}if(state.index===4&&state.group===1&&!state.completeQueued){state.completeQueued=true;event('complete')};const ok=await flush();submitting=false;if(!ok){$('#next').disabled=false;$('#next').textContent=tr('重试保存并继续 →');return}session().acknowledged=true;save();if(state.group===0){state.group=1;change('intro')}else if(state.index===4)change('done');else{state.index++;state.group=0;change('intro')}};
 if($('#export'))$('#export').onclick=async()=>{const r=await apiFetch('/api/events?sessionId='+encodeURIComponent(state.id));if(!r.ok){alert(tr('导出失败，请稍后重试'));return}const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(await r.json(),null,2)],{type:'application/json'}));a.download='persona-study-'+state.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
 if($('#reset'))$('#reset').onclick=()=>{state=fresh();save();change('intro')};
}
async function checkModel(){config.loading=true;try{const r=await apiFetch('/api/chat');const data=await r.json();config={...data,loading:false,authRequired:r.status===401,error:data.error||''};if(r.ok){maxTurns=data.maxTurns||6;if(data.ready){const pr=await apiFetch('/api/personas');const pd=await pr.json();if(!pr.ok)throw Error(pd.error||'人格资料读取失败');const escapeAll=x=>typeof x==='string'?esc(x):Array.isArray(x)?x.map(escapeAll):Object.fromEntries(Object.entries(x).map(([k,v])=>[k,k==='id'?v:escapeAll(v)]));personas=pd.personas.map(escapeAll);}}}catch(e){config={ready:false,loading:false,authRequired:false,error:e.message||'无法连接服务器，请重试。'}}render();}
function send(){const text=$('#input')?.value.trim();if(!text||pending||session().request||rounds()>=maxTurns||state.stage!=='chat'||!config.ready)return;const s=session();s.messages.push({role:'user',text});const eventId=event('user_message',{text,turn:rounds()+1,inputSource:selectedQuestionText===text?'suggested':'custom'});selectedQuestionText=null;s.request={eventId,sessionId:state.id,personaId:personas[state.index].id,condition:condition()};s.chatError='';save();requestReply();}
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
