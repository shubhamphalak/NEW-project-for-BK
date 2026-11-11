const goals=['protect','combined','education'];
const families={
 protect:['Family Guard','Income Shield','Legacy Protect','Family Continuity','Essential Life'],
 combined:['Future Balance','Wealth Protect','Life Builder','Secure Growth','Prosperity Life'],
 education:['Education Promise','Scholar Future','Learning Legacy','University Path','Education Guard']
};
const tiers=['Essential','Select','Premier','Elite','Signature','Plus','Advance','Prime'];
const cities=['Riyadh','Jeddah','Dammam','Madinah','Makkah','Khobar','Abha','Tabuk'];
const hash=value=>[...String(value)].reduce((sum,char,index)=>sum+char.charCodeAt(0)*(index+1),0);
export const syntheticLifePolicies=goals.flatMap((goal,goalIndex)=>Array.from({length:40},(_,index)=>{
 const sequence=goalIndex*40+index+1,family=families[goal][index%families[goal].length],tier=tiers[Math.floor(index/5)%tiers.length],seed=hash(`${goal}-${sequence}`),minCover=100000+(index%4)*50000,maxCover=500000+(index%8)*250000;
 return {id:`syn-life-${String(sequence).padStart(3,'0')}`,name:`ART ${family} ${tier}`,goal,minAge:18,maxAge:goal==='protect'?65:60,minTerm:goal==='protect'?5:10,maxTerm:goal==='education'?25:30,minCover,maxCover,baseRate:22+(seed%31),savings:goal==='protect'?0:90+(seed%260),cityAffinity:cities[seed%cities.length],popularity:58+(seed%39),sales15Days:18+(seed%74),ageBand:18+(seed%5)*10,source:'synthetic-demo'};
}));

export const lifeAddOns=[
 {id:'critical-illness',name:{en:'Critical illness support',ar:'دعم الأمراض الحرجة'},cost:45,benefit:{en:'Adds a defined lump-sum support layer for eligible critical illness events.',ar:'يضيف دعماً بمبلغ محدد للحالات المؤهلة من الأمراض الحرجة.'}},
 {id:'accidental-death',name:{en:'Accidental death enhancement',ar:'تعزيز منفعة الوفاة العرضية'},cost:30,benefit:{en:'Increases eligible protection if death results from a covered accident.',ar:'يزيد الحماية المؤهلة إذا نتجت الوفاة عن حادث مشمول.'}},
 {id:'premium-waiver',name:{en:'Premium waiver benefit',ar:'منفعة الإعفاء من الأقساط'},cost:35,benefit:{en:'Helps keep eligible cover active if a qualifying disability prevents work.',ar:'يساعد في استمرار التغطية المؤهلة إذا منعت إعاقة مستوفية للشروط من العمل.'}},
 {id:'hospital-cash',name:{en:'Hospital cash support',ar:'دعم نقدي أثناء التنويم'},cost:25,benefit:{en:'Provides a fixed daily amount for eligible inpatient stays.',ar:'يوفر مبلغاً يومياً ثابتاً لحالات التنويم المؤهلة.'}},
 {id:'education-continuity',name:{en:'Education continuity benefit',ar:'منفعة استمرارية التعليم'},cost:40,benefit:{en:'Adds goal-specific support to help protect an eligible education funding plan.',ar:'يضيف دعماً مخصصاً للمساعدة في حماية خطة تمويل التعليم المؤهلة.'}}
];

const number=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
export const monthlyPremium=(policy,profile)=>{
 const age=number(profile.age,35),coverage=Math.max(policy.minCover,Math.min(policy.maxCover,number(profile.coverage,Math.min(750000,policy.maxCover)))),term=Math.max(policy.minTerm,Math.min(policy.maxTerm,number(profile.term,20))),occupationRisk=/construction|driver|field|security|engineer/i.test(profile.occupation||'')?1.08:1;
 const protection=policy.baseRate*(coverage/100000)*(1+Math.max(0,age-25)*.018)*(1+Math.max(0,term-10)*.008)*occupationRisk;
 return Math.round((protection+policy.savings)*100)/100;
};
const ageBand=age=>age<30?'18–29':age<40?'30–39':age<50?'40–49':age<60?'50–59':'60+';
export function rankLifePolicies(profile,goal=profile.goal||'protect'){
 const age=number(profile.age,35),income=Math.max(1,number(profile.monthlyIncome||profile.salary,15000)),budget=Math.max(1,number(profile.budget,Math.round(income*.06))),dependants=number(profile.dependants,0),city=profile.city||'Riyadh',coverageNeed=Math.max(100000,number(profile.coverage,Math.round(income*12*(dependants>=3?7:5)))),term=number(profile.term,20);
 const termMatches=syntheticLifePolicies.filter(policy=>policy.goal===goal&&term>=policy.minTerm&&term<=policy.maxTerm),ageMatches=termMatches.filter(policy=>age>=policy.minAge&&age<=policy.maxAge),comparisonPool=ageMatches.length?ageMatches:termMatches;
 return comparisonPool.map(policy=>{
  const coverage=Math.max(policy.minCover,Math.min(policy.maxCover,coverageNeed)),premium=monthlyPremium(policy,{...profile,coverage}),affordability=premium/income,coverFit=1-Math.min(1,Math.abs(coverage-coverageNeed)/Math.max(coverageNeed,1)),budgetFit=1-Math.min(1,Math.abs(premium-budget)/Math.max(budget,1)),cityFit=policy.cityAffinity===city?1:.55,dependantFit=dependants>=3?policy.maxCover/2500000:.65,popularity=policy.popularity/100;
  const score=Math.round(Math.max(55,Math.min(98,(coverFit*.3+budgetFit*.25+cityFit*.15+dependantFit*.1+popularity*.2)*100)));
  return {...policy,coverage,premium,score,affordability,ageSegment:ageBand(age),citySales:policy.sales15Days+(policy.cityAffinity===city?14:0),reasons:[`${score}% match across protection need and affordability`,premium<=budget?`Within the ${budget.toLocaleString('en-SA')} SAR monthly preference`:`Stronger cover with a ${Math.round(premium-budget)} SAR monthly trade-off`,dependants?`Coverage accounts for ${dependants} dependant${dependants===1?'':'s'}`:'Balanced for the selected life goal',`${city} popularity signal for the last 15 days`]};
 }).sort((a,b)=>b.score-a.score||a.premium-b.premium);
}

export function profileInsights(profile,ranked,renewal=false){
 const best=ranked[0],popular=ranked.slice().sort((a,b)=>b.citySales-a.citySales)[0],income=number(profile.monthlyIncome||profile.salary),currentPremium=number(profile.currentPremium||profile.budget),currentCoverage=number(profile.currentCoverage||profile.existingCover),premiumShare=income?Math.round(best.premium/income*1000)/10:null,coverageLift=currentCoverage?Math.round((best.coverage-currentCoverage)/currentCoverage*100):null;
 const insights=[
  {title:'Affordability',text:premiumShare==null?'Premium affordability uses the editable monthly budget.':`${best.premium.toLocaleString('en-SA')} SAR is about ${premiumShare}% of stated monthly income.`},
  {title:'Protection fit',text:`${best.coverage.toLocaleString('en-SA')} SAR aligns with the selected goal and dependant profile.`},
  {title:'Segment signal',text:`${popular.name} is the simulated top seller for age ${best.ageSegment} in ${profile.city||'Riyadh'} over the last 15 days (${popular.citySales} simulated selections).`},
  {title:'Occupation context',text:/construction|driver|field|security/i.test(profile.occupation||'')?'The occupation was treated as higher exposure when estimating affordability.':'The occupation does not add a higher-exposure adjustment in this demonstration.'}
 ];
 if(renewal)insights.unshift({title:coverageLift>10?'Consider switching':'Renewal remains competitive',text:coverageLift>10?`The leading alternative offers about ${coverageLift}% more cover; compare the premium before switching.`:`The best alternative does not create a material cover advantage over the current ${currentCoverage.toLocaleString('en-SA')} SAR.`});
 return {best,popular,insights,currentPremium,currentCoverage,verdict:renewal?(coverageLift>10?'compare-switch':'renew'):null};
}

export const baseCatalogueId=goal=>({protect:'family',combined:'balance',education:'education'}[goal]||'family');
