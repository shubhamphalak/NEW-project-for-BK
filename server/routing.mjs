import {normalize,extract} from '../src/catalogue.js';
import {applyUpdates} from './profile.mjs';
export function routeQuery(text){const s=normalize(text);if(/existing policy|وثيقة حالية|وثيقة قائمة|تسجيل الدخول/.test(s))return 'login';if(/exclu|limitation|استثناء|استثناءات|قيود/.test(s))return 'details';if(/market|competitor|السوق|منافس/.test(s))return 'market';if(/compar|difference between|فرق بين|قارن|مقارنة/.test(s))return 'comparison';if(/increase|higher|upgrade|رفع|زيادة|أزيد/.test(s))return 'upgrade';if(/income|salary|earn|adequ|need|راتب|دخل|أكسب|احتياج/.test(s))return 'coverage';if(/premium|cost|pay|قسط|تكلفة|مساهمة/.test(s))return 'premium';if(/plan|recommend|حماية|خطط|خطة|أوصي/.test(s))return 'plans';return 'conversation';}
const emptyJourney=()=>({intent:'learn',category:'unknown',goal:'unknown',ui:'none',selection:'none',confidence:'low',reason:{en:'No journey change is needed for this message.',ar:'لا يلزم تغيير مسار الرحلة لهذه الرسالة.'}});
export function inferJourney(text,profile={},current={}){
 const s=normalize(text),journey=emptyJourney(),stage=current?.stage||'',activeCategory=current?.category||profile.category||'unknown';
 const educational=/\b(?:what|why|how|explain|learn|understand|difference|mean)\b|ما هو|ما هي|لماذا|كيف|اشرح|أفهم/.test(s);
 const buy=/\b(?:buy(?:ing)?|purchase|apply|ready to buy|get (?:a |an )?(?:policy|insurance)|want (?:a |an )?(?:policy|insurance)|need (?:a |an )?(?:policy|insurance))\b|شراء|أريد (?:وثيقة|تأمين)|أحتاج (?:وثيقة|تأمين)|تقديم طلب/.test(s);
 const recommend=/\b(?:recommend|suggest|best fit|best coverage|best premium|which plan|suitable plan|protect my|cover my|save for)\b|أوص|اقترح|الأنسب|أفضل (?:تغطية|قسط|خطة)|حماية (?:أسرتي|عائلتي)|أدخر/.test(s);
 const renew=/\b(?:renew|renewal|existing policy|current policy|my policy)\b|تجديد|وثيقتي|وثيقة حالية|وثيقة قائمة/.test(s);
 const calculator=/\b(?:calculator|calculate|estimate)\b.{0,35}\b(?:cover|coverage|premium|cost)?\b|\b(?:suggest|recommend|find)\b.{0,35}\b(?:cover|coverage|premium)\b|حاسبة|احسب|تقدير (?:التغطية|القسط)|اقترح.{0,30}(?:تغطية|قسط)/.test(s);
 const motor=/\b(?:motor|car|vehicle|auto|suv|sedan)\b|سيارة|مركبة|مركبات/.test(s);
 const life=/\b(?:life insurance|life policy|life cover|family protection)\b|تأمين الحياة|وثيقة حياة|حماية الأسرة|حماية العائلة/.test(s);
 const education=/\b(?:education|school|college|university|tuition|children'?s? studies)\b|تعليم|دراسة|جامعة|رسوم دراسية/.test(s);
 const combined=/\b(?:saving|savings|investment|future fund|wealth|protection and savings)\b|ادخار|استثمار|توفير|صندوق المستقبل/.test(s);
 const family=/\b(?:family|dependants?|income replacement|loved ones|spouse|children)\b|أسرت|عائلت|المعالين|الأبناء|الأطفال/.test(s);
 const selections=[['family-plus','family plus'],['family-essential','family essential'],['family','family foundation'],['balance-growth','balance growth'],['balance-flex','balance flex'],['balance','future balance'],['education-plus','education plus'],['education-starter','education starter'],['education','education horizon'],['comprehensive','comprehensive'],['smart','wafi smart'],['basic','wafi basic']];
 const selected=selections.find(([,name])=>s.includes(name));
 if(renew)return {intent:'renew',category:activeCategory,goal:profile.goal||'unknown',ui:'login',selection:'none',confidence:'high',reason:{en:'The customer is asking about an existing policy or renewal.',ar:'يسأل العميل عن وثيقة حالية أو التجديد.'}};
 if(selected){const [selection]=selected,category=['comprehensive','smart','basic'].includes(selection)?'motor':'life',goal=selection.startsWith('education')?'education':selection.startsWith('balance')?'combined':category==='life'?'protect':'unknown';return {intent:'select',category,goal,ui:'plan_selected',selection,confidence:'high',reason:{en:'The customer named a specific option.',ar:'ذكر العميل خياراً محدداً.'}};}
 if(calculator)return {intent:'calculate',category:motor?'motor':life?'life':activeCategory,goal:education?'education':combined?'combined':family?'protect':profile.goal||'unknown',ui:'calculator',selection:'none',confidence:activeCategory!=='unknown'||motor||life?'high':'medium',reason:{en:'The customer asked for a coverage or premium calculation.',ar:'طلب العميل حساب التغطية أو القسط.'}};
 if(motor&&(buy||recommend||!educational))return {intent:buy?'buy':'recommend',category:'motor',goal:'unknown',ui:'motor_options',selection:'none',confidence:'high',reason:{en:'The message is about finding motor cover.',ar:'تتعلق الرسالة بالبحث عن تغطية للمركبة.'}};
 if(education&&(buy||recommend||activeCategory==='life'))return {intent:buy?'buy':'recommend',category:'life',goal:'education',ui:'life_plans',selection:'none',confidence:'high',reason:{en:'Education funding is the stated protection goal.',ar:'تمويل التعليم هو هدف الحماية المذكور.'}};
 if(combined&&(buy||recommend||activeCategory==='life'))return {intent:buy?'buy':'recommend',category:'life',goal:'combined',ui:'life_plans',selection:'none',confidence:'high',reason:{en:'Protection with future savings is the stated goal.',ar:'الحماية مع الادخار للمستقبل هي الهدف المذكور.'}};
 if(family&&(buy||recommend||life||activeCategory==='life'))return {intent:buy?'buy':'recommend',category:'life',goal:'protect',ui:'life_plans',selection:'none',confidence:'high',reason:{en:'Family financial protection is the stated goal.',ar:'حماية الأسرة مالياً هي الهدف المذكور.'}};
 if(life&&(buy||recommend))return {intent:buy?'buy':'recommend',category:'life',goal:'unknown',ui:'life_goals',selection:'none',confidence:'high',reason:{en:'Life insurance is clear, but the protection goal is not yet clear.',ar:'تأمين الحياة واضح لكن هدف الحماية لم يتحدد بعد.'}};
 if(buy){if(stage==='selected')return {intent:'buy',category:activeCategory,goal:profile.goal||'unknown',ui:'review',selection:'none',confidence:'high',reason:{en:'The customer is ready to continue with the selected option.',ar:'العميل مستعد للمتابعة بالخيار المحدد.'}};if(stage==='review')return {intent:'buy',category:activeCategory,goal:profile.goal||'unknown',ui:'capture',selection:'none',confidence:'high',reason:{en:'The customer is ready for the secure purchase details step.',ar:'العميل مستعد لخطوة بيانات الشراء الآمنة.'}};return {intent:'clarify',category:'unknown',goal:'unknown',ui:'choose_category',selection:'none',confidence:'medium',reason:{en:'Purchase intent is clear, but the insurance type is not.',ar:'نية الشراء واضحة لكن نوع التأمين غير محدد.'}};}
 return journey;
}
// Development adapter only: deterministic extraction is deliberately marked Mock, never presented as GPT.
export function mockUpdates(text,profile,stage){const s=normalize(text),p=extract(text,stage),updates=[];
 const income=s.match(/(?:earn(?:ing)?|salary(?: is| of)?|income(?: is| of)?|make|راتبي|راتب|دخلي|دخل|أكسب)\s*(?:approximately\s*)?(?:sar\s*)?(\d+(?:\.\d+)?)/);
 if(income){p[/annual|year|سنوي/.test(s)?'annualIncome':'monthlyIncome']=+income[1];if(!/budget|contribut|can pay|ميزاني|أدفع/.test(s))delete p.budget;}
 const dep=s.match(/(\d+)\s*(?:dependants?|dependents?|children|kids|معالين|أطفال|ابناء)/)||s.match(/(?:dependants?|dependents?|المعالين)\s*(?:are|:)?\s*(\d+)/);if(dep)p.dependants=+dep[1];
 const existing=s.match(/(?:existing (?:cover|coverage)|already (?:have|covered for)|تغطية حالية|التغطية الحالية)\s*(?:of\s*)?(?:sar\s*)?(\d+)/);if(existing){p.existingCover=+existing[1];if(!/want|increase|new cover|change coverage|أريد|زيادة/.test(s))delete p.coverage;}
 const dob=s.match(/(?:born|dob|birth|ولدت|ميلاد)\s*(?:on\s*)?(\d{4}-\d{2}-\d{2})/);if(dob)p.dob=dob[1];
 const newAge=s.match(/(?:actually(?: i am| i'm)?|age (?:to|is)|change (?:my )?age to|عمري الآن|العمر)\s*(\d{1,2})/);if(newAge)p.age=+newAge[1];
 const cover=s.match(/(?:cover(?:age)?|sum assured|التغطية|تغطية)\s*(?:to|is|of|إلى|قدرها)?\s*(?:sar\s*)?(\d{4,})/);if(cover)p.coverage=+cover[1];if(existing&&!/want|increase|new cover|change coverage|أريد|زيادة/.test(s))delete p.coverage;
 const budget=s.match(/(?:budget|ميزانيتي|الميزانية)\s*(?:to|is|of|إلى)?\s*(?:sar\s*)?(\d+)/);if(budget)p.budget=+budget[1];
 if(/health|medical insurance|تأمين صحي|التأمين الصحي/.test(s))p.category='health';else if(/motor|تأمين المركبات/.test(s))p.category='motor';else if(/travel insurance|تأمين السفر/.test(s))p.category='travel';else if(/life|family protection|الحياة|حماية العائلة/.test(s))p.category='life';
 if(/annual (?:payment|premium)|pay annually|سنوي الدفع/.test(s))p.frequency='annual';if(/pay monthly|monthly payment|دفع شهري/.test(s))p.frequency='monthly';
 if(/not sure|skip|لست متأكد|تخطي/.test(s)&&['budget','coverage'].includes(stage))p[stage]=null;
 if(/double (?:my )?(?:cover|coverage)|ضاعف التغطية/.test(s)&&profile.coverage)p.coverage=profile.coverage*2;
 if(/income.*double|salary.*double|تضاعف.*راتب/.test(s)&&profile.monthlyIncome)p.monthlyIncome=profile.monthlyIncome*2;
 for(const [field,value]of Object.entries(p))updates.push({field,value});return updates;
}
export function quickActions(layout,profile){const options=layout==='details'?['compare','calculator']:layout==='comparison'?['calculator','coverage']:layout==='coverage'?['calculator','exclusions']:layout==='premium'||layout==='upgrade'?['coverage','benefits']:['compare','calculator','exclusions'];return options.slice(0,3);}
