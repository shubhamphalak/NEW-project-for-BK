import {initialState} from '../src/flow.js';

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let passed=0,failed=0;
const check=(ok,label)=>{const item=document.createElement('li');item.className=ok?'pass':'fail';item.textContent=(ok?'PASS: ':'FAIL: ')+label;document.querySelector('#checks').append(item);ok?passed++:failed++;};
const until=async fn=>{for(let i=0;i<500;i++){if(fn())return;await wait(30);}throw Error('Timed out');};

sessionStorage.removeItem('art-advisor-session');
sessionStorage.setItem('art-insurance-demo-v1',JSON.stringify({...initialState(),open:true,stage:'guest'}));
const frame=document.createElement('iframe');
frame.width=430;frame.height=900;document.body.append(frame);
const loaded=new Promise(resolve=>frame.onload=resolve);frame.src='../index.html';await loaded;
const doc=frame.contentDocument,win=frame.contentWindow,state=()=>win.artDemo.snapshot();
const click=selector=>{const target=doc.querySelector(selector);if(!target)throw Error('Missing '+selector);target.click();};

try{
  check(!!doc.querySelector('.premium-home')&&doc.querySelectorAll('.premium-home [data-journey]').length===2,'Home presents the two concise customer paths');
  check(/Himaya/.test(doc.querySelector('.chat-header')?.textContent||'')&&!/Guest|Ready/.test(doc.querySelector('.chat-heading')?.textContent||'')&&!doc.querySelector('.calculator-launch')&&doc.querySelectorAll('.chat-header .icon-button').length===3,'Single Himaya header keeps only language, reset and minimize controls');
  check(!!doc.querySelector('.chat-panel.agentic-shell')&&/Begin your insurance journey/i.test(doc.querySelector('.agent-commentary-empty')?.textContent||'')&&!doc.querySelector('.agent-run-card')&&!doc.querySelector('.agent-roster'),'Right activity panel presents a professional starting message');
  check(!doc.querySelector('[data-agent-nav=renew]')&&!doc.querySelector('[data-agent-nav=talk]'),'Renew Policy and Talk to us header actions are removed');

  click('[data-journey=new]');
  check(!!doc.querySelector('[data-new-path]')&&!!doc.querySelector('.agent-commentary-empty')&&!doc.querySelector('[data-agent-work]'),'New Customer navigation does not trigger an agent');
  click('[data-new-path=register]');
  await until(()=>!!doc.querySelector('#customer-profile-form'));
  check(!!doc.querySelector('.agent-commentary-empty')&&!doc.querySelector('[data-agent-work]'),'Create Account opens as setup without triggering an agent');
  const form=doc.querySelector('#customer-profile-form');
  const nationalIdUpload=form.querySelector('[data-national-id-upload]');
  check(!!nationalIdUpload&&!nationalIdUpload.required&&/pdf/.test(nationalIdUpload.accept),'Create ART account offers an optional National ID document upload');
  const idFiles=new win.DataTransfer();idFiles.items.add(new win.File(['id'],'national-id.pdf',{type:'application/pdf'}));nationalIdUpload.files=idFiles.files;nationalIdUpload.dispatchEvent(new win.Event('change',{bubbles:true}));check(/national-id.pdf/.test(form.querySelector('[data-national-id-status]')?.textContent||''),'Selected National ID document is acknowledged in the form');
  check(state().agentDocumentCheck?.status==='scanning'&&/OCR extraction/i.test(doc.querySelector('.document-agent-result')?.textContent||''),'Identity and Document Agent visibly reports document-reading activity');
  form.elements.identityNumber.value='34567';nationalIdUpload.dispatchEvent(new win.Event('change',{bubbles:true}));check(state().agentDocumentCheck?.status==='invalid'&&/not valid/i.test(doc.querySelector('.document-agent-result.invalid')?.textContent||''),'Document Agent flags an invalid National ID format in the live activity panel');
  const expected=['fullName','mobile','email','identityNumber','dateOfBirth','age','gender','monthlyIncome','occupation','city','dependants','existingCover','goal','budget','coverage','term'];
  check(expected.every(name=>!!form.elements[name]),'Create ART account captures the complete shared customer profile');
  check(!form.elements.goal.closest('.profile-section')&&!/Protection priorities/i.test(form.textContent),'Protection priorities section is removed from the customer form');
  check(/suitability and affordability/i.test(form.textContent)&&/not used to rank/i.test(form.textContent),'Profile explains how customer data affects AI guidance');

  const values={fullName:'Noura Al Saud',mobile:'0551234567',email:'noura@example.com',identityNumber:'1234567890',dateOfBirth:'1990-06-15',age:'55',gender:'female',monthlyIncome:'24000',occupation:'Finance Director',city:'Riyadh',dependants:'3',existingCover:'250000',goal:'protect',budget:'850',coverage:'1200000',term:'20'};
  for(const [name,value] of Object.entries(values))form.elements[name].value=value;
  check(!form.elements.age.hasAttribute('min')&&!form.elements.age.hasAttribute('max')&&!form.elements.age.required,'Customer profile age has no blocking or required validation');
  form.elements.consent.checked=true;
  form.dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));
  await until(()=>state().purchaseFlow?.stage==='recommendations');
  check(doc.querySelector('.agent-stage-row.running')?.textContent.includes('Recommendation')&&!doc.querySelector('.agent-handoff-route'),'Profile analysis starts with the Recommendation specialist without a handoff strip');
  check(state().registered===true&&state().profile.age===55&&state().profile.occupation==='Finance Director'&&state().profile.dependants===3,'DOB and a different editable age submit without blocking validation');
  const saved=JSON.stringify(state());
  check(!saved.includes('0551234567')&&!saved.includes('1234567890')&&/4567/.test(saved)&&/7890/.test(saved),'Mobile and identity are masked after submission');
  check(doc.querySelectorAll('.synthetic-plan-card').length===5,'AI shows a five-plan shortlist from the larger catalogue');
  check(/120 life policies/i.test(doc.querySelector('.personalized-recommendations')?.textContent||'')&&!/synthetic/i.test(doc.querySelector('.personalized-recommendations')?.textContent||''),'Shortlist states that 120 policies were assessed without internal data labels');
  check(!/synthetic/i.test(doc.querySelector('.personalized-recommendations')?.textContent||''),'Customer-facing recommendations contain no synthetic terminology');
  check(!/\bAI\b/i.test(doc.querySelector('.personalized-recommendations')?.textContent||''),'Customer-facing recommendations use Himaya terminology instead of AI');
  const himayaSummary=doc.querySelector('.himaya-summary-response');
  check(!doc.querySelector('.insight-grid')&&!doc.querySelector('.insight-card')&&/HIMAYA SUMMARY/i.test(himayaSummary?.textContent||'')&&/leading match/i.test(himayaSummary?.textContent||'')&&/Review the options below/i.test(himayaSummary?.textContent||''),'Recommendation replaces repeated insight cards with one concise Himaya summary before the options');
  check(/HIMAYA RECOMMENDATION/i.test(doc.querySelector('.synthetic-plan-card.recommended')?.textContent||'')&&/selections/i.test(doc.querySelector('.synthetic-plan-card.recommended')?.textContent||''),'Himaya recommendation card combines reasoning, price, cover and popularity');

  click('.synthetic-plan-card.recommended');
  await until(()=>!state().aiPending);
  check(state().purchaseFlow?.stage==='addons'&&doc.querySelectorAll('.benefit-card').length>=4,'Selecting a policy opens optional paid benefits without a redundant explanation screen');
  check(Number.isFinite(state().purchaseFlow?.syntheticPolicy?.premium)&&!doc.querySelector('.benefit-total')?.textContent.includes('NaN'),'Selected policy retains its ranked premium and coverage');
  const benefitBuilder=doc.querySelector('.benefit-builder'),criticalCard=doc.querySelector('[data-toggle-addon="critical-illness"]');
  click('[data-toggle-addon="critical-illness"]');
  check(doc.querySelector('.benefit-builder')===benefitBuilder&&criticalCard.classList.contains('selected')&&criticalCard.getAttribute('aria-pressed')==='true'&&!!criticalCard.querySelector('.benefit-check .icon'),'Add-on selection updates the checkbox in place without re-rendering or scrolling the journey');
  click('[data-toggle-addon="premium-waiver"]');
  check(state().purchaseFlow.addOns.length===2,'Customer can add two benefits before calculation');
  check(/80 SAR/.test(doc.querySelector('.benefit-total')?.textContent||''),'Benefit builder adds 45 SAR and 35 SAR to the monthly estimate');

  click('[data-addons-calculator]');
  await until(()=>!!doc.querySelector('#insurance-calculator'));
  const invalidCalculatorFields=[...doc.querySelectorAll('#insurance-calculator :invalid')].map(field=>`${field.dataset.calcInput||field.name||field.id}[${field.type||field.tagName}]=${field.value}:${field.validationMessage}`);
  if(invalidCalculatorFields.length)throw Error('Invalid calculator fields: '+invalidCalculatorFields.join(', '));
  await until(()=>doc.querySelector('[data-calculator-result]')?.dataset.status==='complete');
  check(!!doc.querySelector('.conversation > #insurance-calculator'),'Plan-aware calculator opens inside the chatbot');
  check([...doc.querySelectorAll('[data-calc-input=age]')].every(input=>!input.hasAttribute('min')&&!input.hasAttribute('max')&&!input.required),'Life calculator age has no blocking or required validation');
  check(doc.querySelector('.calculator-plan-context strong')?.textContent===state().purchaseFlow.syntheticPolicy.name&&/80 SAR/.test(doc.querySelector('.calculator-addon-summary')?.textContent||''),'Calculator carries the selected policy and benefit cost');
  const frequency=doc.querySelector('[data-calc-input=frequency]');frequency.value='quarterly';frequency.dispatchEvent(new win.Event('input',{bubbles:true}));
  await until(()=>doc.querySelector('[data-calculator-result]')?.dataset.status==='complete');
  check(/quarter/i.test(doc.querySelector('#insurance-calculator')?.textContent||''),'Editable calculator updates the chosen payment frequency');
  click('[data-calculator-submit]');
  await until(()=>state().purchaseFlow?.stage==='review');
  check(/Optional benefits/i.test(doc.querySelector('.personalized-review')?.textContent||'')&&/80 SAR/.test(doc.querySelector('.personalized-review')?.textContent||''),'Review separates base premium, benefits and total');

  click('[data-personalized-buy]');
  await until(()=>!!doc.querySelector('[data-confirm-purchase]'));
  check(!!doc.querySelector('.purchase-flow.final-review'),'Selected policy reaches final purchase review with captured account details');
  click('[data-confirm-purchase]');
  check(state().purchaseFlow?.stage==='payment-ready'&&/Next step: secure payment/i.test(doc.querySelector('.payment-ready')?.textContent||''),'Purchase journey ends with payment as the next step');
  check(doc.querySelector('.agent-stage-row.running')?.textContent.includes('Payment & Issuance'),'Agent orchestration advances to payment and issuance at the purchase handoff');
  click('[data-payment-demo]');
  check(state().purchaseFlow?.stage==='payment-demo'&&/without collecting card or bank details/i.test(doc.querySelector('.payment-demo')?.textContent||''),'Static payment handoff does not collect financial details');

  click('[data-main-journeys]');
  check(state().stage==='guest'&&state().purchaseFlow==null&&Object.keys(state().profile||{}).length===0&&!state().registered&&!state().authenticated&&!state().accountProfile&&!state().profileJourney&&!state().documentUploads&&!state().prepared&&state().messages.length===0,'Returning after payment starts a clean customer journey without old profile or form data');
  click('[data-journey=existing]');
  check(doc.querySelectorAll('[data-existing-path]').length===2&&!doc.querySelector('[data-existing-path=nearby]')&&!doc.querySelector('[data-agent-work]')&&!!doc.querySelector('.agent-commentary-empty'),'Existing Customer opens its options without triggering an agent');
  const originalFetch=win.fetch;
  win.fetch=(url,...args)=>String(url)==='/api/auth/login'?new Promise(resolve=>win.setTimeout(()=>resolve(new win.Response(JSON.stringify({contact:{name:'Faisal Al Harbi',email:'faisal@example.com'},customer:{policies:[]},profile:{age:38,coverage:900000,budget:650,dependants:3,term:20},reply:{en:'Signed in securely.',ar:'Signed in securely.'}}),{status:200,headers:{'Content-Type':'application/json'}})),120)):originalFetch.call(win,url,...args);

  click('[data-existing-path=new]');
  check(!!doc.querySelector('#login-form')&&!!doc.querySelector('.agent-commentary-empty')&&!doc.querySelector('[data-agent-work]')&&!doc.querySelector('.agent-run-card'),'Login opens without running or displaying an agent');
  let login=doc.querySelector('#login-form');login.elements.username.value='existing';login.elements.password.value='secure-password';login.dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));
  await until(()=>state().loginPending);check(!!doc.querySelector('.account-login-loader')&&/Getting your account details/i.test(doc.querySelector('.account-login-loader')?.textContent||'')&&!!doc.querySelector('.agent-commentary-empty')&&!doc.querySelector('[data-agent-work]'),'Login uses a neutral account-details loader instead of an agent GIF');
  await until(()=>!!doc.querySelector('#customer-profile-form'));
  check(state().profileJourney?.mode==='buy-new'&&!doc.querySelector('#customer-profile-form [name=currentPremium]'),'Existing Buy New Policy uses the shared profile without renewal-only fields');
  check(doc.querySelector('#customer-profile-form [name=occupation]')?.value&&doc.querySelector('#customer-profile-form [name=city]')?.value,'Existing account prefills occupation and city for AI ranking');

  click('[data-profile-back]');
  click('[data-existing-path=renew]');
  login=doc.querySelector('#login-form');login.elements.username.value='existing';login.elements.password.value='secure-password';login.dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));
  await until(()=>!!doc.querySelector('#customer-profile-form [name=currentPremium]'));
  const renewal=doc.querySelector('#customer-profile-form');
  check(state().profileJourney?.mode==='renew'&&!!renewal.elements.currentCoverage,'Renew Policy adds current premium and current coverage to the same profile');
  renewal.elements.currentPremium.value='520';renewal.elements.currentCoverage.value='300000';renewal.elements.consent.checked=true;
  renewal.dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));
  await until(()=>state().purchaseFlow?.stage==='recommendations');
  check(state().purchaseFlow.renewal===true&&/renewal|alternative/i.test(doc.querySelector('.recommendation-hero')?.textContent||''),'Renewal AI compares renewing against a stronger alternative');
  const mappedPolicy=doc.querySelector('.renewal-current-policy'),bestFitPolicy=doc.querySelector('.renewal-best-fit');
  check(/YOUR EXISTING POLICY/i.test(mappedPolicy?.textContent||'')&&/ART Family Secure Plus/.test(mappedPolicy?.textContent||'')&&/520 SAR/.test(mappedPolicy?.textContent||'')&&/300,000 SAR/.test(mappedPolicy?.textContent||''),'Renewal shows the existing policy first with premium and coverage');
  check(/HIMAYA RECOMMENDATION/i.test(bestFitPolicy?.textContent||'')&&/Estimated monthly premium/i.test(bestFitPolicy?.textContent||'')&&/Suggested coverage/i.test(bestFitPolicy?.textContent||'')&&bestFitPolicy.querySelectorAll('li').length===2,'Renewal shows the Himaya recommendation with clear reasons');
  check(doc.querySelector('.renewal-comparison-grid')?.firstElementChild===mappedPolicy,'Existing policy appears before the Himaya recommendation');
  const renewalSummary=doc.querySelector('.himaya-summary-response');
  check(!doc.querySelector('.insight-grid')&&/existing policy/i.test(renewalSummary?.textContent||'')&&/Himaya recommends/i.test(renewalSummary?.textContent||'')&&/renew or switch/i.test(renewalSummary?.textContent||''),'Renewal uses one concise comparison summary before the policy options');
  check(doc.querySelectorAll('.synthetic-plan-card').length===5,'Renewal ranks the same 120-policy catalogue into a five-plan shortlist');
  win.confirm=()=>true;click('[data-action=restart]');
  check(state().stage==='guest'&&!state().agentInteractionStarted&&!(state().agentRunHistory||[]).length&&/Begin your insurance journey/i.test(doc.querySelector('.agent-commentary-empty')?.textContent||'')&&!doc.querySelector('.agent-run-card'),'Reset chat also clears agent activity and restores the starting message');
  win.fetch=originalFetch;
}catch(error){check(false,error.stack||error.message);}

document.querySelector('#status').textContent=passed+' passed; '+failed+' failed';
document.body.dataset.result=failed?'failed':'passed';
