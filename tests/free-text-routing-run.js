import {initialState} from '../src/flow.js';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));let passed=0,failed=0;
const check=(ok,label)=>{const item=document.createElement('li');item.className=ok?'pass':'fail';item.textContent=(ok?'PASS: ':'FAIL: ')+label;document.querySelector('#checks').append(item);ok?passed++:failed++;};
const until=async fn=>{for(let i=0;i<700;i++){if(fn())return;await wait(20);}throw Error('Timed out');};
sessionStorage.setItem('art-insurance-demo-v1',JSON.stringify({...initialState(),open:true,stage:'explore',customerType:'new',registered:false,exploreView:'home',messages:[{role:'bot',localized:{en:'Explore Insurance',ar:'Explore Insurance'}}]}));
const frame=document.createElement('iframe');frame.width=430;frame.height=900;document.body.append(frame);const loaded=new Promise(resolve=>frame.onload=resolve);frame.src='../index.html';await loaded;
const doc=frame.contentDocument,win=frame.contentWindow,state=()=>win.artDemo.snapshot();
try{
 const input=doc.querySelector('#chat-input'),started=win.performance.now();input.value='I want to buy motor insurance for my car';doc.querySelector('#message-form').dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));
 const activeDialogue=doc.querySelector('.agentic-dialogue');
 check(state().aiPending&&doc.querySelector('.agent-response-work[data-agent-work="5"]')&&doc.querySelector('.agent-stage-row.running')?.textContent.includes('Recommendation'),'A plan-search request starts with the Recommendation Agent on both sides');
 check(!doc.querySelector('.customer-journey-card')&&!doc.querySelector('.agentic-progress-track'),'Redundant User Journey and Dynamic Agent Orchestration summaries are removed');
 check(!doc.querySelector('.agent-handoff-route')&&!/LIVE HANDOFF/i.test(doc.querySelector('.agentic-sidebar')?.textContent||''),'Live Handoff strip is removed from the commentary');
 await wait(2400);check(doc.querySelector('.agent-response-work[data-agent-work="4"]')&&doc.querySelector('.agent-stage-row.running')?.textContent.includes('Underwriting & Pricing'),'Pricing Agent takes over on both sides for cover and premium assessment');
 await wait(2100);check(doc.querySelector('.agent-response-work[data-agent-work="5"]')&&doc.querySelector('.agent-stage-row.running')?.textContent.includes('Recommendation'),'Recommendation Agent returns to prepare the final ranked explanation');check(doc.querySelector('.agentic-dialogue')===activeDialogue,'Agent handoffs update in place without rebuilding the conversation screen');
 await until(()=>state().purchaseFlow?.stage==='options'&&!state().aiPending&&!doc.querySelector('.agent-response-work'));
 check(state().purchaseFlow?.category==='motor'&&win.performance.now()-started>=5000,'Motor cover options load after the synchronized 5–7 second multi-agent transition');
 check(/Done in \d+\.\d+s/.test(doc.querySelector('.agent-run-card.complete')?.textContent||'')&&[...doc.querySelectorAll('.agent-execution-timeline .agent-timeline-step')].every(step=>step.classList.contains('done')),'Completed commentary retains the duration and full execution trace');
 check(state().messages.some(message=>message.raw==='I want to buy motor insurance for my car'),'Original Motor prompt remains in the conversation');
 const options=[...doc.querySelectorAll('[data-reply-option]')];check(options.length===3&&options.some(option=>/Comprehensive/.test(option.textContent)),'Motor cover options are visible and clickable');
 options.find(option=>/Comprehensive/.test(option.textContent)).click();check(state().aiPending&&doc.querySelector('.agent-response-work[data-agent-work="5"]'),'A clickable result activates the Recommendation Agent with the same synchronized working visual');await until(()=>state().purchaseFlow?.stage==='selected'&&!state().aiPending);check(state().purchaseFlow?.stage==='selected','Selecting a typed-intent option continues the purchase journey after the agent run');const specialists=[...doc.querySelectorAll('.agent-stage-row')];check(specialists.filter(row=>row.classList.contains('complete')).length===2&&specialists.find(row=>/Advisor Agent/.test(row.textContent))?.classList.contains('waiting'),'Only specialists that actually participated are complete; unused agents remain on standby');
 check(!!doc.querySelector('[data-flow-calculator]'),'Selected Motor cover provides the in-chat calculator next step');
}catch(error){check(false,error.stack||error.message);}
document.querySelector('#status').textContent=passed+' passed; '+failed+' failed';document.body.dataset.result=failed?'failed':'passed';
