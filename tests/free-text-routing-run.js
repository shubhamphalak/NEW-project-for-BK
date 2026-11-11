import {initialState} from '../src/flow.js';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));let passed=0,failed=0;
const check=(ok,label)=>{const item=document.createElement('li');item.className=ok?'pass':'fail';item.textContent=(ok?'PASS: ':'FAIL: ')+label;document.querySelector('#checks').append(item);ok?passed++:failed++;};
const until=async fn=>{for(let i=0;i<300;i++){if(fn())return;await wait(20);}throw Error('Timed out');};
sessionStorage.setItem('art-insurance-demo-v1',JSON.stringify({...initialState(),open:true,stage:'explore',customerType:'new',registered:false,exploreView:'home',messages:[{role:'bot',localized:{en:'Explore Insurance',ar:'Explore Insurance'}}]}));
const frame=document.createElement('iframe');frame.width=430;frame.height=900;document.body.append(frame);const loaded=new Promise(resolve=>frame.onload=resolve);frame.src='../index.html';await loaded;
const doc=frame.contentDocument,win=frame.contentWindow,state=()=>win.artDemo.snapshot();
try{
 const input=doc.querySelector('#chat-input');input.value='I want to buy motor insurance for my car';doc.querySelector('#message-form').dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));await until(()=>state().purchaseFlow?.stage==='options');
 check(state().purchaseFlow?.category==='motor'&&!state().aiPending,'Typed Motor purchase intent routes immediately to Motor cover options');
 check(state().messages.some(message=>message.raw==='I want to buy motor insurance for my car'),'Original Motor prompt remains in the conversation');
 const options=[...doc.querySelectorAll('[data-reply-option]')];check(options.length===3&&options.some(option=>/Comprehensive/.test(option.textContent)),'Motor cover options are visible and clickable');
 options.find(option=>/Comprehensive/.test(option.textContent)).click();check(state().purchaseFlow?.stage==='selected','Selecting a typed-intent option continues the purchase journey');
 check(!!doc.querySelector('[data-flow-calculator]'),'Selected Motor cover provides the in-chat calculator next step');
}catch(error){check(false,error.stack||error.message);}
document.querySelector('#status').textContent=passed+' passed; '+failed+' failed';document.body.dataset.result=failed?'failed':'passed';
