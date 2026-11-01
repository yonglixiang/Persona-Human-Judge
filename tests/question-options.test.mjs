import {test} from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
function fixture(){const input={value:'',disabled:false,focus(){this.focused=true}},send={disabled:true},button={textContent:'A natural question?'};const nodes={'#input':input,'#send':send,'#app':{innerHTML:''}};const context=vm.createContext({navigator:{language:"zh-CN"},crypto,localStorage:{getItem(){return null},setItem(){}},window:{addEventListener(){}},document:{documentElement:{},querySelector:s=>nodes[s]??null,querySelectorAll:s=>s==='.question-choice'?[button]:[]}});for(const file of ['i18n.js','markdown.js','views.js'])vm.runInContext(readFileSync(new URL('../web/'+file,import.meta.url),'utf8'),context);vm.runInContext(source.slice(0,source.indexOf("document.querySelectorAll('[data-view]')")),context);vm.runInContext(readFileSync(new URL('./sample-translations.js',import.meta.url),'utf8'),context);vm.runInContext(readFileSync(new URL('./persona-fixture.js',import.meta.url),'utf8').replace('let personas=','personas='),context);return {context,input,send,button};}
test('both conditions show the same three choices, disabled while waiting',()=>{const {context}=fixture();const a=vm.runInContext('questionOptions(personas[0])',context);const b=vm.runInContext('state.group=1;questionOptions(personas[0])',context);assert.equal(a,b);assert.equal((a.match(/class="question-choice"/g)||[]).length,3);assert.match(vm.runInContext('pending=true;questionOptions(personas[0])',context),/disabled/);});
test('click fills editable composer and never sends or consumes a turn',()=>{const {context,input,send,button}=fixture();vm.runInContext('bind()',context);button.onclick();assert.equal(input.value,button.textContent);assert.equal(send.disabled,false);assert.equal(input.focused,true);assert.equal(vm.runInContext('rounds()',context),0);assert.equal(vm.runInContext('state.queue.length',context),0);input.value='user revision';input.disabled=true;button.onclick();assert.equal(input.value,'user revision');});
test('all English screens and sample questions render without untranslated Chinese UI',()=>{const {context}=fixture();vm.runInContext("uiLanguage='en'",context);for(const expr of ['intro(localizedPersona(personas[0]))','chat(localizedPersona(personas[0]))','rating(localizedPersona(personas[0]))','done()'])assert.doesNotMatch(vm.runInContext(expr,context),/[\u3400-\u9fff]/,expr);assert.equal(vm.runInContext("localizedPersona(personas[0]).suggested_questions.length",context),3);});
test('language changes never rewrite transcript or scores; events record UI language',()=>{const {context}=fixture();vm.runInContext("session().messages.push({role:'user',text:'保留 original text'});session().rating=4;uiLanguage='en'",context);assert.match(vm.runInContext('transcript()',context),/保留 original text/);assert.equal(vm.runInContext('session().rating',context),4);vm.runInContext("event('rating',{score:4,note:''})",context);assert.equal(vm.runInContext('state.queue[0].uiLanguage',context),'en');vm.runInContext("uiLanguage='zh'",context);assert.match(vm.runInContext('transcript()',context),/保留 original text/);});

test('switching language preserves an unsent draft and current trial',()=>{const {context,input}=fixture();input.value='Unsent draft 保留';vm.runInContext("state.stage='chat';state.group=1;switchLanguage('en')",context);assert.equal(input.value,'Unsent draft 保留');assert.equal(vm.runInContext('state.group',context),1);assert.equal(vm.runInContext('state.stage',context),'chat');assert.equal(vm.runInContext('document.documentElement.lang',context),'en');});

test('persona navigation preserves drafts, messages and ratings and resumes the correct group',()=>{
 const {context,input}=fixture();vm.runInContext("change=stage=>{state.stage=stage;save()};state.stage='chat';session().started=true;session().messages.push({role:'user',text:'Keep this'});session().rating=3",context);
 input.value='Unsent draft';vm.runInContext('switchPersona(4)',context);
 assert.equal(vm.runInContext('state.index',context),4);assert.equal(vm.runInContext('state.stage',context),'intro');
 vm.runInContext('switchPersona(0)',context);
 assert.equal(vm.runInContext('state.stage',context),'chat');assert.equal(vm.runInContext('session().draft',context),'Unsent draft');assert.equal(vm.runInContext('session().messages[0].text',context),'Keep this');assert.equal(vm.runInContext('session().rating',context),3);
 vm.runInContext('state.sessions[0].acknowledged=true;switchPersona(0)',context);assert.equal(vm.runInContext('state.group',context),1);
});
test('finishing persona five first continues remaining personas; completion requires all ten',()=>{
 const {context}=fixture();vm.runInContext("change=stage=>state.stage=stage;state.index=4;state.group=1;state.sessions[8].acknowledged=true;state.sessions[9].acknowledged=true;advanceAfterRating()",context);
 assert.equal(vm.runInContext('state.index',context),0);assert.notEqual(vm.runInContext('state.stage',context),'done');
 vm.runInContext('state.sessions.forEach(s=>s.acknowledged=true);advanceAfterRating()',context);assert.equal(vm.runInContext('state.stage',context),'done');
});

test('unloaded personas render loading and sign-in states without sample profiles',()=>{
 const {context}=fixture();vm.runInContext('personas=[];render()',context);
 let html=vm.runInContext("document.querySelector('#app').innerHTML",context);
 assert.match(html,/persona info loading/);assert.doesNotMatch(html,/data-persona|class="profile"|林知夏/);
 vm.runInContext("config={loading:false,ready:false,authRequired:true,error:'请先输入研究访问口令'};render()",context);
 html=vm.runInContext("document.querySelector('#app').innerHTML",context);assert.match(html,/id="signIn"/);
 vm.runInContext("config.authRequired=false;render()",context);assert.match(vm.runInContext("document.querySelector('#app').innerHTML",context),/id="checkModel"/);
});
