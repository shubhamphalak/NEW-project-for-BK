import {effective,match,price} from '../src/catalogue.js';
import {validateProfile} from './profile.mjs';
const round=value=>Math.round(value*100)/100;
export function coverForBudget(profile,products){const p={...effective(validateProfile(profile)),frequency:'monthly'},step=1000;const eligible=products.filter(product=>match({...p,coverage:Math.max(10000,product.minCover),budget:100000},[product]).matches.length).sort((a,b)=>Number(b.kind===p.goal)-Number(a.kind===p.goal));const product=eligible.find(product=>product.id===p.selectedProduct)||eligible[0];
 if(!product)return {mode:'budget',available:false,reason:'age-or-term',coverage:0,monthly:null,annual:null,budget:p.budget,unusedMonthly:p.budget,coverageCapped:false,productId:null};
 const min=Math.ceil(Math.max(10000,product.minCover)/step),max=Math.floor(Math.min(5000000,product.maxCover)/step),minimumMonthly=round(price(product,{...p,coverage:min*step}).normalized);let low=min,high=max,best=0;
 while(low<=high){const middle=Math.floor((low+high)/2),estimate=price(product,{...p,coverage:middle*step}).normalized;if(estimate<=p.budget){best=middle;low=middle+1;}else high=middle-1;}
 if(!best)return {mode:'budget',available:false,reason:'budget',coverage:0,monthly:null,annual:null,budget:p.budget,minimumMonthly,minimumCoverage:min*step,unusedMonthly:p.budget,coverageCapped:false,productId:product.id};
 const coverage=best*step,monthly=round(price(product,{...p,coverage}).normalized);return {mode:'budget',available:true,coverage,monthly,annual:round(monthly*12),budget:p.budget,minimumMonthly,minimumCoverage:min*step,unusedMonthly:round(p.budget-monthly),coverageCapped:best===max,productId:product.id};
}
