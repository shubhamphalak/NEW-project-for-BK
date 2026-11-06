import {normalize,extract} from '../src/catalogue.js';
import {applyUpdates} from './profile.mjs';
export function routeQuery(text){const s=normalize(text);if(/existing policy|وثيقة حالية|وثيقة قائمة|تسجيل الدخول/.test(s))return 'login';if(/exclu|limitation|استثناء|استثناءات|قيود/.test(s))return 'details';if(/market|competitor|السوق|منافس/.test(s))return 'market';if(/compar|difference between|فرق بين|قارن|مقارنة/.test(s))return 'comparison';if(/increase|higher|upgrade|رفع|زيادة|أزيد/.test(s))return 'upgrade';if(/income|salary|earn|adequ|need|راتب|دخل|أكسب|احتياج/.test(s))return 'coverage';if(/premium|cost|pay|قسط|تكلفة|مساهمة/.test(s))return 'premium';if(/plan|recommend|حماية|خطط|خطة|أوصي/.test(s))return 'plans';return 'conversation';}
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
