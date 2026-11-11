import {coverForBudget} from './calculator-budget.mjs';
﻿import {nearbyPlans} from './nearby-plans.mjs';
import {match,price,effective} from '../src/catalogue.js';
import {knowledge,customerInsights,marketData,retrieve} from './knowledge.mjs';
import {validateProfile,applyUpdates} from './profile.mjs';
const round=n=>Math.round(n*100)/100;
export async function coverageNeeds(profile){
 const p=validateProfile(profile),kb=await knowledge(),rules=kb.needsRules,eligible=kb.products.filter(x=>(p.age===undefined||p.age>=x.minAge&&p.age<=x.maxAge)&&(!p.selectedProduct||p.selectedProduct===x.id));
 if(p.category&&p.category!=='life')return {options:[],reason:'categoryUnavailable',method:rules.disclosure};if(!eligible.length)return {options:[],reason:'ageEligibility',method:rules.disclosure};
 if(!p.annualIncome)return {options:[],reason:'incomeUnknown',method:rules.disclosure};
 const extra=Math.min((p.dependants||0)*rules.dependantIncomeYears,rules.maxDependantYears),min=Math.min(...eligible.map(x=>x.minCover)),max=Math.max(...eligible.map(x=>x.maxCover));const seen=new Set(),options=[];
 for(const [level,years]of [['basic',rules.basicIncomeYears],['recommended',rules.recommendedIncomeYears],['enhanced',rules.enhancedIncomeYears]]){
  const target=Math.max(0,p.annualIncome*(years+extra)-(p.existingCover||0));if(!target)continue;
  const amount=Math.min(max,Math.max(min,Math.ceil(target/rules.rounding)*rules.rounding));if(seen.has(amount))continue;seen.add(amount);
  options.push({level,amount,incomeYears:years,dependantYears:extra,existingCover:p.existingCover||0,unboundedNeed:round(target),limitedByCatalogue:amount!==Math.ceil(target/rules.rounding)*rules.rounding,supportedBy:eligible.filter(x=>amount>=x.minCover&&amount<=x.maxCover).map(x=>x.id)});
 }
 return {annualIncome:p.annualIncome,options,method:rules.disclosure,reason:options.length?null:'existingCoverMeetsHeuristic',customAmountAllowed:true};
}
export async function scenario(profile={},baseline){
 const original=validateProfile(profile),kb=await knowledge(),p=effective(original),result=match(p,kb.products),category=original.category||'life';
 const matches=category==='life'?result.matches:[],rejected=category==='life'?result.rejected:[];
 const assumptions=['age','budget','coverage','term','paymentTerm','frequency','goal'].filter(k=>original[k]==null).map(key=>({key,value:p[key]}));
 if(category!=='life')return {...result,matches:[],rejected:[],profile:p,provided:original,assumptions:[],suggestedCover:[],budgetSuggestions:[],categoryAvailable:false,needs:null,delta:null,source:kb.source,pricingStatus:'unavailable',insights:{available:false}};
 const selected=kb.products.find(x=>x.id===original.selectedProduct)||matches[0]?.product||kb.products[0];
 const current=price(selected,p),previous=baseline?price(selected,effective(validateProfile(baseline))):current;
 for(const m of matches)m.annualEquivalent=round(m.normalized*12);
 const delta={productId:selected.id,previousMonthly:round(previous.normalized),currentMonthly:round(current.normalized),previousAnnual:round(previous.normalized*12),currentAnnual:round(current.normalized*12),absoluteMonthly:round(current.normalized-previous.normalized),absoluteAnnual:round((current.normalized-previous.normalized)*12),percentage:previous.normalized?round((current.normalized-previous.normalized)/previous.normalized*100):0,barPrevious:round(previous.normalized/Math.max(previous.normalized,current.normalized)*100),barCurrent:round(current.normalized/Math.max(previous.normalized,current.normalized)*100),eligible:matches.some(m=>m.product.id===selected.id)};
  const paymentFactor=p.frequency==='annual'?.96:p.frequency==='semiannual'?.98:p.frequency==='quarterly'?.99:1;
 const costOne=price(selected,{...p,coverage:100000}).normalized,costTwo=price(selected,{...p,coverage:200000}).normalized;
 const affordable=Math.max(0,Math.floor((p.budget-(costOne-(costTwo-costOne)))/(costTwo-costOne)*100000/25000)*25000);
 const cap=Math.min(selected.maxCover,affordable),values=[selected.minCover,Math.min(cap,p.coverage),cap];
 const suggestedCover=category==='life'&&cap>=selected.minCover?[...new Set(values)].filter(n=>n>=selected.minCover&&n<=selected.maxCover).map((amount,i)=>({level:['basic','recommended','enhanced'][i],amount})):[];
 const budgetSuggestions=original.monthlyIncome?[...new Set([.01,.03,.05].map(r=>Math.max(50,Math.min(100000,Math.round(original.monthlyIncome*r/50)*50))))]:[];
 const needs=category==='life'?await coverageNeeds(original):null;
 return {...result,matches,rejected,profile:p,provided:original,budgetComparison:nearbyPlans(original,kb.products),assumptions,suggestedCover,budgetSuggestions,categoryAvailable:category==='life',needs,delta,source:kb.source,pricingStatus:'indicative',method:'Original demo rate formula: cover units × base rate × age/term factors × term/payment-term + allocated savings; annual 4% and quarterly 1% discounts. Not an insurer quote.',insights:await customerInsights(currentConfig||{},original,selected.id)};
}
let currentConfig;export function configureCalculations(config){currentConfig=config;}
export async function upgrade(profile){if(profile.category&&profile.category!=='life')return {available:false,reason:'Category unavailable'};const kb=await knowledge(),p=effective(validateProfile(profile)),result=match(p,kb.products),product=kb.products.find(x=>x.id===profile.selectedProduct)||result.matches[0]?.product;if(!product||!result.matches.some(m=>m.product.id===product.id))return {available:false,reason:'No eligible and affordable current plan.'};const coverage=Math.min(product.maxCover,Math.ceil(p.coverage*1.25/25000)*25000);if(coverage<=p.coverage)return {available:false,reason:'Current cover already reaches the plan limit.'};const next={...p,coverage},eligible=match(next,[product]),before=price(product,p),after=price(product,next);return {available:true,productId:product.id,currentCoverage:p.coverage,proposedCoverage:coverage,additionalCover:coverage-p.coverage,currentMonthly:round(before.normalized),proposedMonthly:round(after.normalized),incrementalMonthly:round(after.normalized-before.normalized),incrementalAnnual:round((after.normalized-before.normalized)*12),withinBudget:eligible.matches.length>0,benefit:'Increased conditional sum assured under the same fictional terms. No new rider or additional policy benefit is implied.',profile:next,pricingStatus:'indicative'};}
export const toolNames=['update_profile','retrieve_products','recommend_plans','compare_plans','calculate_premium','calculate_coverage','coverage_upgrade','market_analysis','customer_insights'];
export async function executeTool(name,args={},session,config){
 if(!toolNames.includes(name))throw Error('Unknown tool');if(!args||typeof args!=='object'||Array.isArray(args))throw Error('Invalid tool arguments');
 if(name==='update_profile'){const previous={...session.profile};session.profile=applyUpdates(session.profile,args.updates);return {profile:session.profile,scenario:await scenario(session.profile,args.baseline||previous)};}
 if(name==='retrieve_products')return retrieve({ids:Array.isArray(args.ids)?args.ids:[],category:session.profile.category||'life',fields:Array.isArray(args.fields)&&args.fields.length?args.fields:['benefits','limitations','eligibility']});
 if(name==='calculate_premium'&&args.solveFor==='coverage'){const calculated=coverForBudget(session.profile,(await knowledge()).products);const next=calculated.available?{...session.profile,coverage:calculated.coverage,selectedProduct:calculated.productId}:session.profile;return {...await scenario(next,args.baseline),calculator:calculated};}
 if(name==='recommend_plans'||name==='calculate_premium'||name==='compare_plans')return scenario(session.profile,args.baseline);
 if(name==='calculate_coverage')return coverageNeeds(session.profile);
 if(name==='coverage_upgrade')return upgrade(session.profile);
 if(name==='market_analysis'){const [market,local]=await Promise.all([marketData(config),retrieve({category:session.profile.category||'life'})]);return {market,local};}
 if(name==='customer_insights')return customerInsights(config,session.profile,args.productId||session.profile.selectedProduct||'family');
}
