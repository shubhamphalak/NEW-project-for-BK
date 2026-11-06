import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createApp} from '../server.mjs';
import {configuration} from '../server/config.mjs';
const directory=fileURLToPath(new URL('./artifacts/',import.meta.url));await mkdir(directory,{recursive:true});
let reply={en:'Live transport verification reached the chat renderer.',ar:'وصل التحقق من النقل المباشر إلى المحادثة.'};
try{const verified=JSON.parse(await readFile(new URL('./artifacts/live-verification.json',import.meta.url),'utf8'));if(verified.passed&&verified.reply)reply=verified.reply;}catch{}
const config=configuration({LLM_ENABLED:'true',MOCK_LLM_MODE:'false',OPENAI_API_KEY:'synthetic-test-key'});let calls=0,keyInBrowser=false;
const app=createApp(config,{fetcher:async(url,options)=>{calls++;if(options.body.includes('invalid-credentials-fixture'))return new Response(JSON.stringify({error:{code:'invalid_api_key',message:'SYNTHETIC_SECRET_DO_NOT_ECHO'}}),{status:401});return new Response(JSON.stringify({status:'completed',model:'gpt-4.1',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({reply,layout:'reply',actions:[],planReasons:[]})}]}]}));}});
app.on('request',(req)=>{if(req.headers.authorization)keyInBrowser=true;});await new Promise(r=>app.listen(0,'127.0.0.1',r));
try{
 const url=`http://127.0.0.1:${app.address().port}/tests/live-mode.html`;const args=['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',`--user-data-dir=${path.join(directory,'mode-profile')}`,'--virtual-time-budget=45000','--dump-dom',url];
 const result=await new Promise((resolve,reject)=>{const p=spawn(process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args,{windowsHide:true,stdio:['ignore','pipe','pipe']});let text='';p.stdout.on('data',d=>text+=d);p.on('error',reject);const timer=setTimeout(()=>{p.kill();reject(Error('Browser timed out'));},30000);p.on('close',()=>{clearTimeout(timer);resolve(text);});});
 const summary=result.match(/<p id="status">([^<]*)<\/p>/)?.[1]||'Browser verification did not complete',checks=[...result.matchAll(/<li class="(?:pass|fail)">([^<]*)<\/li>/g)].map(m=>m[1]);const report=[summary,...checks,`Backend fixture requests: ${calls}; browser Authorization header present: ${keyInBrowser}; additional real OpenAI requests: 0`].join('\n');await writeFile(path.join(directory,'live-rendering-report.txt'),report);console.log(report);if(!result.includes('data-result="passed"')||keyInBrowser||calls!==2)process.exitCode=1;
}finally{await new Promise(r=>app.close(r));}
