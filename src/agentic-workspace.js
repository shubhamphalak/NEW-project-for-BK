import {icon,escapeHTML as esc} from './icons.js';

const MINIMUM_AGENT_WORK_MS=6000;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const scheduleWorkspaceProgress=(chat,token)=>{
 const run=chat.agentWork,sequence=run?.agentSequence?.length?run.agentSequence:[run?.agentId].filter(Boolean),segment=MINIMUM_AGENT_WORK_MS/Math.max(1,sequence.length);
 sequence.slice(1).forEach((agentId,index)=>setTimeout(()=>{if(chat.agentWorkSequence!==token||chat.agentWork?.status!=='running')return;const current=chat.agentWork,next=workDefinition(chat,agentId,current.prompt),completed=[...(current.completedAgentIds||[]),current.agentId];chat.agentWork={...next,startedAt:current.startedAt,agentStartedAt:performance.now(),hiddenFrom:current.hiddenFrom,agentSequence:sequence,sequenceIndex:index+1,completedAgentIds:[...new Set(completed)],prompt:current.prompt,nonBlocking:current.nonBlocking};chat.state.agentPanelStage=agentId;paintAgentWork(chat);},Math.round(segment*(index+1))));
 for(let delay=750;delay<MINIMUM_AGENT_WORK_MS;delay+=750)setTimeout(()=>{if(chat.agentWorkSequence===token)chat.refreshAgentWorkspace?.();},delay);
};

const agents=[
 {id:1,key:'advisor',icon:'chat',name:'Advisor Agent',short:'Advisor',ar:'وكيل الاستشارة',purpose:'Understands intent and routes the conversation.',purposeAr:'يفهم الهدف ويوجه المحادثة.'},
 {id:2,key:'identity',icon:'file',name:'Identity & Document Agent',short:'Identity',ar:'وكيل الهوية والمستندات',purpose:'Reads evidence and validates identity details.',purposeAr:'يقرأ الأدلة ويتحقق من بيانات الهوية.'},
 {id:3,key:'application',icon:'user',name:'Application Agent',short:'Application',ar:'وكيل الطلب',purpose:'Collects only the information still required.',purposeAr:'يجمع فقط المعلومات المطلوبة المتبقية.'},
 {id:4,key:'pricing',icon:'sliders',name:'Underwriting & Pricing Agent',short:'Pricing',ar:'وكيل الاكتتاب والتسعير',purpose:'Assesses cover, eligibility and premium scenarios.',purposeAr:'يقيّم التغطية والأهلية وسيناريوهات القسط.'},
 {id:5,key:'recommendation',icon:'spark',name:'Recommendation Agent',short:'Recommendation',ar:'وكيل التوصيات',purpose:'Explains the best-fit plans and optional benefits.',purposeAr:'يشرح الخطط الأنسب والمنافع الاختيارية.'},
 {id:6,key:'issuance',icon:'shield',name:'Payment & Issuance Agent',short:'Issuance',ar:'وكيل الدفع والإصدار',purpose:'Prepares secure payment and policy issuance.',purposeAr:'يجهز الدفع الآمن وإصدار الوثيقة.'}
];

const copy=(chat,en,ar)=>chat.state.lang==='ar'?ar:en;
const flowStage=chat=>chat.state.purchaseFlow?.stage||'';
const isPayment=stage=>['payment-ready','payment-demo','complete'].includes(stage);

function journeyStage(chat){
 const state=chat.state,flow=flowStage(chat),document=state.agentDocumentCheck;
 if(document&&['scanning','invalid'].includes(document.status)&&(['login','register','customer-profile'].includes(state.stage)||flow==='capture'||(!flow&&state.stage!=='explore')))return 2;
 if(isPayment(flow))return 6;
 if(['addons','selected','review','purchase'].includes(flow))return 5;
 if(['catalogue','recommendations','plans','options','life-intro','calculator','choose','renewal-details'].includes(flow))return 4;
 if(flow==='capture'||state.stage==='customer-profile')return 3;
 if(['login','register'].includes(state.stage))return 2;
 return 1;
}

function activeStage(chat){return chat.agentWork?.status==='running'?chat.agentWork.agentId:chat.lastAgentRun?.agentId||journeyStage(chat);}
function participatedAgents(chat){return new Set([...(chat.state.agentRunHistory||[]),...(chat.agentWork?.completedAgentIds||[]),...(chat.lastAgentRun?.agentSequence||[])]);}
function statusFor(chat,id,active){return chat.agentWork?.status==='running'&&id===active?'running':participatedAgents(chat).has(id)?'complete':'waiting';}
function statusLabel(chat,status){return copy(chat,{complete:'Complete',running:'Active',waiting:'Standby'}[status],{complete:'مكتمل',running:'نشط',waiting:'جاهز'}[status]);}

function intentLabel(chat){
 const state=chat.state,flow=state.purchaseFlow||{},goal=flow.lifeGoal||state.profile?.goal,category=flow.category||state.profile?.category;
 if(flow.renewal||state.existingIntent==='renew')return copy(chat,'Policy renewal','تجديد الوثيقة');
 if(category==='motor')return copy(chat,'Motor Insurance','تأمين المركبات');
 if(goal==='education')return copy(chat,'Education planning','التخطيط للتعليم');
 if(goal==='combined')return copy(chat,'Protection and savings','الحماية والادخار');
 if(category==='life'||goal==='protect')return copy(chat,'Family protection','حماية الأسرة');
 return copy(chat,'Listening for customer intent','الاستماع لهدف العميل');
}

function knownFields(chat){
 const profile=chat.state.profile||{};
 return ['fullName','age','gender','monthlyIncome','occupation','city','dependants','goal','coverage','budget'].filter(key=>profile[key]!==undefined&&profile[key]!==null&&profile[key]!=='').length;
}

function workDefinition(chat,agentId,text=''){
 const agent=agents[agentId-1]||agents[0],definitions={
  1:{title:['Understanding your request','فهم طلبك'],detail:['Reading your message and choosing the right journey.','قراءة رسالتك واختيار الرحلة المناسبة.'],phases:[['Understanding your question','فهم سؤالك'],['Detecting intent and context','تحديد الهدف والسياق'],['Preparing the next best step','إعداد أفضل خطوة تالية']]},
  2:{title:['Checking identity and documents','التحقق من الهوية والمستندات'],detail:['Reviewing the available evidence and validation rules.','مراجعة الأدلة المتاحة وقواعد التحقق.'],phases:[['Reading document details','قراءة تفاصيل المستند'],['Validating identity format','التحقق من صيغة الهوية'],['Preparing a secure result','إعداد نتيجة آمنة']]},
  3:{title:['Preparing your application','إعداد طلبك'],detail:['Checking the customer details needed for a suitable recommendation.','التحقق من بيانات العميل المطلوبة لتوصية مناسبة.'],phases:[['Reviewing shared details','مراجعة البيانات المشتركة'],['Finding missing information','تحديد المعلومات الناقصة'],['Building your application profile','إعداد ملف الطلب']]},
  4:{title:['Assessing policies and pricing','تقييم الوثائق والتسعير'],detail:['Comparing suitable cover and premium scenarios.','مقارنة سيناريوهات التغطية والقسط المناسبة.'],phases:[['Searching relevant policies','البحث عن الوثائق المناسبة'],['Comparing cover and premium','مقارنة التغطية والقسط'],['Checking affordability and fit','التحقق من القدرة المالية والملاءمة']]},
  5:{title:['Preparing the Himaya recommendation','إعداد توصية حماية'],detail:['Reviewing plan fit, trade-offs and optional benefits.','مراجعة ملاءمة الخطة والمفاضلات والمنافع الاختيارية.'],phases:[['Reviewing suitability','مراجعة الملاءمة'],['Ranking the strongest options','ترتيب أقوى الخيارات'],['Explaining why it fits','شرح سبب الملاءمة']]},
  6:{title:['Preparing the secure handoff','إعداد الانتقال الآمن'],detail:['Finalising the payment and policy issuance steps.','إنهاء خطوات الدفع وإصدار الوثيقة.'],phases:[['Checking final selections','التحقق من الاختيارات النهائية'],['Preparing payment handoff','إعداد الانتقال للدفع'],['Ready for policy issuance','جاهز لإصدار الوثيقة']]}
 };
 const definition=definitions[agent.id];
 return {agentId:agent.id,status:'running',startedAt:performance.now(),agentStartedAt:performance.now(),hiddenFrom:chat.state.messages?.length||0,title:copy(chat,...definition.title),detail:copy(chat,...definition.detail),phases:definition.phases.map(phase=>copy(chat,...phase)),prompt:text};
}

function orchestrationForMessage(chat,text){
 const value=String(text||'').toLowerCase(),flow=flowStage(chat);
 if(/document|upload|national id|iqama|identity|هوية|مستند/.test(value))return [2];
 if(/payment|pay|issue|checkout|دفع|إصدار/.test(value)||isPayment(flow))return [6];
 if(chat.state.stage==='customer-profile'||flow==='capture')return [3];
 if(['login','register'].includes(chat.state.stage))return [2];
 if(/update|change|correct|edit/.test(value)&&/profile|details|salary|income|occupation|city|dependants?|بيانات|راتب|دخل|مهنة|مدينة|معال/.test(value))return [3];
 const explanatory=/\b(?:what is|what are|explain|how does|how do|meaning of|tell me about|learn about)\b|(?:ما هو|ما هي|اشرح|كيف يعمل|ماذا يعني)/.test(value),decisionLanguage=/plans?|polic(?:y|ies)|options?|recommend|best|top seller|compare|buy|quote|خطط|وثائق|خيارات|توص|أفضل|شراء|عرض سعر/.test(value);
 if(explanatory&&!decisionLanguage)return [1];
 const pricingOnly=/calculat|premium|price|quote|coverage amount|how much|قسط|سعر|عرض سعر|حساب/.test(value)&&!/plans?|polic(?:y|ies)|options?|recommend|best|top seller|خطط|وثائق|خيارات|توص|أفضل/.test(value);
 if(pricingOnly||flow==='calculator')return [4,5];
 const planDiscovery=/plans?|polic(?:y|ies)|options?|insurance|recommend|best fit|top seller|compare|motor|life|education|family|وثيقة|خطط|خيارات|تأمين|توص|أفضل|مركبات|حياة|تعليم|أسرة/.test(value)||(['catalogue','recommendations','plans','options','life-intro','renewal-details'].includes(flow)&&/which one|cheapest|lowest|popular|suitable|show more|الأرخص|الأقل|الأكثر شعبية|أنسب/.test(value));
 if(planDiscovery)return [5,4,5];
 if(['addons','selected','review','purchase'].includes(flow)||/benefit|add.on|منافع/.test(value))return [5,4,5];
 return [1];
}

function orchestratedWork(chat,sequence,text=''){const resolved=[...new Set((sequence||[]).filter(id=>agents[id-1]))],ordered=resolved.length?sequence.filter(id=>agents[id-1]):[1],work=workDefinition(chat,ordered[0],text);return {...work,agentSequence:ordered,sequenceIndex:0,completedAgentIds:[]};}
function rememberAgentRun(chat,run){const participated=run?.agentSequence?.length?run.agentSequence:[run?.agentId].filter(Boolean);chat.state.agentRunHistory=[...new Set([...(chat.state.agentRunHistory||[]),...participated])];}

function selectionTransition(event){
 const target=event.target;
 const lifeGoal=target.closest('[data-life-goal]');if(lifeGoal)return {sequence:[5,4,5],prompt:`Review ${lifeGoal.textContent.replace(/\s+/g,' ').trim().slice(0,90)}`};
 const policyType=target.closest('[data-policy-type]');if(policyType)return policyType.dataset.policyType==='motor'?{sequence:[5,4,5],prompt:'Explore Motor Insurance options'}:{sequence:[1],prompt:'Start the Life Insurance journey',nonBlocking:true};
 if(target.closest('[data-confirm-purchase],[data-payment-demo]'))return {sequence:[6],prompt:'Prepare secure payment and policy issuance'};
 if(target.closest('[data-continue-buy],[data-personalized-buy]'))return {sequence:[3],prompt:'Prepare the customer application details',nonBlocking:true};
 const catalogueFilter=target.closest('[data-catalogue-filter]');
 if(catalogueFilter){const labels={all:'All Life Insurance policies',protect:'Family protection policies',combined:'Protection and savings policies',education:'Education planning policies'};return {sequence:[5,4,5],prompt:labels[catalogueFilter.dataset.catalogueFilter]||'Life Insurance policies'};}
 const reply=target.closest('[data-reply-option]');if(reply)return {sequence:[5,4,5],prompt:`Review ${reply.dataset.replyOption||reply.textContent.trim()}`};
 const plan=target.closest('[data-synthetic-plan]');if(plan)return {sequence:[5,4,5],prompt:`Review ${plan.textContent.replace(/\s+/g,' ').trim().slice(0,90)}`};
 return null;
}

function agentSteps(chat,agent,status){
 const state=chat.state,flow=state.purchaseFlow||{},document=state.agentDocumentCheck,live=chat.agentWork?.status==='running'&&chat.agentWork.agentId===agent.id;
 if(live)return chat.agentWork.phases.map((label,index)=>({label,state:index===0?'done':index===1?'live':'queued'}));
 const details={
  advisor:[copy(chat,`Intent signal: ${intentLabel(chat)}`,`إشارة الهدف: ${intentLabel(chat)}`),copy(chat,'Routing the conversation to the right specialist','توجيه المحادثة إلى الوكيل المناسب'),copy(chat,'Keeping free text and guided options aligned','مواءمة النص الحر والخيارات الموجهة')],
  identity:[document?copy(chat,document.message,document.messageAr):copy(chat,'Waiting for identity evidence or account sign-in','بانتظار مستند الهوية أو تسجيل الدخول'),copy(chat,state.authenticated?'ART customer account matched':'Checking identity and consent fields',state.authenticated?'تمت مطابقة حساب عميل ART':'التحقق من حقول الهوية والموافقة'),copy(chat,'Sensitive values remain masked','تبقى القيم الحساسة مخفية')],
  application:[copy(chat,`${knownFields(chat)} planning fields available`,`تتوفر ${knownFields(chat)} حقول للتخطيط`),copy(chat,'Finding only the information still missing','تحديد المعلومات الناقصة فقط'),copy(chat,'Preparing a consistent application record','إعداد سجل طلب متسق')],
  pricing:[copy(chat,'Evaluating suitability across available plans','تقييم الملاءمة عبر الخطط المتاحة'),copy(chat,flow.estimate?'Recalculating selected cover and premium':'Preparing cover and premium scenarios',flow.estimate?'إعادة حساب التغطية والقسط المختارين':'إعداد سيناريوهات التغطية والقسط'),copy(chat,'Routing exceptions for human review','تحويل الاستثناءات للمراجعة البشرية')],
  recommendation:[copy(chat,flow.syntheticPolicy?.name?`Selected: ${flow.syntheticPolicy.name}`:'Comparing relevant policy options',flow.syntheticPolicy?.name?`المحدد: ${flow.syntheticPolicy.name}`:'مقارنة خيارات الوثائق المناسبة'),copy(chat,`${(flow.addOns||[]).length} optional benefits selected`,`تم اختيار ${(flow.addOns||[]).length} منافع اختيارية`),copy(chat,'Explaining fit, value and trade-offs','شرح الملاءمة والقيمة والمفاضلات')],
  issuance:[copy(chat,flow.contactSummary?'Customer details ready for final review':'Waiting for verified purchase details',flow.contactSummary?'بيانات العميل جاهزة للمراجعة النهائية':'بانتظار بيانات شراء موثقة'),copy(chat,isPayment(flowStage(chat))?'Secure payment handoff prepared':'Payment connection remains protected',isPayment(flowStage(chat))?'تم تجهيز الانتقال الآمن للدفع':'اتصال الدفع محمي'),copy(chat,'Policy issuance follows approved payment','يتم إصدار الوثيقة بعد الدفع المعتمد')]
 }[agent.key];
 return details.map((label,index)=>({label,state:status==='complete'?'done':status==='waiting'?'queued':index===0?'done':index===1?'live':'queued'}));
}

function latestPrompt(chat,run){
 if(run?.prompt?.trim())return run.prompt.trim();
 const message=[...(chat.state.messages||[])].reverse().find(item=>item.role==='user');
 return message?.raw||intentLabel(chat);
}

function executionSteps(chat,agent,run){
 const state=chat.state,flow=state.purchaseFlow||{},profile=state.profile||{},document=state.agentDocumentCheck,category=flow.category||profile.category||copy(chat,'insurance','التأمين'),promptText=String(run?.prompt||''),detectedGoal=/motor|car|vehicle|مركب|سيار/i.test(promptText)?copy(chat,'Motor Insurance','تأمين المركبات'):/education|school|child|تعليم|دراس/i.test(promptText)?copy(chat,'Education planning','التخطيط للتعليم'):/life|family|protect|حياة|أسرة|حما/i.test(promptText)?copy(chat,'Family protection','حماية الأسرة'):null,goal=detectedGoal||intentLabel(chat),messageCount=(state.messages||[]).length,known=knownFields(chat);
 const context=state.authenticated?copy(chat,'Existing ART customer context loaded with consent','تم تحميل سياق عميل ART الحالي بموافقته'):state.registered?copy(chat,`${known} customer profile fields available for this session`,`يتوفر ${known} حقلاً لملف العميل في هذه الجلسة`):copy(chat,'Guest session · no personal data loaded','جلسة ضيف · لم يتم تحميل بيانات شخصية');
 const common=[
  {title:copy(chat,'Understanding your request','فهم طلبك'),detail:copy(chat,`Intent identified: ${goal}`,`تم تحديد الهدف: ${goal}`)},
  {title:copy(chat,'Loading customer context','تحميل سياق العميل'),detail:context},
  {title:copy(chat,'Conversation memory','ذاكرة المحادثة'),detail:copy(chat,`${messageCount} messages available in this chat`,`${messageCount} رسائل متاحة في هذه المحادثة`)},
  {title:copy(chat,`Routing to ${agent.name}`,`التوجيه إلى ${agent.ar}`),detail:copy(chat,`${agent.name} selected for this task`,`${agent.ar} هو الأنسب لهذه المهمة`)}
 ];
 const specific={
  advisor:[
   {title:copy(chat,'Classifying insurance intent','تصنيف هدف التأمين'),detail:copy(chat,'Detecting product, goal and requested action','تحديد المنتج والهدف والإجراء المطلوب')},
   {title:copy(chat,'Selecting the customer journey','اختيار رحلة العميل'),detail:copy(chat,'Matching free text to the safest relevant path','مطابقة النص الحر مع المسار الأنسب والأكثر أماناً')},
   {title:copy(chat,'Preparing guided next steps','إعداد الخطوات التالية'),detail:copy(chat,'Keeping conversation and clickable options aligned','مواءمة المحادثة والخيارات القابلة للنقر')}
  ],
  identity:[
   {title:copy(chat,'Reading identity evidence','قراءة إثبات الهوية'),detail:document?.fileName||copy(chat,'Waiting for National ID, Iqama or account sign-in','بانتظار الهوية الوطنية أو الإقامة أو تسجيل الدخول')},
   {title:copy(chat,'Validating Saudi identity format','التحقق من صيغة الهوية السعودية'),detail:document?copy(chat,document.message,document.messageAr):copy(chat,'Applying National ID and Iqama validation rules','تطبيق قواعد التحقق من الهوية الوطنية والإقامة')},
   {title:copy(chat,'Protecting sensitive values','حماية القيم الحساسة'),detail:copy(chat,'Identity and contact values remain masked','تبقى قيم الهوية والاتصال مخفية')}
  ],
  application:[
   {title:copy(chat,'Checking required application fields','التحقق من حقول الطلب المطلوبة'),detail:copy(chat,`${known} planning fields are currently available`,`يتوفر حالياً ${known} حقلاً للتخطيط`)},
   {title:copy(chat,'Identifying missing information','تحديد المعلومات الناقصة'),detail:copy(chat,'Requesting only details that affect suitability','طلب البيانات التي تؤثر في الملاءمة فقط')},
   {title:copy(chat,'Building a consistent profile','إعداد ملف متسق'),detail:copy(chat,'Normalising income, dependants, occupation and cover','توحيد الدخل والمعالين والمهنة والتغطية')}
  ],
  pricing:[
   {title:copy(chat,'Searching the policy catalogue','البحث في كتالوج الوثائق'),detail:copy(chat,`${category} plans matched to the current goal`, `تمت مطابقة خطط ${category} مع الهدف الحالي`)},
   {title:copy(chat,'Applying suitability rules','تطبيق قواعد الملاءمة'),detail:copy(chat,'Checking age, city, occupation, dependants and existing cover when available','التحقق من العمر والمدينة والمهنة والمعالين والتغطية الحالية عند توفرها')},
   {title:copy(chat,'Calculating cover and premium','حساب التغطية والقسط'),detail:copy(chat,profile.coverage?`${Number(profile.coverage).toLocaleString('en-SA')} SAR cover · ${profile.budget||'editable'} SAR budget`:'Preparing editable coverage and premium scenarios',profile.coverage?`تغطية ${Number(profile.coverage).toLocaleString('ar-SA')} ر.س · ميزانية ${profile.budget||'قابلة للتعديل'} ر.س`:'إعداد سيناريوهات قابلة للتعديل للتغطية والقسط')},
   {title:copy(chat,'Comparing plan value','مقارنة قيمة الخطط'),detail:copy(chat,'Reviewing premium, cover, popularity and benefit trade-offs','مراجعة القسط والتغطية والشعبية ومفاضلات المنافع')}
  ],
  recommendation:[
   {title:copy(chat,'Reviewing shortlisted policies','مراجعة الوثائق المختصرة'),detail:flow.syntheticPolicy?.name||copy(chat,'Comparing the leading policy matches','مقارنة أفضل الوثائق المطابقة')},
   {title:copy(chat,'Ranking the Himaya recommendation','ترتيب توصية حماية'),detail:copy(chat,'Balancing protection fit, affordability and customer priorities','موازنة ملاءمة الحماية والقدرة المالية وأولويات العميل')},
   {title:copy(chat,'Checking optional benefits','التحقق من المنافع الاختيارية'),detail:copy(chat,`${(flow.addOns||[]).length} paid benefits currently selected`,`تم اختيار ${(flow.addOns||[]).length} منافع مدفوعة حالياً`)},
   {title:copy(chat,'Explaining why it fits','شرح سبب الملاءمة'),detail:copy(chat,'Preparing concise reasons, trade-offs and next actions','إعداد أسباب موجزة ومفاضلات وإجراءات تالية')}
  ],
  issuance:[
   {title:copy(chat,'Reviewing the purchase summary','مراجعة ملخص الشراء'),detail:copy(chat,'Checking selected policy, benefits and customer details','التحقق من الوثيقة والمنافع وبيانات العميل')},
   {title:copy(chat,'Preparing the payment handoff','إعداد الانتقال للدفع'),detail:copy(chat,'Creating a protected transition without exposing payment data','إنشاء انتقال محمي دون كشف بيانات الدفع')},
   {title:copy(chat,'Queuing policy issuance','إدراج إصدار الوثيقة'),detail:copy(chat,'Issuance begins only after approved payment confirmation','يبدأ الإصدار فقط بعد تأكيد الدفع المعتمد')}
  ]
 }[agent.key];
 return [...common,...specific,{title:copy(chat,'Preparing the customer response','إعداد رد العميل'),detail:run?.status==='complete'?copy(chat,'Response delivered to the conversation','تم إرسال الرد إلى المحادثة'):copy(chat,'Formatting the next response and available actions','تنسيق الرد التالي والإجراءات المتاحة')}];
}

function timelineState(run,index,total){
 if(run?.status==='complete')return 'done';
 if(run?.status!=='running')return index===0?'live':'queued';
 const sequenceLength=Math.max(1,run.agentSequence?.length||1),agentDuration=MINIMUM_AGENT_WORK_MS/sequenceLength,elapsed=Math.max(0,performance.now()-(run.agentStartedAt||run.startedAt)),progress=Math.min(total-1,Math.floor(elapsed/(agentDuration/Math.max(1,total-1))));
 return index<progress?'done':index===progress?'live':'queued';
}

function workspaceMarkup(chat){
 const hasActivity=Boolean(chat.state.stage!=='login'&&(chat.state.agentInteractionStarted||chat.agentWork||chat.lastAgentRun||(chat.state.agentRunHistory||[]).length||(chat.state.messages||[]).some(message=>message.role==='user')||chat.state.purchaseFlow));
 if(!hasActivity){const signingIn=chat.state.stage==='login',title=copy(chat,signingIn?'Sign in to continue':'Begin your insurance journey',signingIn?'سجّل الدخول للمتابعة':'ابدأ رحلتك التأمينية'),description=copy(chat,signingIn?'No specialist is needed for this step. Agent activity begins when you explore or compare policies.':'Choose a customer path or ask Himaya about Life or Motor Insurance. Relevant specialists will appear here when guidance is needed.',signingIn?'لا حاجة إلى وكيل متخصص في هذه الخطوة. يبدأ نشاط الوكلاء عند استكشاف الوثائق أو مقارنتها.':'اختر مسار العميل أو اسأل حماية عن تأمين الحياة أو المركبات. سيظهر الوكلاء المتخصصون هنا عند الحاجة إلى الإرشاد.');return `<div class="agent-orchestration-head"><span class="agent-head-icon">${icon('spark')}</span><div><h2>${copy(chat,"What's happening",'ما الذي يحدث')}</h2><p>${copy(chat,'Live agent activity','نشاط الوكلاء المباشر')}</p></div><span class="orchestration-live"><i></i>${copy(chat,'Ready','جاهز')}</span></div><div class="agent-commentary-content agent-commentary-empty" aria-label="${esc(title)}"><div class="agent-empty-state"><span>${icon(signingIn?'lock':'shield')}</span><small>${copy(chat,signingIn?'SECURE ACCESS':'HIMAYA IS READY',signingIn?'وصول آمن':'حماية جاهزة')}</small><h3>${esc(title)}</h3><p>${esc(description)}</p></div></div>`;}
 const current=activeStage(chat),working=chat.agentWork?.status==='running',selected=working?current:Number(chat.state.agentPanelStage)||current,selectedAgent=agents.find(agent=>agent.id===selected)||agents[current-1],selectedStatus=statusFor(chat,selectedAgent.id,current),document=chat.state.agentDocumentCheck,baseRun=working?chat.agentWork:chat.lastAgentRun,run=baseRun&&baseRun.agentId===selected?baseRun:{agentId:selected,status:selectedStatus==='complete'?'complete':'active',startedAt:performance.now(),agentStartedAt:performance.now(),title:selectedAgent.purpose,prompt:''},steps=executionSteps(chat,selectedAgent,run),prompt=latestPrompt(chat,run),duration=run.durationMs?`${(run.durationMs/1000).toFixed(1)}s`:'';
 return `<div class="agent-orchestration-head"><span class="agent-head-icon">${icon('spark')}</span><div><h2>${copy(chat,"What's happening","ما الذي يحدث")}</h2><p>${copy(chat,'Live agent activity','نشاط الوكلاء المباشر')}</p></div><span class="orchestration-live"><i></i>${copy(chat,'Live','مباشر')}</span></div>
 <div class="agent-commentary-content">
 <section class="agent-run-card ${run.status}" aria-live="polite"><div class="agent-run-summary"><div><strong>“${esc(prompt)}”</strong><span>Himaya · ${copy(chat,'intent-led orchestration','تنسيق مبني على الهدف')}</span></div><em>${run.status==='complete'?`${icon('check')} ${copy(chat,`Done in ${duration||'6.0s'}`,`اكتمل خلال ${duration||'6.0 ثانية'}`)}`:run.status==='running'?`${icon('spark')} ${copy(chat,'Working','يعمل الآن')}`:copy(chat,'Current specialist','الوكيل الحالي')}</em></div><div class="agent-run-owner"><span>${icon(selectedAgent.icon)}</span><div><small>${copy(chat,run.status==='running'?'ACTIVE SPECIALIST':'SPECIALIST',run.status==='running'?'الوكيل النشط':'الوكيل المتخصص')}</small><strong>${esc(copy(chat,selectedAgent.name,selectedAgent.ar))}</strong></div></div><div class="agent-execution-timeline">${steps.map((step,index)=>{const stepState=timelineState(run,index,steps.length);return `<div class="agent-timeline-step ${stepState}"><i>${stepState==='done'?icon('check'):stepState==='live'?'<span></span>':''}</i><div><strong>${esc(step.title)}</strong><small>${esc(step.detail)}</small></div></div>`;}).join('')}</div>${document&&selectedAgent.id===2?`<div class="document-agent-result ${document.status}">${icon(document.status==='valid'?'check':document.status==='invalid'?'info':'file')}<span><strong>${esc(copy(chat,document.title,document.titleAr))}</strong><small>${esc(copy(chat,document.message,document.messageAr))}</small></span></div>`:''}</section>
 <details class="agent-roster"><summary>${copy(chat,'Available specialists','الوكلاء المتخصصون')}<span>${copy(chat,'View specialists','عرض الوكلاء')}</span></summary><div class="agent-stage-list">${agents.map(agent=>{const status=statusFor(chat,agent.id,current);return `<button class="agent-stage-row ${status} ${selected===agent.id?'selected':''}" data-agent-stage="${agent.id}" aria-pressed="${selected===agent.id}"><span class="agent-stage-number">${status==='complete'?icon('check'):icon(agent.icon)}</span><span><strong>${esc(copy(chat,agent.name,agent.ar))}</strong><small>${esc(copy(chat,agent.purpose,agent.purposeAr))}</small></span><em>${statusLabel(chat,status)}</em></button>`;}).join('')}</div></details></div>
 <div class="agent-commentary-footer">${icon('sliders')}<span>${copy(chat,'Himaya multi-agent orchestration · steps stream live','تنسيق حماية متعدد الوكلاء · بث الخطوات مباشر')}</span></div>`;
}

function appbarMarkup(chat){
 return `<nav class="agentic-appbar" aria-label="${copy(chat,'Application navigation','تنقل التطبيق')}"><button class="agentic-brand" data-agent-nav="home" aria-label="${copy(chat,'ART Insurance home','الصفحة الرئيسية لتأمين ART')}"><img src="assets/alrajhi-takaful-logo.svg" alt=""><span><strong>Himaya</strong><small>Al Rajhi Takaful</small></span></button><div class="agentic-nav-links"><button data-agent-nav="home">${icon('shield')} ${copy(chat,'Home','الرئيسية')}</button><button class="active" data-agent-nav="chat">${icon('chat')} ${copy(chat,'Chat with Himaya','تحدث مع حماية')}</button></div></nav>`;
}

function workingMarkup(chat){
 const work=chat.agentWork,agent=agents[work.agentId-1];
 return `<div class="message bot agent-response-work" data-agent-work="${agent.id}" role="status" aria-live="polite"><span class="conversation-avatar agent-avatar">${icon(agent.icon)}</span><div class="agent-work-bubble"><div class="agent-work-visual"><span class="agent-work-ring"></span><span class="agent-work-scan"></span><i>${icon(agent.icon)}</i></div><div class="agent-work-copy"><small>${copy(chat,'SPECIALIST WORKING','الوكيل المتخصص يعمل الآن')}</small><strong>${esc(copy(chat,agent.name,agent.ar))}</strong><span class="thinking-label">${esc(work.title)}</span><p>${esc(work.detail)}</p><div class="agent-work-phases">${work.phases.map((phase,index)=>`<span style="--phase:${index}"><i></i>${esc(phase)}</span>`).join('')}</div></div></div></div>`;
}

function applyWorkingState(chat,dialogue){
 dialogue.querySelectorAll('.thinking-message:not([data-agent-work])').forEach(node=>node.remove());
 const work=chat.agentWork;if(work?.status!=='running')return;
 const messages=dialogue.querySelector('.messages'),rows=[...(messages?.querySelectorAll(':scope > .message')||[])];
 rows.forEach((row,index)=>{if(index>=work.hiddenFrom&&chat.state.messages?.[index]?.role==='bot')row.classList.add('agent-response-buffered');});
 const content=dialogue.querySelector('.chat-content');if(content&&!work.nonBlocking)content.classList.add('agent-content-buffered');
 messages?.insertAdjacentHTML('beforeend',workingMarkup(chat));
 dialogue.querySelectorAll('#message-form input,#message-form button').forEach(control=>{control.disabled=true;control.setAttribute('aria-disabled','true');});
 if((work.sequenceIndex||0)===0)requestAnimationFrame(()=>dialogue.querySelector('[data-agent-work]')?.scrollIntoView({block:'nearest',behavior:'smooth'}));
}

function paintAgentWork(chat){
 const dialogue=chat.host.querySelector('.agentic-dialogue');if(dialogue){dialogue.querySelectorAll('[data-agent-work]').forEach(node=>node.remove());applyWorkingState(chat,dialogue);}const status=chat.host.querySelector('.chat-heading .ready');if(status)status.innerHTML=`<i></i>${copy(chat,'Working','يعمل الآن')}`;chat.refreshAgentWorkspace?.();
}

function finishAgentWork(chat,completed,{reopenCalculator=false,focusInput=false}={}){
 rememberAgentRun(chat,completed);chat.lastAgentRun=completed;chat.agentWork=null;chat.state.aiPending=false;chat.workKind=null;chat.persist();const dialogue=chat.host.querySelector('.agentic-dialogue');if(!dialogue){chat.render();return;}
 dialogue.querySelectorAll('[data-agent-work]').forEach(node=>node.remove());dialogue.querySelectorAll('.agent-response-buffered').forEach(node=>node.classList.remove('agent-response-buffered'));dialogue.querySelector('.agent-content-buffered')?.classList.remove('agent-content-buffered');const disabled=['guest','login','register'].includes(chat.state.stage)||chat.state.searching||chat.state.startingGuest;dialogue.querySelectorAll('#message-form input,#message-form button').forEach(control=>{control.disabled=disabled;control.toggleAttribute('aria-disabled',disabled);});const status=chat.host.querySelector('.chat-heading .ready');if(status)status.innerHTML=`<i></i>${copy(chat,'Ready','جاهز')}`;chat.refreshAgentWorkspace?.();if(reopenCalculator)requestAnimationFrame(()=>chat.host.querySelector('[data-insurance-calculator]')?.click());else requestAnimationFrame(()=>{const conversation=dialogue.querySelector('#conversation'),latestBot=[...dialogue.querySelectorAll('.messages .message.bot')].at(-1);if(conversation&&latestBot){const offset=latestBot.getBoundingClientRect().top-conversation.getBoundingClientRect().top,behavior=conversation.style.scrollBehavior;conversation.style.scrollBehavior='auto';conversation.scrollTop=Math.max(0,conversation.scrollTop+offset);conversation.style.scrollBehavior=behavior;}if(focusInput)chat.host.querySelector('#chat-input')?.focus({preventScroll:true});});
}

function buildWorkspace(chat){
 const panel=chat.host.querySelector('.chat-panel');
 document.body.classList.toggle('agentic-workspace-open',Boolean(panel));
 if(!panel)return;
 const current=activeStage(chat);
 if(chat.state.agentActiveStage!==current){chat.state.agentActiveStage=current;chat.state.agentPanelStage=current;}
 panel.classList.add('agentic-shell');panel.classList.toggle('agent-panel-open',Boolean(chat.state.agentPanelOpen));panel.dataset.activeAgent=String(current);panel.classList.toggle('agent-is-working',chat.agentWork?.status==='running');
 const header=panel.querySelector('.chat-header'),heading=header?.querySelector('.chat-heading');
 if(heading){heading.innerHTML=`<strong>Himaya <span lang="ar">حماية</span></strong>`;}
 const language=panel.querySelector('.language-toggle');
 if(language&&!panel.querySelector('[data-agent-panel-toggle]'))language.insertAdjacentHTML('beforebegin',`<button class="agent-panel-toggle" data-agent-panel-toggle aria-label="${copy(chat,'Show agent activity','عرض نشاط الوكلاء')}"><span><i></i>${icon('spark')}</span>${copy(chat,'Agents','الوكلاء')}</button>`);
 const appbar=document.createElement('div');appbar.innerHTML=appbarMarkup(chat);const appbarNode=appbar.firstElementChild;
 const body=document.createElement('div');body.className='agentic-body';
 const dialogue=document.createElement('main');dialogue.className='agentic-dialogue';dialogue.dataset.activeAgent=String(current);
 [header,panel.querySelector('.chat-demo-strip'),panel.querySelector('.chat-status-anchor'),panel.querySelector('.advisor-status'),panel.querySelector('.conversation'),panel.querySelector('.message-form'),panel.querySelector('.chat-brand')].filter(Boolean).forEach(node=>dialogue.append(node));
 const brand=dialogue.querySelector('.chat-brand');if(brand)brand.textContent=copy(chat,'Proof of concept · recommendations and payments are simulated','نموذج تجريبي · التوصيات والمدفوعات محاكاة');
 applyWorkingState(chat,dialogue);
 const aside=document.createElement('aside');aside.className='agentic-sidebar';aside.setAttribute('aria-label',copy(chat,'Live agent activity','نشاط الوكلاء المباشر'));aside.innerHTML=workspaceMarkup(chat);
 body.append(dialogue,aside);panel.replaceChildren(appbarNode,body);
}

function inspectDocument(chat,file,context=''){
 const source=`${context||''} ${file?.name||''}`,groups=source.match(/\d+/g)||[],candidate=groups.sort((a,b)=>b.length-a.length)[0]||'',digits=candidate.replace(/\D/g,'');
 let result;
 if(digits){
  const valid=/^[12]\d{9}$/.test(digits);
  result=valid?{status:'valid',title:'Identity format verified',titleAr:'تم التحقق من صيغة الهوية',message:`Document Agent found a valid Saudi ID / Iqama format ending ${digits.slice(-4)}.`,messageAr:`وجد وكيل المستندات صيغة هوية سعودية / إقامة صالحة تنتهي بـ ${digits.slice(-4)}.`}:{status:'invalid',title:'Identity format needs correction',titleAr:'صيغة الهوية تحتاج إلى تصحيح',message:'The detected ID is not valid. Enter 10 digits beginning with 1 for National ID or 2 for Iqama.',messageAr:'رقم الهوية المكتشف غير صالح. أدخل 10 أرقام تبدأ بـ 1 للهوية الوطنية أو 2 للإقامة.'};
 }else if(String(context||'').trim())result={status:'invalid',title:'Identity format needs correction',titleAr:'صيغة الهوية تحتاج إلى تصحيح',message:'The supplied ID is not valid. Enter 10 digits beginning with 1 for National ID or 2 for Iqama.',messageAr:'رقم الهوية المدخل غير صالح. أدخل 10 أرقام تبدأ بـ 1 للهوية الوطنية أو 2 للإقامة.'};
 else result={status:'scanning',title:'Document review in progress',titleAr:'مراجعة المستند قيد التنفيذ',message:'Document received. OCR extraction requires a connected document service; confirm the 10-digit ID in the form.',messageAr:'تم استلام المستند. يتطلب استخراج النص خدمة مستندات متصلة؛ أكد رقم الهوية المكون من 10 أرقام في النموذج.'};
 chat.state.agentInteractionStarted=true;chat.state.agentDocumentCheck={...result,fileName:file?.name||'',checkedAt:Date.now()};chat.state.agentPanelStage=2;chat.agentWork=orchestratedWork(chat,[2],file?.name||'');chat.persist();paintAgentWork(chat);
 const token=++chat.agentWorkSequence;scheduleWorkspaceProgress(chat,token);setTimeout(()=>{if(chat.agentWorkSequence!==token)return;const completed={...chat.agentWork,status:'complete',durationMs:MINIMUM_AGENT_WORK_MS,completedAt:Date.now()};finishAgentWork(chat,completed);},MINIMUM_AGENT_WORK_MS);
 return result;
}

export function installAgenticWorkspace(Chat){
 const previousRender=Chat.prototype.render,previousClick=Chat.prototype.click,previousChange=Chat.prototype.change,previousSubmit=Chat.prototype.submit,previousCommit=Chat.prototype.commitDocumentMessage,previousSendAdvice=Chat.prototype.sendAdvice;
 Chat.prototype.agentWorkSequence=0;
 Chat.prototype.refreshAgentWorkspace=function(){const current=activeStage(this),panel=this.host.querySelector('.agentic-shell'),dialogue=this.host.querySelector('.agentic-dialogue'),aside=this.host.querySelector('.agentic-sidebar'),content=aside?.querySelector('.agent-commentary-content'),scrollTop=content?.scrollTop||0;if(panel){panel.dataset.activeAgent=String(current);panel.classList.toggle('agent-is-working',this.agentWork?.status==='running');}if(dialogue)dialogue.dataset.activeAgent=String(current);if(aside){aside.innerHTML=workspaceMarkup(this);const next=aside.querySelector('.agent-commentary-content');if(next)next.scrollTop=scrollTop;}};
 Chat.prototype.inspectNationalIdDocument=function(file,context=''){return inspectDocument(this,file,context);};
 Chat.prototype.render=function(){previousRender.call(this);buildWorkspace(this);};
 Chat.prototype.sendAdvice=async function(text,options={}){
  if(this.agentWork?.status==='running'||this.state.aiPending)return;
  this.state.agentInteractionStarted=true;const sequence=orchestrationForMessage(this,text),token=++this.agentWorkSequence,work=orchestratedWork(this,sequence,text),started=performance.now();this.agentWork=work;this.state.agentPanelStage=work.agentId;
  let result,error;const task=previousSendAdvice.call(this,text,options),calculatorRequested=Boolean(this.host.querySelector('#insurance-calculator'));this.state.aiPending=true;this.workKind='agent-transition';paintAgentWork(this);scheduleWorkspaceProgress(this,token);
  try{result=await task;}catch(caught){error=caught;}
  if(token!==this.agentWorkSequence){if(error)throw error;return result;}
  this.state.aiPending=true;this.workKind='agent-transition';paintAgentWork(this);await wait(Math.max(0,MINIMUM_AGENT_WORK_MS-(performance.now()-started)));const reopenCalculator=calculatorRequested||Boolean(this.host.querySelector('#insurance-calculator'));
  if(token===this.agentWorkSequence){const completed={...this.agentWork,status:'complete',durationMs:Math.round(performance.now()-started),completedAt:Date.now()};finishAgentWork(this,completed,{reopenCalculator,focusInput:true});}
  if(error)throw error;return result;
 };
 Chat.prototype.click=async function(event){
  const stage=event.target.closest('[data-agent-stage]');if(stage){this.state.agentPanelStage=Number(stage.dataset.agentStage);this.persist();this.refreshAgentWorkspace();return;}
  if(event.target.closest('[data-agent-panel-toggle]')){this.state.agentPanelOpen=!this.state.agentPanelOpen;this.host.querySelector('.agentic-shell')?.classList.toggle('agent-panel-open',this.state.agentPanelOpen);return;}
  const nav=event.target.closest('[data-agent-nav]');if(nav){const action=nav.dataset.agentNav;if(action==='home'){this.toggle(false);return;}if(action==='renew'){this.state.existingIntent='renew';this.state.entrySource='chat';this.state.stage='login';this.state.purchaseFlow=null;this.state.loginError=null;this.persist();this.render();return;}this.host.querySelector('#chat-input')?.focus({preventScroll:true});return;}
 const restart=event.target.closest('[data-action="restart"]');if(restart){const previousState=this.state,result=previousClick.call(this,event);if(this.state!==previousState){this.agentWorkSequence++;this.agentWork=null;this.lastAgentRun=null;this.workKind=null;this.state.aiPending=false;this.state.agentInteractionStarted=false;this.state.agentRunHistory=[];delete this.state.agentPanelStage;delete this.state.agentActiveStage;this.persist();this.render();}return result;}
 const entrySetup=event.target.closest('[data-journey],[data-new-path]');if(entrySetup){this.agentWorkSequence++;this.agentWork=null;this.lastAgentRun=null;this.workKind=null;this.state.aiPending=false;this.state.agentInteractionStarted=false;this.state.agentRunHistory=[];delete this.state.agentPanelStage;delete this.state.agentActiveStage;const value=previousClick.call(this,event);this.persist();return value;}
 const exploreSetup=event.target.closest('[data-explore-view],[data-explore-journey],[data-exit-life],[data-back-directions],[data-main-journeys],[data-back-entry]');if(exploreSetup){this.agentWorkSequence++;this.agentWork=null;this.state.aiPending=false;this.workKind=null;const value=previousClick.call(this,event);this.persist();return value;}
 const loginNavigation=event.target.closest('[data-existing-path],[data-open-login],[data-entry="existing"]');if(loginNavigation){this.agentWorkSequence++;this.agentWork=null;this.state.aiPending=false;this.workKind=null;const value=previousClick.call(this,event);this.persist();return value;}
  const transition=selectionTransition(event),hiddenFrom=this.state.messages?.length||0,started=performance.now();if(transition)this.state.agentInteractionStarted=true;const result=previousClick.call(this,event);
  if(!transition)return result;
  const token=++this.agentWorkSequence,work=orchestratedWork(this,transition.sequence,transition.prompt);work.hiddenFrom=hiddenFrom;work.nonBlocking=Boolean(transition.nonBlocking);this.agentWork=work;this.state.agentPanelStage=work.agentId;this.state.aiPending=!work.nonBlocking;this.workKind='agent-transition';paintAgentWork(this);scheduleWorkspaceProgress(this,token);
  let error,value;try{value=await result;}catch(caught){error=caught;}
  await wait(Math.max(0,MINIMUM_AGENT_WORK_MS-(performance.now()-started)));
  if(token===this.agentWorkSequence){const completed={...this.agentWork,status:'complete',durationMs:Math.round(performance.now()-started),completedAt:Date.now()};finishAgentWork(this,completed,{focusInput:true});}
  if(error)throw error;return value;
 };
 Chat.prototype.submit=async function(event){
  if(event.target.id==='login-form'){this.agentWorkSequence++;this.agentWork=null;this.state.aiPending=false;this.workKind=null;return previousSubmit.call(this,event);}
  this.state.agentInteractionStarted=true;const profileForm=event.target.id==='customer-profile-form',hiddenFrom=this.state.messages?.length||0,started=performance.now(),result=previousSubmit.call(this,event);let value,error;try{value=await result;}catch(caught){error=caught;}
  const recommendations=profileForm&&this.state.stage==='explore'&&this.state.purchaseFlow?.stage==='recommendations',purchase=profileForm&&this.state.stage==='explore'&&this.state.purchaseFlow?.stage==='purchase';if(!recommendations&&!purchase){if(error)throw error;return value;}
  const sequence=recommendations?[5,4,5]:[3,6],prompt=recommendations?copy(this,'Find my strongest policy matches','اعرض أقوى الوثائق المطابقة لي'):copy(this,'Prepare my application for payment','جهز طلبي للدفع'),token=++this.agentWorkSequence,work=orchestratedWork(this,sequence,prompt);work.hiddenFrom=hiddenFrom;this.agentWork=work;this.state.agentPanelStage=work.agentId;this.state.aiPending=true;this.workKind='agent-transition';paintAgentWork(this);scheduleWorkspaceProgress(this,token);await wait(Math.max(0,MINIMUM_AGENT_WORK_MS-(performance.now()-started)));
  if(token===this.agentWorkSequence){const completed={...this.agentWork,status:'complete',durationMs:Math.round(performance.now()-started),completedAt:Date.now()};finishAgentWork(this,completed);}
  if(error)throw error;return value;
 };
 Chat.prototype.change=function(event){if(event.target.id==='document-upload-input'){const file=event.target.files?.[0];if(file)inspectDocument(this,file,'');}return previousChange.call(this,event);};
 Chat.prototype.commitDocumentMessage=function(form){if(this.pendingAttachment){const context=form.elements.message.value.trim();inspectDocument(this,this.pendingAttachment,context);}return previousCommit.call(this,form);};
}
