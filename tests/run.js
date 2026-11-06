import {catalogue,match,price,extract,defaults} from '../src/catalogue.js';
import {initialState,advance} from '../src/flow.js';
import {strings} from '../src/i18n.js';
const log=document.querySelector('#checks');let passed=0,failed=0;
function assert(condition,label){const li=document.createElement('li');li.textContent=(condition?'PASS: ':'FAIL: ')+label;li.className=condition?'pass':'fail';log.append(li);condition?passed++:failed++;if(!condition)console.error(label);}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<100;i++){if(fn())return;await wait(50);}throw Error('Timed out waiting for UI');}
let frame,doc,win;
async function fresh(width=1366,lang='en'){
 frame?.remove();sessionStorage.removeItem('art-insurance-demo-v1');sessionStorage.removeItem('art-advisor-session');if(lang==='ar')sessionStorage.setItem('art-insurance-demo-v1',JSON.stringify({...initialState(),lang}));
 frame=document.createElement('iframe');frame.width=width;frame.height=900;const loaded=new Promise(r=>frame.onload=r);frame.src='../index.html';document.body.append(frame);await loaded;doc=frame.contentDocument;win=frame.contentWindow;await until(()=>win.artDemo);await wait(30);
}
function click(sel){const el=doc.querySelector(sel);if(!el)throw Error('Missing control: '+sel);el.click();}
async function type(text){const input=doc.querySelector('#chat-input');input.value=text;doc.querySelector('#message-form').dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));await until(()=>!state().aiPending);await wait(30);}
async function change(key,value){const el=doc.querySelector(`[data-field="${key}"]`);el.value=value;el.dispatchEvent(new win.Event('input',{bubbles:true}));el.dispatchEvent(new win.Event('change',{bubbles:true}));await until(()=>!state().aiPending);await wait(30);}
function state(){return win.artDemo.snapshot();}
function action(a,v){click(`[data-action="${a}"]${v!==undefined?`[data-value="${v}"]`:''}`);}
async function results(){action('match');await until(()=>state().stage==='results'&&!state().aiPending&&state().serverScenario);await wait(30);}
try{
 const testConfig=await(await fetch('/api/config')).json();if(testConfig.mode!=='mock')throw Error('Browser verification requires MOCK_LLM_MODE=true; no test messages were sent.');
 assert(Object.keys(strings.en).every(k=>strings.ar[k]),'Every English content key has an Arabic translation');
 assert(Object.keys(strings.ar).every(k=>strings.en[k]),'Every Arabic content key has an English translation');
 const parsed=extract("I'm 35 and can pay up to SAR 500 a month",'home');assert(parsed.age===35&&parsed.budget===500,'English multi-detail typed input captures age and budget');
 const arabic=extract('عمري ٣٥ وأدفع حتى ٥٠٠ ريال في الشهر','home');assert(arabic.age===35&&arabic.budget===500,'Arabic input and Arabic numerals capture age and budget');
 assert(extract('I want SAR 500,000 of cover for 20 years.','home').coverage===500000,'Coverage-first typed sentence captures comma-separated cover');
 assert(extract('My child starts university in 15 years.','home').term===15,'Education typed sentence captures timeline');
 assert(extract('SAR 250–500','budget').budget===500,'Typed budget range captures the comfortable maximum');
 assert(advance(advance(initialState(),{type:'guest'}),{type:'text',value:'Ask a question'}).stage==='question','Typed Ask a question follows the button journey');
 assert(advance(advance(initialState(),{type:'guest'}),{type:'text',value:'Help me decide'}).profile.goal==='decide','Typed Help me decide starts guided plan discovery');
 assert(match(defaults).matches.length===3,'Default scenario matches three deterministic options');
 assert(match({...defaults,budget:25}).matches.length===0,'Low budget produces no matches');
 assert(match({...defaults,age:65}).rejected.every(r=>r.issues.includes('ageConstraint')),'Ineligible age produces explicit eligibility reasons');
 assert(match({...defaults,age:55,term:30}).matches.length===0,'Coverage cannot extend beyond age 75');
 const basic=price(catalogue[0],defaults),higher=price(catalogue[0],{...defaults,coverage:500000});assert(higher.monthly>basic.monthly,'More cover increases the illustrative contribution');
 assert(price(catalogue[1],{...defaults,paymentTerm:10}).monthly>price(catalogue[1],defaults).monthly,'Shorter savings payment term increases contributions');
 assert(price(catalogue[1],{...defaults,frequency:'annual'}).normalized<price(catalogue[1],defaults).normalized,'Annual frequency applies the fictional annual discount');
 let s=advance(initialState(),{type:'guest'});s=advance(s,{type:'text',value:'Get help with an existing policy'});assert(s.stage==='login'&&!s.authenticated,'Typed existing-policy request gates product choices behind demo login');
 s=advance(s,{type:'login'});assert(s.stage==='products'&&s.authenticated,'Successful demo login reaches product choices');
 await fresh();assert(doc.querySelectorAll('.product-card').length===4&&doc.querySelectorAll('.coming-badge').length===2,'Landing page contains four categories and two Coming soon badges');
 assert(doc.documentElement.scrollWidth<=win.innerWidth,'Desktop landing has no horizontal overflow');
 action('open');assert(!!doc.querySelector('.guest-card'),'Launcher opens guest onboarding');assert(doc.querySelector('.language-pills').textContent.includes('العربية'),'Arabic language selector is correctly encoded');action('guest');assert(doc.querySelector('.message').textContent.includes('Welcome to Al Rajhi Takaful.'),'Guest opens with requested welcome');
 action('explore');action('life');action('goal','combined');await type("I'm 35 and can pay up to SAR 500 a month");assert(state().stage==='coverage'&&state().profile.age===35&&state().profile.budget===500,'English UI captures multiple values and skips previously answered questions');
 action('value','300000');action('value','20');assert(state().stage==='summary','Button choices reach editable pre-search summary');
 action('lang','ar');assert(doc.querySelector('#chat-panel').dir==='rtl'&&state().profile.budget===500,'Language switch enables RTL and preserves current selections');action('lang','en');
 await results();assert(doc.querySelectorAll('.plan-card').length===3,'English journey returns three complete plan cards');
 const before=doc.querySelector('.price strong').textContent;await change('coverage',400000);assert(doc.querySelector('.price strong').textContent!==before&&!!doc.querySelector('.changes'),'Scenario recalculates immediately and reports what changed');await change('coverage',300000);
 await change('frequency','annual');assert(doc.querySelector('.price').textContent.includes('/ year'),'Annual payment frequency recalculates displayed contributions');await change('frequency','monthly');
 const oldProjection=doc.querySelector('.projection strong').textContent;await change('paymentTerm',10);assert(doc.querySelectorAll('.plan-card').length<3,'Shorter payment term updates affordability');await change('paymentTerm',20);assert(doc.querySelector('.projection strong').textContent===oldProjection,'Restoring payment term restores deterministic projection');
 action('compare','balance');action('compare','family');action('showCompare');assert(doc.querySelector('dialog').open&&doc.querySelectorAll('thead th').length===3,'Two selected options open side-by-side comparison');doc.querySelector('#close-comparison').click();
 action('minimize');assert(!doc.querySelector('#chat-panel'),'Chat minimizes');action('open');assert(state().profile.coverage===300000&&state().stage==='results','Chat reopens without losing conversation or selections');
 await change('budget',25);assert(!!doc.querySelector('.no-match')&&doc.querySelector('.no-match').textContent.includes('monthly budget'),'No-match view explains the budget constraint');await change('budget',500);assert(doc.querySelectorAll('.plan-card').length===3,'Editing the constraint recovers matching options');
 action('handoff','quote');assert(doc.querySelector('dialog').textContent.includes('Nothing is sent to ART'),'Quote handoff is explicitly a demo');doc.querySelector('[data-close-demo]').click();
 action('lang','ar');assert(doc.querySelector('.plan-card').textContent.includes('المساهمة التقديرية'),'Result cards and scenario controls translate to Arabic');assert(doc.querySelector('.conversation').scrollWidth<=doc.querySelector('.conversation').clientWidth,'Arabic desktop chat has no horizontal overflow');
 await fresh(390,'ar');assert(doc.documentElement.scrollWidth<=win.innerWidth,'Arabic mobile landing has no horizontal overflow');action('open');await wait(30);let panel=doc.querySelector('.chat-panel').getBoundingClientRect();assert(Math.abs(panel.width-390)<2&&Math.abs(panel.height-900)<2,'Mobile chatbot fills the viewport');
 action('guest');action('explore');action('life');action('goal','education');await type('عمري ٣٥ وأدفع حتى ٥٠٠ ريال في الشهر');action('value','null');await type('بعد ١٥ سنة');assert(state().stage==='summary'&&state().profile.term===15,'Arabic typed and button inputs complete education journey');await results();assert(doc.querySelector('.plan-head h3').textContent.includes('آفاق التعليم'),'Education goal ranks the education product first');assert(doc.querySelector('.projection').textContent.includes('غير مضمون'),'Arabic savings projection is explicitly not guaranteed');
 assert(doc.querySelector('.conversation').scrollWidth<=doc.querySelector('.conversation').clientWidth,'Arabic mobile plan cards fit without horizontal overflow');
 action('minimize');action('open');assert(state().profile.term===15,'Mobile minimize and reopen retains scenario');await type('المساعدة بشأن وثيقة حالية');assert(!!doc.querySelector('#login-form'),'Arabic typed existing-policy request opens demo login');
 const form=doc.querySelector('#login-form');form.elements.username.value='bad';form.elements.password.value='bad';form.dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));assert(form.querySelector('[role=alert]').textContent.length>0,'Incorrect demo credentials show a translated validation message');form.elements.username.value='guest.art';form.elements.password.value='ARTdemo2026';form.dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));assert(doc.querySelector('dialog').open&&!!doc.querySelector('[data-preset-login]'),'Correct demo credentials open fictional profile selection');doc.querySelector('[data-close-demo]').click();
 await fresh(390);action('open');action('guest');await type('What is takaful?');assert(doc.querySelector('.messages').textContent.includes('cooperative insurance'),'Typed insurance question receives a local FAQ answer');
 await type('I can contribute up to SAR 500 per month.');assert(state().profile.budget===500,'Budget-first typed path captures budget');
 await fresh();action('open');action('guest');action('preset','coverage');assert(state().profile.coverage===500000&&state().profile.term===20&&state().stage==='age','Coverage-first preset preserves amount and term');await type('35');action('value','500');await results();assert(doc.querySelectorAll('.plan-card').length===1,'Coverage-first path returns affordable protection option');
 await fresh();action('open');action('guest');action('preset','education');assert(state().profile.term===15&&state().profile.goal==='education','Education preset retains university timeline');await type('35');action('value','500');action('value','300000');await results();assert(doc.querySelector('.plan-card').dataset.plan==='education','Education preset completes successfully');
 await fresh();action('open');action('guest');action('preset','budget');await type('35');action('value','null');action('value','20');await results();assert(doc.querySelectorAll('.plan-card').length===3,'Budget-first path supports unsure coverage and completes successfully');
 await change('budget',25);action('edit');action('match');action('minimize');await wait(1500);action('open');assert(state().stage==='results','Matching finishes safely when the chat is minimized');
 await fresh(320);await doc.fonts.ready;assert(doc.documentElement.scrollWidth<=win.innerWidth,'English 320px mobile landing fits without horizontal overflow');action('open');assert(doc.querySelector('.chat-panel').getBoundingClientRect().width===320,'English 320px chat fills the viewport');
 await fresh(320,'ar');await doc.fonts.ready;assert(doc.documentElement.scrollWidth<=win.innerWidth,'Arabic 320px mobile landing fits without horizontal overflow');
}catch(error){assert(false,error.stack||error.message);}
document.querySelector('#status').textContent=`${passed} passed; ${failed} failed`;document.body.dataset.result=failed?'failed':'passed';document.title=`ART tests: ${passed} passed, ${failed} failed`;
