import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {loadEnvironment,configuration,startupMessage} from '../server/config.mjs';
import {createApp} from '../server.mjs';
import {usageSummary} from '../server/context.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const environment=await loadEnvironment(root),config=configuration();
console.log(startupMessage(config,environment));
if(config.mode!=='live'){console.error('Live verification was not run. Set LLM_ENABLED=true, MOCK_LLM_MODE=false and configure the private OPENAI_API_KEY.');process.exitCode=1;}
else{
 const app=createApp(config);await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
 try{
  const response=await fetch(`http://127.0.0.1:${app.address().port}/api/advice`,{method:'POST',headers:{'Content-Type':'application/json','X-Session-Id':'live-verification-'+crypto.randomUUID()},body:JSON.stringify({message:'Explain what sum assured means in one brief sentence, without numbers. This is a general definition, not a product recommendation.',profile:{},stage:'home'}),signal:AbortSignal.timeout(config.timeout+10000)});
  const events=(await response.text()).trim().split('\n').filter(Boolean).map(line=>JSON.parse(line)),result=events.find(e=>e.type==='result')?.data,usage=usageSummary();
  const passed=response.ok&&result?.mode==='live'&&typeof result.reply?.en==='string'&&typeof result.reply?.ar==='string'&&usage.requests>0&&usage.recent.some(r=>r.usageReported&&!r.error);
  const report={passed,mode:result?.mode||'error',model:usage.recent.findLast(r=>!r.error)?.model||config.model,error:result?.error||null,httpStatus:result?.provider?.httpStatus||null,liveRequests:usage.requests,inputTokens:usage.inputTokens,outputTokens:usage.outputTokens,reply:passed?result.reply:null};
  await mkdir(new URL('../tests/artifacts/',import.meta.url),{recursive:true});await writeFile(new URL('../tests/artifacts/live-verification.json',import.meta.url),JSON.stringify(report,null,2));
  console.log(JSON.stringify({passed,mode:report.mode,model:report.model,error:report.error,httpStatus:report.httpStatus,liveRequests:report.liveRequests,inputTokens:report.inputTokens,outputTokens:report.outputTokens}));
  if(!passed){console.error(result?.reply?.en||'Live verification failed before receiving an advisor response.');process.exitCode=1;}
 }catch{console.error('Live verification could not finish. Check backend connectivity and the configured timeout. No key or raw provider response was logged.');process.exitCode=1;}
 finally{await new Promise(resolve=>app.close(resolve));}
}
