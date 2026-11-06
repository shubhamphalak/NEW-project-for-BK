import {adviceFailure} from './errors.mjs';
import {retrieve} from './knowledge.mjs';
import {scenario,executeTool,upgrade} from './calculations.mjs';
import {validateProfile,applyUpdates} from './profile.mjs';
import {compactContext,remember} from './context.mjs';
import {routeQuery,mockUpdates,quickActions} from './routing.mjs';
import {modelResponse,outputJSON,ProviderError} from './openai.mjs';
import {instructions,finalSchema,toolDefinitions} from './prompts.mjs';
import {translate} from '../src/i18n.js';
import {nextStep} from '../src/catalogue.js';
const pair=(en,ar)=>({en,ar});
const toolStatus={retrieve_products:'reviewing',recommend_plans:'matching',calculate_premium:'calculating',calculate_coverage:'analysing',update_profile:'analysing',compare_plans:'comparing',coverage_upgrade:'calculating',market_analysis:'market',customer_insights:'insights'};
function compact(value){if(value?.scenario)return {profile:value.profile,scenario:compact(value.scenario)};if(value?.matches)return {profile:value.provided,assumptions:value.assumptions,budgetComparison:value.budgetComparison,matches:value.matches.map(m=>({id:m.product.id,monthly:m.normalized,annual:m.normalized*12,coverage:value.profile.coverage,term:value.profile.term,paymentTerm:m.paymentTerm,projectedSavings:m.projected})),constraints:value.rejected.map(r=>({id:r.product.id,reasons:r.issues})),needs:value.needs,source:value.source,categoryAvailable:value.categoryAvailable};return value;}
function validateFinal(result,facts){if(!result?.reply||typeof result.reply.en!=='string'||typeof result.reply.ar!=='string'||!['reply','plans','comparison','premium','coverage','upgrade','details','market'].includes(result.layout))throw new ProviderError('invalid_response');const allowed=new Set(facts.matches.map(m=>m.product.id));return {reply:{en:result.reply.en.slice(0,2200),ar:result.reply.ar.slice(0,2200)},layout:result.layout,actions:(result.actions||[]).filter(a=>['compare','calculator','coverage','benefits','exclusions','market'].includes(a)).slice(0,3),planReasons:(result.planReasons||[]).filter(r=>allowed.has(r.id)&&typeof r.reason?.en==='string'&&typeof r.reason?.ar==='string').slice(0,3)};}
async function mockAdvice(query,session,stage,config,emit){
 const updates=mockUpdates(query,session.profile,session.discoveryField||stage);if(session.discoveryField==='monthlyIncome'&&/^[0-9٠-٩]+$/.test(query.trim()))updates.push({field:'monthlyIncome',value:Number(query.replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c)))});if(updates.length){emit('analysing');session.profile=applyUpdates(session.profile,updates);}
 const p=session.profile;let type=routeQuery(query);if(p.annualIncome&&updates.some(u=>['dependants','existingCover'].includes(u.field)))type='coverage';let layout=({comparison:'comparison',market:'market',upgrade:'upgrade',coverage:'coverage',premium:'premium',details:'details',plans:'plans'})[type]||'plans',reply;
 if(p.category&&p.category!=='life'){layout='reply';reply=pair('The connected catalogue contains life protection planning information. Health, motor and travel terms and rates are not available. I can explain insurance basics, or help you explore the available life plans.','تحتوي قاعدة المعرفة على معلومات تخطيط الحماية على الحياة والادخار. لا تتوفر شروط أو أسعار الصحة والمركبات والسفر. يمكنني شرح الأساسيات أو مساعدتك في خطط الحياة المتاحة.');}
 else if(/what is takaful|ما هو التكافل/i.test(query)){layout='reply';reply=pair(translate('en','faqTakaful'),translate('ar','faqTakaful'));}
 else if(/guarantee|مضمون/i.test(query)){layout='reply';reply=pair(translate('en','faqGuarantee'),translate('ar','faqGuarantee'));}
 else if(/claim|مطالبة/i.test(query)){layout='reply';reply=pair(translate('en','faqClaims'),translate('ar','faqClaims'));}
 else if(/cancel|إلغاء/i.test(query)){layout='reply';reply=pair(translate('en','faqCancel'),translate('ar','faqCancel'));}
 else if(type==='details'){reply=pair('The available benefits and limitations are shown below. ART-approved exclusions are not supplied, so I cannot confirm specific exclusions or riders.','تظهر المنافع والقيود المتاحة أدناه. لم تُرفق استثناءات معتمدة من تكافل الراجحي، لذلك لا يمكن تأكيد استثناءات أو إضافات محددة.');}
 else if(type==='market'){reply=pair('I’m comparing the available source data. No live competitor feed is connected; any comparison is limited to the available planning information or explicitly configured verified sources.','أقارن بيانات المصادر المتاحة. لا يوجد اتصال مباشر بمنافسين؛ تقتصر المقارنة على معلومات التخطيط المتاحة أو المصادر الموثقة التي تم إعدادها.');}
 else if(type==='upgrade'){reply=pair('Here is a calculated higher-cover scenario for the same plan. The cost difference is indicative; no additional rider or new policy benefit is implied. You can accept, dismiss, or choose a custom amount.','هذا سيناريو محسوب لتغطية أعلى في الخطة نفسها. فرق التكلفة استرشادي ولا يعني إضافة منفعة أو ملحق جديد. يمكنك القبول أو الرفض أو اختيار مبلغ آخر.');}
 else if(type==='coverage'&&p.annualIncome){reply=pair('I’ve annualised your income and calculated basic, recommended and enhanced income-replacement scenarios, accounting for any dependants and existing cover you shared. These planning estimates are capped by catalogue limits. Choose one or enter your own amount.','حوّلت دخلك إلى دخل سنوي وحسبت مستويات أساسية ومقترحة ومعززة لتعويض الدخل، مع مراعاة المعالين والتغطية الحالية التي ذكرتها. هذه تقديرات تخطيطية مقيدة بحدود المنتجات. اختر مستوى أو أدخل مبلغك.');}
 else if(type==='premium'){reply=pair('Your budget helps focus the comparison. We can explore a different cover amount, savings allocation or payment term while keeping your protection priorities in view.','تساعد ميزانيتك في تركيز المقارنة. يمكننا استكشاف مبلغ تغطية أو تخصيص ادخاري أو مدة دفع مختلفة مع مراعاة أولويات حمايتك.');}
 else if(type==='comparison'){reply=pair('Here is a comparison of the available protection planning approaches using the same scenario. Protection-only costs less; savings plans include an allocation whose projected value is not guaranteed.','هذه مقارنة للخطط الافتراضية المتاحة باستخدام السيناريو نفسه. الحماية فقط أقل تكلفة؛ وتتضمن خطط الادخار تخصيصاً بقيمة متوقعة غير مضمونة.');}
 else if(/weather|football|write a poem|طقس|كرة القدم/i.test(query)){layout='reply';reply=pair('I can help with insurance questions, coverage needs and indicative scenarios. What insurance topic would you like to explore?','أساعدك في أسئلة التأمين واحتياجات التغطية والسيناريوهات الاسترشادية. ما موضوع التأمين الذي تود استكشافه؟');}
 else {reply=pair('We can shape protection around what matters to you. Tell me the benefit you would like to explore, and we can compare the trade-offs.','يمكننا بناء الحماية حول ما يهمك. أخبرني بالمنفعة التي تود استكشافها لنقارن المفاضلات.');}
 if(['plans','conversation'].includes(type)&&layout!=='reply'&&(!p.category||p.category==='life')){
 let key=null,question=null;
 if(/recommend|eligible|eligibility|quote|خطة مناسبة|أهلية|عرض سعر/i.test(query)&&p.age===undefined){key='age';question=pair('How old are you? This helps tailor the protection guidance.','كم عمرك؟ يساعد ذلك في تخصيص إرشادات الحماية.');}
 else if(/budget|afford|cheap|ميزاني|أرخص/i.test(query)&&p.budget==null){key='budget';question=pair('What monthly amount would feel comfortable for you?','ما المبلغ الشهري الذي يناسبك؟');}
 else if(['education','combined'].includes(p.goal)&&p.term===undefined){key='term';question=pair('What future goal are you saving towards, and roughly when would you like to reach it?','ما الهدف المستقبلي الذي تدخر له، ومتى تقريباً تود تحقيقه؟');}
 else if(p.goal==='protect'&&!p.annualIncome&&/family|protect|income|عائل|أسرت|حماية|دخل/i.test(query)){key='monthlyIncome';question=pair('To explore how your family could replace your income, roughly what is your monthly income? You can skip this if you prefer.','لاستكشاف تعويض دخل العائلة، كم يبلغ دخلك الشهري تقريباً؟ يمكنك تجاوز هذا السؤال إن رغبت.');}
 else if(!p.goal){question=pair('What would you most like insurance to help you with?','ما الأمر الذي تود أن يساعدك التأمين فيه أكثر؟');}
 if(question){reply=question;layout='reply';session.discoveryField=key;}else delete session.discoveryField;
 }

 emit('reviewing');return {reply,layout,actions:quickActions(layout,p),planReasons:[]};
}
export async function advise(session,body,config,emit=()=>{},fetcher,externalSignal){
 if(typeof body.message!=='string'||!body.message.trim()||body.message.length>1000)throw Error('Invalid message');const query=body.message.trim();if(body.profile)session.profile=validateProfile(body.profile);const prior=structuredClone(session.profile);const stage=body.stage||'home';emit('understanding');
 if(routeQuery(query)==='login'&&session.authenticated)return {mode:config.mode,stage:'advisory',profile:session.profile,reply:pair('You are signed in. Your existing policy records are not connected yet. Tell me what cover you have, and I can help you identify questions or potential gaps to verify.','أنت مسجل الدخول. سجلات وثائقك الحالية غير متصلة بعد. أخبرني بتغطيتك لأساعدك في تحديد الأسئلة أو الفجوات التي تحتاج إلى تحقق.'),layout:'reply',actions:[]};
 if(routeQuery(query)==='login')return {mode:'local',stage:'login',profile:session.profile,reply:pair(translate('en','loginPrompt'),translate('ar','loginPrompt')),layout:'reply',actions:[],loginRequired:true};
 let answer,mode=config.mode,error=null;if(mode==='error'||mode==='live'&&!config.key)return adviceFailure('missing_key',session.profile,stage);
 if(mode==='live'){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),config.timeout);
  try{
   emit('reviewing');const route=routeQuery(query),fields=route==='details'?['limitations']:route==='plans'||route==='comparison'?['benefits','limitations','eligibility']:['eligibility'];
   const relevant=await retrieve({ids:session.profile.selectedProduct?[session.profile.selectedProduct]:[],category:session.profile.category||'life',fields});
   const context=compactContext(session,config);while(JSON.stringify(context).length>config.contextChars&&context.recentTurns.length)context.recentTurns.shift();
   const input=[{role:'user',content:JSON.stringify({context,relevant,question:query,uiStage:stage})}];let calls=0;const used=new Map();
   for(let round=0;round<config.maxRounds;round++){
    emit(round?'preparing':'understanding');const response=await modelResponse(config,{instructions,input,tools:toolDefinitions,text:{format:{type:'json_schema',name:'insurance_advice',strict:true,schema:finalSchema}}},externalSignal?AbortSignal.any([controller.signal,externalSignal]):controller.signal,fetcher);
    const functions=(response.output||[]).filter(o=>o.type==='function_call');if(!functions.length){answer=validateFinal(outputJSON(response),await scenario(session.profile));break;}
    input.push(...response.output);
    for(const call of functions){if(++calls>config.maxCalls)throw new ProviderError('tool_limit');let result;
     try{const args=JSON.parse(call.arguments),key=JSON.stringify([call.name,args,session.profile]);if(used.has(key))result=used.get(key);else{emit(toolStatus[call.name]||'reviewing');result=await executeTool(call.name,args,session,config);used.set(key,result);}}
     catch(e){result={error:'Tool input failed validation. Ask the user to clarify; no invalid update was saved.'};}
     input.push({type:'function_call_output',call_id:call.call_id,output:JSON.stringify(compact(result))});
    }
   }
   if(!answer)throw new ProviderError('tool_limit');
  }catch(e){session.profile=prior;return adviceFailure(e.code||'provider',prior,stage,e);}finally{clearTimeout(timer);}
 }else answer=await mockAdvice(query,session,stage,config,emit);
 emit('matching');const facts=await scenario(session.profile,prior),detail=answer.layout==='details'?await retrieve({category:session.profile.category||'life',ids:session.profile.selectedProduct?[session.profile.selectedProduct]:[]}):null;
 let market=null;if(answer.layout==='market'){emit('market');market=await executeTool('market_analysis',{},session,config);}let higher=null;if(answer.layout==='upgrade'||answer.layout==='plans'&&session.profile.coverage!=null)higher=await upgrade(session.profile);
 if(mode!=='live'&&['plans','comparison','premium'].includes(answer.layout)&&facts.budgetComparison?.options.length){const near=facts.budgetComparison;answer.reply=pair('Here are nearby planning options, using the same cover and term. These amounts are planning estimates, not insurer premiums.\n\n'+near.options.map((o,i)=>(i+1)+'. **'+o.name.en+(i===0?' · Recommended':'')+'** — SAR '+o.monthly+' per month'+(o.aboveBudget?' · optional, '+o.differencePercent+'% above your budget':'')).join('\n'),'هذه خيارات تخطيطية قريبة باستخدام التغطية والمدة نفسيهما. المبالغ تقديرات تخطيطية وليست أقساطاً من شركة التأمين.\n\n'+near.options.map((o,i)=>(i+1)+'. **'+o.name.ar+(i===0?' · موصى به':'')+'** — '+o.monthly+' ريال شهرياً'+(o.aboveBudget?' · اختياري، '+o.differencePercent+'٪ أعلى من ميزانيتك':'')).join('\n'));}
 emit('preparing');const guided=['age','budget','coverage','term','goal'].includes(stage)&&mode!=='live'&&Object.keys(session.profile).length>Object.keys(prior).length;
 const next=guided?nextStep(session.profile):'advisory';if(guided&&next!=='summary')answer.reply=pair(answer.reply.en+' '+translate('en',next+'Prompt'),answer.reply.ar+' '+translate('ar',next+'Prompt'));
 if(answer.planReasons?.length){const order=answer.planReasons.map(p=>p.id);facts.matches.sort((a,b)=>(order.includes(a.product.id)?order.indexOf(a.product.id):99)-(order.includes(b.product.id)?order.indexOf(b.product.id):99));}remember(session,query,answer.reply.en,{layout:answer.layout,recommendedIds:facts.matches.map(m=>m.product.id)},config);
 return {...answer,mode,error:error||config.reason,profile:session.profile,stage:next,facts,details:detail,upgrade:higher,market,contextSummary:session.summary};
}
