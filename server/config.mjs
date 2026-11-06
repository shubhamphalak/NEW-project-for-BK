import {readFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const defaultRoot=fileURLToPath(new URL('../',import.meta.url));
export async function loadEnvironment(root=defaultRoot,env=process.env){
 const envFile=path.resolve(root,'.env');
 try{
  const values=parseEnv((await readFile(envFile,'utf8')).replace(/^\uFEFF/,'')),overridden=[];
  for(const [key,value]of Object.entries(values)){
   if(env[key]===undefined||String(env[key]).trim()==='')env[key]=value;
   else if(env[key]!==value&&['LLM_ENABLED','MOCK_LLM_MODE','OPENAI_MODEL','OPENAI_API_KEY','PORT','HOST','APP_ORIGIN'].includes(key))overridden.push(key);
  }
  return {loaded:true,envFile,overridden};
 }catch(e){if(e.code==='ENOENT')return {loaded:false,envFile,overridden:[]};throw Error('Unable to read the private .env file. Check its path and syntax.');}
}
export function configuration(env=process.env){
 const num=(key,fallback,min,max)=>{const n=Number(env[key]);return env[key]!==undefined&&env[key]!==''&&Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;};
 const flag=(name,fallback)=>{const value=env[name]?.trim().toLowerCase();if(!value)return fallback;if(value==='true')return true;if(value==='false')return false;throw Error(`${name} must be true or false.`);};
 let appOrigin=null;const originValue=env.APP_ORIGIN?.trim();if(originValue){let url;try{url=new URL(originValue);}catch{throw Error('APP_ORIGIN must be an http(s) origin, for example https://himaya.example.com.');}if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('APP_ORIGIN must contain only an http(s) scheme, hostname and optional port.');appOrigin=url.origin;}
 const enabled=flag('LLM_ENABLED',true),mock=flag('MOCK_LLM_MODE',true),key=env.OPENAI_API_KEY?.trim()||'';
 return {host:env.HOST?.trim()||'127.0.0.1',appOrigin,key,model:env.OPENAI_MODEL?.trim()||'gpt-4.1',enabled,mock,mode:!enabled?'local':mock?'mock':key?'live':'error',reason:!enabled?'disabled':!mock&&!key?'missing_key':null,maxOutput:Math.floor(num('LLM_MAX_OUTPUT_TOKENS',800,200,4000)),temperature:num('LLM_TEMPERATURE',.3,0,2),timeout:num('LLM_TIMEOUT_MS',20000,1000,60000),historyTurns:Math.floor(num('LLM_HISTORY_TURNS',6,2,12)),contextChars:num('LLM_CONTEXT_MAX_CHARS',8000,2000,20000),inputBudget:num('LLM_INPUT_TOKEN_BUDGET',6000,1000,16000),maxRounds:Math.floor(num('LLM_MAX_TOOL_ROUNDS',3,1,5)),maxCalls:Math.floor(num('LLM_MAX_TOOL_CALLS',6,1,12)),inputCost:env.LLM_INPUT_COST_PER_MILLION?num('LLM_INPUT_COST_PER_MILLION',0,0,1000):null,outputCost:env.LLM_OUTPUT_COST_PER_MILLION?num('LLM_OUTPUT_COST_PER_MILLION',0,0,1000):null,marketFile:env.MARKET_DATA_FILE||new URL('../data/market.json',import.meta.url),analyticsFile:env.ANALYTICS_DATA_FILE||new URL('../data/analytics.json',import.meta.url),port:num('PORT',4173,1024,65535)};
}
export function startupMessage(config,environment){
 const lines=[`ART prototype: http://${config.host==='0.0.0.0'?'localhost':config.host||'127.0.0.1'}:${config.port}`,`.env: ${environment.loaded?'loaded':'not found'} (${environment.envFile})`,`LLM_ENABLED=${config.enabled}; MOCK_LLM_MODE=${config.mock}; OPENAI_API_KEY=${config.key?'present (value hidden)':'missing'}`];
 if(environment.overridden.length)lines.push(`Inherited process environment overrides .env for: ${environment.overridden.join(', ')}. Clear those variables in the launching terminal to use .env.`);
 if(config.mode==='live')lines.push(`Advisor mode: Live LLM Mode; model: ${config.model}`,'Chat messages call the OpenAI API. Deterministic calculators do not.');
 else if(config.mode==='mock')lines.push(`Advisor mode: Mock Mode; model configured: ${config.model}`,'No live API calls: MOCK_LLM_MODE=true. Set it to false to enable Live LLM Mode.');
 else if(config.mode==='error')lines.push(`Advisor mode: Live LLM Mode unavailable; model: ${config.model}`,'Configuration error: OPENAI_API_KEY is missing. Add it to the private .env file and restart. Mock responses will not be substituted.');
 else lines.push('Advisor mode: Local Mode; LLM_ENABLED=false. No live API calls.');
 return lines.join('\n');
}
