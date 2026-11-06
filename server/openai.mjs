import {recordUsage} from './context.mjs';
export class ProviderError extends Error{constructor(code,metadata={}){super(code);this.code=code;this.httpStatus=metadata.httpStatus||null;this.requestId=metadata.requestId||null;}}
export async function modelResponse(config,input,signal,fetcher=fetch){
 if(!config.key?.trim())throw new ProviderError('missing_key');
 const body={...input,model:config.model,store:false,temperature:config.temperature,max_output_tokens:config.maxOutput};
 if(Math.ceil(Buffer.byteLength(JSON.stringify(body),'utf8')/3)>config.inputBudget)throw new ProviderError('context_budget');
 const started=Date.now();let response;
 try{response=await fetcher('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${config.key}`},body:JSON.stringify(body),signal});}
 catch(e){const error=signal?.aborted?'timeout':'network';recordUsage({model:config.model,requestType:'advisory',latencyMs:Date.now()-started,error},config);throw new ProviderError(error);}
 if(!response.ok){
  let providerCode='';try{const payload=await response.json();providerCode=typeof payload.error?.code==='string'?payload.error.code:'';}catch{}
  const quotaCodes=['insufficient_quota','organization_spend_limit_exceeded','project_spend_limit_exceeded','organization_usage_limit_exceeded'];
  const error=response.status===401?'credentials':response.status===403?'permissions':response.status===429?(quotaCodes.includes(providerCode)?'quota':'rate_limit'):response.status===404?'model_unavailable':response.status===400?'request_invalid':'provider';
  recordUsage({model:config.model,requestType:'advisory',latencyMs:Date.now()-started,error},config);
  throw new ProviderError(error,{httpStatus:response.status,requestId:response.headers?.get('x-request-id')?.slice(0,128)});
 }
 let result;try{result=await response.json();}catch{throw new ProviderError('invalid_response');}
 recordUsage({model:result.model||config.model,requestType:'advisory',usage:result.usage,latencyMs:Date.now()-started},config);
 if(result.status&&result.status!=='completed')throw new ProviderError('incomplete');
 if(result.output?.some(m=>m.content?.some(c=>c.type==='refusal')))throw new ProviderError('refusal');
 return result;
}
export function outputJSON(response){const text=(response.output||[]).flatMap(m=>m.content||[]).filter(c=>c.type==='output_text').map(c=>c.text).join('');try{return JSON.parse(text);}catch{throw new ProviderError('invalid_response');}}
