import knowledge from '../data/products.json' with { type: 'json' };
export const catalogue=knowledge.products;
export const defaults = {age:35,budget:500,coverage:300000,term:20,paymentTerm:20,frequency:'monthly',goal:'combined'};
export function effective(profile) { const p={...defaults,...profile}; for(const key of ['budget','coverage']) if(p[key]==null) p[key]=defaults[key]; return p; }
export function price(product, profile) {
 const p=effective(profile), pay=product.flexPay ? p.paymentTerm : p.term;
 const risk=product.rate*(p.coverage/100000)*(1+Math.max(0,p.age-25)*.025)*(1+Math.max(0,p.term-10)*.012);
 const savings=product.savings*p.term/pay;
 const monthly=Math.ceil((risk*p.term/pay+savings)*100)/100;
 const factor=p.frequency==='annual'?11.52:p.frequency==='semiannual'?5.88:p.frequency==='quarterly'?2.97:1;
 const contribution=Math.round(monthly*factor*100)/100;
 const normalized=contribution/(p.frequency==='annual'?12:p.frequency==='semiannual'?6:p.frequency==='quarterly'?3:1);
 // Fictional 3% net annual savings growth; no guaranteed maturity value.
 const projected=product.savings ? Math.round(savings*12*((Math.pow(1.03,pay)-1)/.03)*Math.pow(1.03,p.term-pay)) : null;
 return {monthly,contribution,normalized,projected,paymentTerm:pay,savingsPaid:Math.round(savings*12*pay)};
}
export function match(profile,products=catalogue) {
 const p=effective(profile), matches=[], rejected=[];
 for(const product of products){
  const issues=[];
  if(!Number.isFinite(p.age)||p.age<product.minAge||p.age>product.maxAge) issues.push('ageConstraint');
  if(p.term<product.minTerm||p.term>product.maxTerm||p.age+p.term>75) issues.push('termConstraint');
  if(p.coverage<product.minCover||p.coverage>product.maxCover) issues.push('coverConstraint');
  if(product.flexPay&&(p.paymentTerm<5||p.paymentTerm>p.term)) issues.push('payConstraint');
  const quote=price(product,p);
  if(quote.normalized>p.budget) issues.push('budgetConstraint');
  if(issues.length) rejected.push({product,issues}); else matches.push({product,...quote});
 }
 const primary=new Set(['family','balance','education']);
 matches.sort((a,b)=>((b.product.id===p.selectedProduct?100:0)-(a.product.id===p.selectedProduct?100:0))||((b.product.kind===p.goal?10:0)-(a.product.kind===p.goal?10:0))||Number(primary.has(b.product.id))-Number(primary.has(a.product.id))||a.normalized-b.normalized);
 return {matches:matches.slice(0,3),rejected,profile:p};
}
export function normalize(text){return text.replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[٬,]/g,'').toLowerCase();}
export function extract(text,step){
 const s=normalize(text), result={};
 const age=s.match(/(?:i(?:'m| am)|age(?:d)?|عمري|عمر[يه]?)\s*(\d{1,2})/) || s.match(/(\d{1,2})\s*(?:years? old|عاما|عاماً|سنة من العمر)/);
 if(age) result.age=+age[1];
 const budget=s.match(/(?:up to|budget(?: is)?|pay(?: up to)?|contribut(?:e|ion)(?: up to)?|ميزانيتي|ميزانية|أدفع|حتى)\s*(?:sar\s*)?(\d+)/) || s.match(/(\d+)\s*(?:sar\s*)?(?:a |per |شهرياً|شهريا|في الشهر|ريال شهري|ريال في الشهر|\/)?(?:month|شهري|الشهر)/);
 if(budget) result.budget=+budget[1];
 const range=s.match(/(\d+)\s*(?:-|–|to|إلى)\s*(?:sar\s*)?(\d+)/);if(range&&(step==='budget'||/budget|month|ميزانية|شهري/.test(s)))result.budget=Math.max(+range[1],+range[2]);
 const cover=s.match(/(?:want|cover(?:age)?(?: of)?|sum assured|تغطية(?: قدرها)?|أريد)\s*(?:sar\s*)?(\d{4,})/) || s.match(/(?:sar\s*)?(\d{4,})\s*(?:of cover|cover|تغطية|ريال تغطية)/);
 if(cover) result.coverage=+cover[1];
 const term=s.match(/(?:for|in|after|خلال|بعد|لمدة)\s*(\d{1,2})\s*(?:years?|سنة|عام)/);
 if(term){result.term=+term[1];result.paymentTerm=+term[1];}
 if(/education|university|child|تعليم|جامعة|طفل/.test(s)) result.goal='education';
 else if(/combin|saving|ادخار/.test(s)) result.goal='combined';
 else if(/family|protect|أسرت|عائل|حماية/.test(s)) result.goal='protect';
 if(/^\d+$/.test(s.trim())){const n=+s;if(step==='age')result.age=n;if(step==='budget')result.budget=n;if(step==='coverage')result.coverage=n;if(step==='term'){result.term=n;result.paymentTerm=n;}}
 return result;
}
export function nextStep(profile){if(!profile.goal)return 'goal';if(profile.age===undefined)return 'age';if(profile.budget===undefined)return 'budget';if(profile.coverage===undefined)return 'coverage';if(profile.term===undefined)return 'term';return 'summary';}
