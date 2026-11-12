import {installInsuranceCalculator,installCalculatorChatRequests} from './insurance-calculator.js';
﻿import {formatReply} from './reply-format.js';
import {installAdvice} from './advisory.js';
import {installExperience} from './experience.js';
import {installPersonalizedJourneys,installPersonalizedChatRouting,applyHimayaTerminology} from './personalized-journeys.js';
import {installAgenticWorkspace} from './agentic-workspace.js';
import {advance,initialState} from './flow.js';
import {match,effective,defaults} from './catalogue.js';
import {translate,money} from './i18n.js';
import {icon,escapeHTML as esc} from './icons.js';
const storageKey='art-insurance-demo-v1';
const documentExtensions=/\.(pdf|png|jpe?g|docx?)$/i;
const documentSize=bytes=>bytes>=1048576?`${(bytes/1048576).toFixed(bytes>=10485760?0:1)} MB`:`${Math.max(1,Math.ceil(bytes/1024))} KB`;
const textPlaceholder=lang=>lang==='ar'?'اسأل أي شيء......':'Ask anything......';
export class Chat {
 constructor(host,onLanguage){
  this.host=host;this.onLanguage=onLanguage;this.state=initialState();this.pendingAttachment=null;this.attachmentError=null;
  try{const saved=JSON.parse(sessionStorage.getItem(storageKey));if(saved?.experienceVersion===4&&saved?.profile&&['en','ar'].includes(saved.lang))this.state={...this.state,...saved,searching:false};}catch{}
  this.host.addEventListener('click',e=>this.click(e));
  this.host.addEventListener('submit',e=>this.submit(e));
  this.host.addEventListener('change',e=>this.change(e));
  this.host.addEventListener('input',e=>{if(e.target.matches('[data-field]')&&this.state.stage==='results')this.updateScenario(e.target);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&this.state.open&&!document.querySelector('dialog[open]'))this.toggle(false);if(e.key==='Tab'&&this.state.open&&innerWidth<=600)this.trapFocus(e);});
  this.initializeAdvice();
  this.render();
 }
 t=(key,params)=>translate(this.state.lang,key,params);
 persist(){try{sessionStorage.setItem(storageKey,JSON.stringify({...this.state,searching:false}));}catch{}}
 setLang(lang){this.state.lang=lang;this.persist();this.render();this.onLanguage(lang);}
 toggle(open=true){this.state.open=open;this.render();this.persist();setTimeout(()=>this.host.querySelector(open?'#chat-input':'#chat-launcher')?.focus(),50);}
 dispatch(action){this.state=advance(this.state,action);this.persist();this.render();}
 begin(preset){this.state.open=true;if(this.state.stage==='guest')this.dispatch({type:'guest'});if(preset)this.dispatch({type:'preset',value:preset});else this.render();this.persist();}
 trapFocus(e){const nodes=[...this.host.querySelectorAll('.chat-panel button,.chat-panel input,.chat-panel select,.chat-panel a')].filter(n=>!n.disabled&&n.getClientRects().length);if(!nodes.length)return;const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
 async click(e){
  const b=e.target.closest('[data-action]');if(!b||b.disabled)return;
  const a=b.dataset.action,v=b.dataset.value;
  if(a==='open')return this.toggle();if(a==='minimize')return this.toggle(false);if(a==='lang')return this.setLang(v);
  if(a==='attach-document')return this.host.querySelector('#document-upload-input')?.click();if(a==='remove-document'){this.pendingAttachment=null;this.attachmentError=null;this.render();return;}
  if(a==='restart'){if(confirm(this.t('restartConfirm'))){const lang=this.state.lang;this.state={...initialState(),lang,open:true};this.pendingAttachment=null;this.attachmentError=null;this.render();this.persist();}return;}
  if(a==='value')return this.dispatch({type:'value',value:v==='null'?null:+v});
  if(a==='goal'||a==='preset'||a==='handoff')return this.dispatch({type:a,value:v});
  if(a==='compare'){const ids=this.state.compared;this.state.compared=ids.includes(v)?ids.filter(id=>id!==v):[...ids,v].slice(0,3);this.persist();this.render();return;}
  if(a==='showCompare')return this.showCompare();
  if(a==='edit'){this.dispatch({type:'edit'});return;}
  if(a==='match'){const form=this.host.querySelector('#scenario-form');if(!form.reportValidity())return;this.readEditor(form);return this.search();}
  this.dispatch({type:a});
 }
 submit(e){e.preventDefault();if(e.target.id==='message-form'){const input=e.target.elements.message;const text=input.value.trim();if(!text)return;this.dispatch({type:'text',value:text});this.host.querySelector('#chat-input')?.focus();}
  if(e.target.id==='login-form')return;
 }
 change(e){if(e.target.id==='document-upload-input'){const file=e.target.files?.[0];if(!file)return;this.attachmentError=file.size>10485760?'documentTooLarge':!documentExtensions.test(file.name)?'documentUnsupported':null;this.pendingAttachment=this.attachmentError?null:{name:file.name,size:file.size,type:file.type||'document'};this.render();requestAnimationFrame(()=>this.host.querySelector('#chat-input')?.focus({preventScroll:true}));return;}if(e.target.matches('[data-field]')&&this.state.stage==='results')this.updateScenario(e.target);}
 readEditor(form){for(const el of form.querySelectorAll('[data-field]'))this.state.profile[el.dataset.field]=['frequency','goal'].includes(el.dataset.field)?el.value:+el.value;this.persist();}
 updateScenario(input){if(!input.validity.valid)return;const key=input.dataset.field,old=effective(this.state.profile)[key],value=['frequency','goal'].includes(key)?input.value:+input.value;if(old===value)return;
  this.state.profile[key]=value;this.state.changed=[{key,old,value}];
  if(key==='term'&&this.state.profile.paymentTerm>value){const previous=this.state.profile.paymentTerm;this.state.profile.paymentTerm=value;this.state.changed.push({key:'paymentTerm',old:previous,value});const pay=this.host.querySelector('[data-field=paymentTerm]');if(pay)pay.value=value;}
  const pay=this.host.querySelector('[data-field=paymentTerm]');if(pay)pay.max=effective(this.state.profile).term;
  const ids=match(this.state.profile).matches.map(m=>m.product.id);this.state.compared=this.state.compared.filter(id=>ids.includes(id));
  this.host.querySelector('#results').innerHTML=this.resultCards();this.persist();
 }
 async search(){if(this.state.searching)return;this.state.searching=true;this.render();await new Promise(r=>setTimeout(r,550));if(!this.state.searching)return;const status=this.host.querySelector('#match-status');if(status)status.textContent=this.t('comparing');await new Promise(r=>setTimeout(r,650));this.state.searching=false;this.state.changed=[];this.dispatch({type:'match'});}
 button(action,key,value='',cls='chip'){return `<button class="${cls}" data-action="${action}" ${value!==''?`data-value="${esc(value)}"`:''}>${this.t(key)}</button>`;}
 choices(){const t=this.t,s=this.state;
  if(s.searching)return `<div class="matching" role="status"><span class="typing"><i></i><i></i><i></i></span><span id="match-status">${t('checking')}</span></div>`;
  if(s.stage==='guest')return `<div class="guest-card"><div class="guest-art">${icon('shield')}<span class="little-spark">${icon('spark')}</span></div><span class="eyebrow">${t('life')}</span><h2>${t('guestTitle').replace('\n','<br>')}</h2><p>${t('guestText')}</p><div class="language-pills" aria-label="${t('language')}">${this.button('lang','English','en',`lang-option ${s.lang==='en'?'active':''}`)}${this.button('lang','العربية','ar',`lang-option ${s.lang==='ar'?'active':''}`)}</div>${this.button('guest','guest','','btn primary full')}<small>${icon('lock')}${t('guestNote')}</small></div>`;
  const home=`<div class="choice-list">${this.button('explore','explore')}${this.button('question','question')}${this.button('existing','existing')}</div>`;
  if(s.stage==='home')return home+this.examples();
  if(s.stage==='question')return `<div class="chips">${this.button('explore','explore')}</div>`;
  if(s.stage==='login')return '';
  if(s.stage==='products')return `<div class="choice-list">${this.button('life','life')}${['motor','health','travel'].map(k=>`<button class="chip disabled" disabled>${t(k)} <small>${t('coming')}</small></button>`).join('')}</div>`;
  if(s.stage==='goal')return `<div class="choice-list">${['protect','education','combined','decide'].map(k=>this.button('goal',k,k)).join('')}</div>`;
  if(['age','budget','coverage','term'].includes(s.stage)){
   const values={age:[25,35,45,55],budget:[250,500,1000],coverage:[100000,300000,500000],term:s.profile.goal==='education'?[10,15,20]:[10,20,30]}[s.stage];
   return `<div class="chips">${values.map(v=>`<button class="chip" data-action="value" data-value="${v}">${s.stage==='budget'?t('upTo')+' ':''}${['budget','coverage'].includes(s.stage)?t('sar')+' ':''}${money(v,s.lang)}${s.stage==='term'?' '+t('years'):''}</button>`).join('')}${['budget','coverage'].includes(s.stage)?this.button('value','unsure','null'):''}</div>`;
  }
  if(s.stage==='summary')return this.editor()+this.button('match','find','','btn primary full');
  if(s.stage==='results')return `<div class="results-heading"><span class="eyebrow">${t('illustrative')}</span><h3>${t('scenario')}</h3><p>${t('scenarioText')}</p></div>${this.editor()}<div id="results">${this.resultCards()}</div>`;
  return home;
 }
 examples(){return `<div class="examples"><span>${this.t('examples')}</span>${['budget','coverage','education'].map(k=>`<button data-action="preset" data-value="${k}">${icon(k==='education'?'book':k==='coverage'?'shield':'sliders')}<span>${this.t(k+'Path')}</span>${icon('arrow')}</button>`).join('')}</div>`;}
 editor(){const p=effective(this.state.profile),t=this.t;const field=(key,min,max,step=1)=>`<label>${t(key)}${this.state.profile[key]===null?` <small>${t('assumed')}</small>`:''}<div class="input-wrap"><input data-field="${key}" name="${key}" aria-label="${t(key)}" type="number" min="${min}" max="${max}" step="${step}" value="${p[key]}" required><span>${['budget','coverage'].includes(key)?t('sar'):key==='age'?'':t('years')}</span></div></label>`;
  return `<form id="scenario-form" class="scenario-editor"><label class="span2">${t('goal')}<select data-field="goal" aria-label="${t('goal')}">${['protect','education','combined','decide'].map(k=>`<option value="${k}" ${p.goal===k?'selected':''}>${t(k)}</option>`).join('')}</select></label>${field('age',18,75)}${field('budget',1,100000,1)}<div class="span2">${field('coverage',10000,5000000,1000)}</div>${field('term',5,40)}${field('paymentTerm',5,p.term)}<label class="span2">${t('frequency')}<select data-field="frequency" aria-label="${t('frequency')}">${['monthly','quarterly','annual'].map(k=>`<option value="${k}" ${p.frequency===k?'selected':''}>${t(k)}</option>`).join('')}</select></label><small class="span2 editor-note">${t(this.state.stage==='summary'?'summaryNote':'paymentNote')}</small></form>`;
 }
 resultCards(){const {matches,rejected,profile:p}=this.scenarioData(),t=this.t,lang=this.state.lang;const currency=n=>`${t('sar')} ${money(n,lang)}`;
  const changes=this.state.changed.length?`<div class="changes" role="status">${icon('check')}<span><strong>${t('updated')}</strong>${this.state.changed.map(c=>`<br>${t(c.key)}: ${['frequency','goal'].includes(c.key)?t(c.old):money(c.old,lang)} → ${['frequency','goal'].includes(c.key)?t(c.value):money(c.value,lang)}`).join('')}</span></div>`:'';
  if(!matches.length)return `${changes}<div class="no-match" role="status">${icon('info')}<h3>${t('noMatch')}</h3><p>${t('noMatchText')}</p>${rejected.map(({product,issues})=>`<div class="constraint"><strong>${t(product.name)}</strong><ul>${issues.map(issue=>`<li>${t(issue)}</li>`).join('')}</ul></div>`).join('')}${this.button('edit','edit','','btn secondary full')}</div>`;
  return `${changes}<div class="match-count">${icon('check')} ${matches.length} ${t('matched')}<span>${t('illustrative')}</span></div><div class="plan-list">${matches.map((m,i)=>{const product=m.product,selected=this.state.compared.includes(product.id),fit=product.kind==='protect'?'whyProtect':product.kind==='education'?'whyEducation':'whyCombined';return `<article class="plan-card ${i===0?'recommended':''}" data-plan="${product.id}">${i===0?`<div class="recommend">${icon('spark')}${t(product.kind===p.goal||p.goal==='decide'?'recommend':'whyAlternative')}</div>`:''}<div class="plan-head"><div><small>${t('demoProduct')}</small><h3>${t(product.name)}</h3></div><span class="plan-icon">${icon(product.kind==='education'?'book':'shield')}</span></div><p class="fit"><strong>${t('fit')}:</strong> ${t(fit)}</p><div class="price"><strong>${currency(m.contribution)}</strong><span>${t(p.frequency==='annual'?'perYear':p.frequency==='quarterly'?'perQuarter':'perMonth')}</span><small>${t('estimated')} · ${t('illustrative')}</small></div>${p.frequency!=='monthly'?`<p class="equivalent">${t('paymentMonthlyEquivalent')}: ${currency(m.normalized)}</p>`:''}<dl class="plan-details"><div><dt>${t('sumAssured')}</dt><dd>${currency(p.coverage)}</dd></div><div><dt>${t('term')}</dt><dd>${p.term} ${t('years')}</dd></div><div><dt>${t('paymentTerm')}</dt><dd>${m.paymentTerm} ${t('years')}</dd></div></dl>${this.planFacts(m)}${m.projected?`<div class="projection"><small>${t('projection')} · ${t('illustrative')}</small><strong>${currency(m.projected)}</strong><span>${t('saved')}: ${currency(m.savingsPaid)}</span><p>${t('notGuaranteed')}</p></div>`:`<p class="no-savings">${t('noSavings')}</p>`}<details><summary>${t('conditions')}</summary><p>${t('ages')}: ${product.minAge}–${product.maxAge}. ${t('term')}: ${product.minTerm}–${product.maxTerm} ${t('years')}. ${t('coverage')}: ${currency(product.minCover)}–${currency(product.maxCover)}. ${t('maturity')} ${t(product.flexPay?'flexPay':'fixedPay')} ${t('conditionText')}</p></details><button class="compare-check ${selected?'checked':''}" aria-pressed="${selected}" data-action="compare" data-value="${product.id}"><span>${selected?icon('check'):''}</span>${t('compare')}</button></article>`;}).join('')}</div><div class="result-actions"><button class="btn secondary full" data-action="showCompare" ${this.state.compared.length<2?'disabled':''}>${t('compareTitle')} (${this.state.compared.length}/3)</button><small>${t('compareHint')}</small>${this.button('handoff','quote','quote','btn primary full')}${this.button('handoff','advisor','advisor','btn text full')}</div>`;
 }
 showCompare(){const t=this.t,p=effective(this.state.profile),items=this.scenarioData().matches.filter(m=>this.state.compared.includes(m.product.id));if(items.length<2)return;
  const dialog=document.querySelector('#comparison');const rows=[['sumAssured',()=>`${t('sar')} ${money(p.coverage,this.state.lang)}`],['estimated',m=>`${t('sar')} ${money(m.contribution,this.state.lang)} ${t(p.frequency)}`],['term',()=>`${p.term} ${t('years')}`],['paymentTerm',m=>`${m.paymentTerm} ${t('years')}`],['projection',m=>m.projected?`${t('sar')} ${money(m.projected,this.state.lang)} · ${t('notGuaranteed')}`:t('noSavings')],['fit',m=>t(m.product.kind==='protect'?'whyProtect':m.product.kind==='education'?'whyEducation':'whyCombined')],['conditions',m=>`${t('ages')}: ${m.product.minAge}–${m.product.maxAge}; ${t('term')}: ${m.product.minTerm}–${m.product.maxTerm}. ${t('maturity')} ${t('conditionText')}`]];
  dialog.dir=this.state.lang==='ar'?'rtl':'ltr';dialog.innerHTML=`<div class="dialog-heading"><div><span class="eyebrow">${t('illustrative')}</span><h2 id="compare-title">${t('compareTitle')}</h2></div><button class="icon-button" aria-label="${t('close')}" id="close-comparison">${icon('close')}</button></div><div class="table-scroll"><table><thead><tr><th>${t('life')}</th>${items.map(m=>`<th scope="col">${t(m.product.name)}</th>`).join('')}</tr></thead><tbody>${rows.map(([k,fn])=>`<tr><th scope="row">${t(k)}</th>${items.map(m=>`<td>${fn(m)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><small>${t('chatDisclaimer')}</small>`;dialog.showModal();dialog.querySelector('#close-comparison').onclick=()=>dialog.close();
 }
 renderDocumentComposer(disabled){const form=this.host.querySelector('#message-form');if(!form)return;const send=form.querySelector('button');send.type='submit';send.classList.add('composer-send');send.insertAdjacentHTML('beforebegin',`<input id="document-upload-input" class="document-upload-input" type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" hidden><button type="button" class="document-upload-trigger" data-action="attach-document" aria-label="${esc(this.t('attachDocument'))}" title="${esc(this.t('attachDocument'))}" ${disabled?'disabled':''}>${icon('paperclip')}</button>`);const notice=this.pendingAttachment?`<div class="composer-document" role="status"><span class="composer-document-icon">${icon('file')}</span><span><strong>${esc(this.pendingAttachment.name)}</strong><small>${esc(this.t('documentReady'))} · ${documentSize(this.pendingAttachment.size)}</small></span><button type="button" data-action="remove-document" aria-label="${esc(this.t('removeDocument'))}">${icon('close')}</button></div>`:this.attachmentError?`<div class="composer-document composer-document-error" role="alert"><span class="composer-document-icon">${icon('info')}</span><span><strong>${esc(this.t(this.attachmentError))}</strong><small>${esc(this.t('documentTypes'))}</small></span><button type="button" data-action="remove-document" aria-label="${esc(this.t('removeDocument'))}">${icon('close')}</button></div>`:'';if(notice)form.insertAdjacentHTML('afterbegin',notice);}
 renderDocumentMessages(){const rows=[...this.host.querySelectorAll('.messages .message')];this.state.messages.forEach((message,index)=>{if(!message.attachment)return;const bubble=rows[index]?.querySelector(':scope > div');if(!bubble)return;if(!message.attachment.caption)bubble.replaceChildren();bubble.insertAdjacentHTML('afterbegin',`<div class="document-message"><span>${icon('file')}</span><span><strong>${esc(message.attachment.name)}</strong><small>${documentSize(message.attachment.size)}</small></span>${icon('check')}</div>`);});}
 commitDocumentMessage(form){if(!this.pendingAttachment)return false;const text=form.elements.message.value.trim(),attachment={...this.pendingAttachment,caption:!!text};this.state.messages.push({role:'user',raw:text||this.t('documentReady'),attachment});this.state.messages.push({role:'bot',origin:'document-demo',localized:{en:translate('en','documentReceived'),ar:translate('ar','documentReceived')}});this.pendingAttachment=null;this.attachmentError=null;this.persist();this.render();this.host.querySelector('#chat-input')?.focus({preventScroll:true});return true;}
 render(){const t=this.t,s=this.state;document.body.classList.toggle('chat-mobile-open',s.open&&innerWidth<=600);
  const composerDisabled=['guest','login','register'].includes(s.stage)||s.searching||s.aiPending||s.startingGuest;
  this.host.innerHTML=`${!s.open?`<div class="chat-teaser"><span>${t('chatTeaser')}</span><button data-action="open">${t('teaserCta')} ${icon('arrow')}</button></div>`:''}<button id="chat-launcher" class="chat-launcher ${s.open?'launcher-hidden':''}" data-action="open" aria-label="${t('startChat')}" aria-expanded="${s.open}" aria-controls="chat-panel">${icon('chat')}<span class="launcher-dot"></span></button>${s.open?`<section id="chat-panel" class="chat-panel" role="dialog" aria-modal="${innerWidth<=600}" aria-label="${t('assistant')}" dir="${s.lang==='ar'?'rtl':'ltr'}"><header class="chat-header"><div class="assistant-avatar">${icon('agent')}</div><div class="chat-heading"><strong>${t('assistant')}</strong><small><i></i>${t('online')}</small></div><button class="icon-button language-toggle" data-action="lang" data-value="${s.lang==='en'?'ar':'en'}" aria-label="${t('language')}">${s.lang==='en'?'ع':'EN'}</button><button class="icon-button" data-action="restart" aria-label="${t('newChat')}">${icon('refresh')}</button><button class="icon-button" data-action="minimize" aria-label="${t('minimize')}">${icon('minus')}</button></header><div class="chat-status-anchor"></div><div class="conversation" id="conversation" tabindex="-1"><div class="messages" role="log" aria-live="polite" aria-relevant="additions">${s.messages.map((m,index)=>`<div class="message ${m.role} ${index===s.messages.length-1?'message-latest':''}"><span class="conversation-avatar ${m.role==='bot'?'agent-avatar':'user-avatar'}" aria-label="${m.role==='bot'?t('assistant'):'You'}">${icon(m.role==='bot'?'agent':'user')}</span><div>${m.role==='bot'?`<div class="reply-author"><span class="reply-author-mark">${icon('spark')}</span><span>${t('assistant')}</span></div>`:''}${m.role==='bot'?formatReply(m.localized?.[s.lang]||m.raw||t(m.key,m.params)):esc(m.localized?.[s.lang]||m.raw||t(m.key,m.params))}</div></div>`).join('')}</div><div class="chat-content">${this.choices()}</div></div><form class="message-form" id="message-form"><input id="chat-input" name="message" aria-label="${t('message')}" placeholder="${textPlaceholder(s.lang)}" autocomplete="off" maxlength="800" ${composerDisabled?'disabled':''}><button aria-label="${t('send')}" ${composerDisabled?'disabled':''}>${icon('send')}</button></form><div class="chat-brand">Al Rajhi Takaful</div></section>`:''}`;
  this.renderDocumentComposer(composerDisabled);this.renderDocumentMessages();const convo=this.host.querySelector('#conversation');if(convo){requestAnimationFrame(()=>{const messages=[...convo.querySelectorAll('.messages .message')],latest=messages.at(-1),latestBot=[...messages].reverse().find(message=>message.classList.contains('bot'));if(!s.aiPending&&latestBot){const offset=latestBot.getBoundingClientRect().top-convo.getBoundingClientRect().top,behavior=convo.style.scrollBehavior;convo.style.scrollBehavior='auto';convo.scrollTop=Math.max(0,convo.scrollTop+offset);convo.style.scrollBehavior=behavior;}else if(['results','summary'].includes(s.stage))latest?.scrollIntoView({block:'start'});else convo.scrollTop=convo.scrollHeight;});}
 }
}

installAdvice(Chat);

installExperience(Chat);

installPersonalizedJourneys(Chat);

installInsuranceCalculator(Chat);
installCalculatorChatRequests(Chat);
installPersonalizedChatRouting(Chat);
const himayaRender=Chat.prototype.render;
Chat.prototype.render=function(){himayaRender.call(this);applyHimayaTerminology(this.host);};
installAgenticWorkspace(Chat);
