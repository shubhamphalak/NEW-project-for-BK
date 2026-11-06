import {readFile,stat} from 'node:fs/promises';
const files=new Map(),queries=new Map();let hits=0,misses=0;
export async function cachedJson(file){const key=String(file),stamp=await stat(file),version=`${stamp.mtimeMs}:${stamp.size}`;let entry=files.get(key);if(entry?.version===version){hits++;return entry.data;}const data=JSON.parse((await readFile(file,'utf8')).replace(/^\uFEFF/,''));files.set(key,{version,data});queries.clear();misses++;return data;}
export async function knowledge(){return cachedJson(new URL('../data/products.json',import.meta.url));}
export async function retrieve({ids=[],category='life',fields=['benefits','limitations','eligibility']}={}){
 const kb=await knowledge(),key=JSON.stringify([kb.version,ids,category,fields]);if(queries.has(key)){hits++;return structuredClone(queries.get(key));}
 const selected=kb.products.filter(p=>(!ids.length||ids.includes(p.id))&&p.category===category).slice(0,3).map(p=>{
  const item={id:p.id,name:p.name,displayName:p.displayName,kind:p.kind,source:kb.source};
  if(fields.includes('benefits'))item.benefits=p.benefits;
  if(fields.includes('limitations'))Object.assign(item,{limitations:p.limitations,exclusionsStatus:p.exclusionsStatus,riders:p.riders,deductibles:p.deductibles,copayments:p.copayments});
  if(fields.includes('eligibility'))Object.assign(item,{entryAges:[p.minAge,p.maxAge],coverageLimits:[p.minCover,p.maxCover],termYears:[p.minTerm,p.maxTerm],maturityAge:75});
  if(fields.includes('pricing'))Object.assign(item,{baseRate:p.rate,savingsAllocation:p.savings,paymentTermFlexible:p.flexPay,pricingStatus:'indicative'});
  return item;
 });const result={products:selected,source:kb.source,categoryAvailable:selected.length>0};if(queries.size>100)queries.clear();queries.set(key,result);misses++;return structuredClone(result);
}
export const cacheStats=()=>({hits,misses,files:files.size,queries:queries.size});
// Provider boundaries: replace these functions with approved API adapters without changing tools or UI.
export async function marketData(config){try{const data=await cachedJson(config.marketFile);const products=(data.products||[]).filter(p=>p.verified===true&&typeof p.sourceUrl==='string'&&/^https:\/\//.test(p.sourceUrl)&&p.asOf&&p.name).slice(0,10).map(p=>({id:p.id,name:p.name,provider:p.provider,benefits:p.benefits,limitations:p.limitations,sourceUrl:p.sourceUrl,asOf:p.asOf,verified:true}));return {available:products.length>0,scope:products.length?'configured-verified-dataset':'local-catalogue-only',products,source:data.source||null,live:false};}catch{return {available:false,scope:'local-catalogue-only',products:[],live:false};}}
export async function customerInsights(config,profile,productId){try{const data=await cachedJson(config.analyticsFile),minimum=Math.max(20,Number(data.minimumCohort)||20);const rows=(data.aggregates||[]).filter(a=>a.productId===productId&&a.count>=minimum&&a.total>=a.count&&Number.isInteger(a.count)&&Number.isInteger(a.total)&&(!a.ageRange||(profile.age>=a.ageRange[0]&&profile.age<=a.ageRange[1]))&&(!a.incomeRange||(profile.annualIncome>=a.incomeRange[0]&&profile.annualIncome<=a.incomeRange[1]))&&(!a.occupation||a.occupation===profile.occupation));if(!data.source||!rows.length)return {available:false,reason:'No qualifying aggregated selection dataset is configured.'};return {available:true,source:data.source,cohorts:rows.slice(0,2).map(a=>({count:a.count,total:a.total,percentage:Math.round(a.count/a.total*100),ageRange:a.ageRange||null,incomeRange:a.incomeRange||null,occupation:a.occupation||null}))};}catch{return {available:false,reason:'Aggregated selection data is unavailable.'};}}
