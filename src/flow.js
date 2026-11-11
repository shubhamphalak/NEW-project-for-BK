import {extract,nextStep} from './catalogue.js';
export const initialState=()=>({experienceVersion:4,lang:'en',open:false,stage:'guest',profile:{},messages:[],compared:[],searching:false,authenticated:false,changed:[]});
export function advance(state,action){
 const s={...state,profile:{...state.profile},messages:[...state.messages]};
 const bot=(key,params={})=>s.messages.push({role:'bot',key,params});
 const user=(key)=>s.messages.push({role:'user',key});
 if(action.type==='guest'){s.stage='home';bot('welcome');return s;}
 if(action.type==='home'){s.stage='home';bot('welcome');return s;}
 if(action.type==='existing'){user('existing');s.stage='login';bot('loginPrompt');return s;}
 if(action.type==='login'){s.authenticated=true;s.stage='products';bot('loginSuccess');return s;}
 if(action.type==='explore'){user('explore');s.stage='products';bot('productsPrompt');return s;}
 if(action.type==='question'){user('question');s.stage='question';bot('askPrompt');return s;}
 if(action.type==='life'){user('life');s.stage=nextStep(s.profile);bot(s.stage+'Prompt');return s;}
 if(action.type==='goal'){s.profile.goal=action.value;user(action.value);if(action.value==='decide')bot('decideGuide');s.stage=nextStep(s.profile);bot(s.stage+'Prompt');return s;}
 if(action.type==='value'){
  s.profile[s.stage]=action.value;if(s.stage==='term')s.profile.paymentTerm=action.value;
  s.messages.push({role:'user',key:action.value===null?'unsure':'value',params:{value:action.value}});
  s.stage=nextStep(s.profile);bot(s.stage+'Prompt');return s;
 }
 if(action.type==='text'){
  const value=action.value.trim();if(!value)return s;
  s.messages.push({role:'user',raw:value});
  if(/existing policy|وثيقة حالية|وثيقة قائمة|بوليصة|تسجيل الدخول/i.test(value)){s.stage='login';bot('loginPrompt');return s;}
  if(/what is|what does|difference|guarantee|guaranteed|cancel|claim|takaful|ما هو|ما هي|الفرق|مضمون|مطالبة|تكافل/i.test(value)){
   const key=/saving|ادخار/i.test(value)?'faqSavings':/claim|مطالبة/i.test(value)?'faqClaims':/cancel|إلغاء/i.test(value)?'faqCancel':/guarantee|مضمون/i.test(value)?'faqGuarantee':'faqTakaful';
   bot(key);return s;
  }
  if(/ask a question|طرح سؤال/i.test(value)){s.stage='question';bot('askPrompt');return s;}
  if(/help me decide|ساعدني على الاختيار/i.test(value)){s.profile.goal='decide';bot('decideGuide');s.stage=nextStep(s.profile);bot(s.stage+'Prompt');return s;}
  if(/explore insurance|استكشاف التأمين/i.test(value)){s.stage='products';bot('productsPrompt');return s;}
  if(/motor|health|travel|مركبات|صحي|سفر/i.test(value)){bot('comingDetail');return s;}
  if(/not sure|لا أعرف|غير متأكد/i.test(value)&&['budget','coverage'].includes(s.stage))return advance({...s,messages:s.messages.slice(0,-1)},{type:'value',value:null});
  const details=extract(value,s.stage);
  if(Object.keys(details).length){
   if(details.age!==undefined&&(details.age<18||details.age>100)){bot('invalidAge');return s;}
   if((details.budget!==undefined&&details.budget<=0)||(details.coverage!==undefined&&details.coverage<=0)||(details.term!==undefined&&(details.term<5||details.term>40))){bot('invalidValue');return s;}
   s.profile={...s.profile,...details};s.stage=nextStep(s.profile);bot('captured');bot(s.stage+'Prompt');return s;
  }
  if(/life|حياة|حماية/i.test(value)){s.stage=nextStep(s.profile);bot(s.stage+'Prompt');return s;}
  bot('fallback');return s;
 }
 if(action.type==='preset'){
  s.profile=action.value==='budget'?{goal:'combined',budget:500}:action.value==='coverage'?{goal:'protect',coverage:500000,term:20,paymentTerm:20}:{goal:'education',term:15,paymentTerm:15};
  user(action.value+'Example');s.stage=nextStep(s.profile);bot(s.stage+'Prompt');return s;
 }
 if(action.type==='edit'){s.stage='summary';bot('summaryPrompt');return s;}
 if(action.type==='match'){s.stage='results';bot('resultsPrompt');return s;}
 if(action.type==='handoff'){bot(action.value==='quote'?'quoteHandoff':'advisorHandoff');return s;}
 return s;
}
