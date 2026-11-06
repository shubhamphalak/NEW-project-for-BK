export const numericFields={age:[0,100],monthlyIncome:[0,10000000],annualIncome:[0,120000000],dependants:[0,20],existingCover:[0,100000000],coverage:[10000,5000000],budget:[1,100000],term:[5,40],paymentTerm:[5,40],educationYears:[1,30]};
export const enums={goal:['protect','combined','education','decide'],frequency:['monthly','quarterly','annual'],category:['life','health','motor','travel'],selectedProduct:['family','balance','education']};
export function validateProfile(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid profile');const out={};
 for(const [key,value]of Object.entries(input)){
  if(value===undefined)continue;if(value===null&&['budget','coverage'].includes(key)){out[key]=null;continue;}
  if(key in numericFields){const [min,max]=numericFields[key];if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||(['age','dependants','term','paymentTerm','educationYears'].includes(key))&&!Number.isInteger(value))throw Error('Invalid '+key);out[key]=value;}
  else if(key in enums){if(!enums[key].includes(value))throw Error('Invalid '+key);out[key]=value;}
  else if(['occupation','requirements'].includes(key)){if(typeof value!=='string'||value.length>400)throw Error('Invalid '+key);out[key]=value;}
  else throw Error('Unsupported profile field: '+key);
 }
 if(out.monthlyIncome!==undefined)out.annualIncome=out.monthlyIncome*12;
 return out;
}
export function applyUpdates(profile,updates,today=new Date()){
 const patch={};if(!Array.isArray(updates)||updates.length>16)throw Error('Invalid updates');
 for(const u of updates){if(!u||typeof u.field!=='string')throw Error('Invalid update');if(u.field==='dob'){const text=u.value;if(typeof text!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(text))throw Error('Use YYYY-MM-DD for date of birth');const dob=new Date(text+'T00:00:00Z');if(!Number.isFinite(+dob)||dob.toISOString().slice(0,10)!==text||dob>today)throw Error('Invalid date of birth');patch.age=today.getUTCFullYear()-dob.getUTCFullYear()-((today.getUTCMonth()<dob.getUTCMonth()||(today.getUTCMonth()===dob.getUTCMonth()&&today.getUTCDate()<dob.getUTCDate()))?1:0);}else patch[u.field]=u.value;}
 if(patch.annualIncome!==undefined&&patch.monthlyIncome===undefined)patch.monthlyIncome=patch.annualIncome/12;
 if(patch.educationYears!==undefined&&patch.term===undefined){patch.term=Math.max(5,patch.educationYears);patch.goal='education';}
 if(patch.term!==undefined&&patch.paymentTerm===undefined&&(profile.paymentTerm===undefined||profile.paymentTerm===profile.term||profile.paymentTerm>patch.term))patch.paymentTerm=patch.term;
 return validateProfile({...profile,...patch});
}
export function profileSummary(p,focus='') {return JSON.stringify({profile:p,focus,unknown:['age','monthlyIncome','dependants','budget','coverage','term'].filter(k=>p[k]===undefined),note:'Do not treat scenario defaults as user-provided facts.'});}
