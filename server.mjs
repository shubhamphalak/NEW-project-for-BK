import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadEnvironment,configuration,startupMessage} from './server/config.mjs';
import {sessionFor,usageSummary} from './server/context.mjs';
import {cacheStats,retrieve,marketData} from './server/knowledge.mjs';
import {configureCalculations,scenario,executeTool} from './server/calculations.mjs';
import {validateProfile} from './server/profile.mjs';
import {orchestrate as advise} from './server/orchestrator.mjs';
import {login,validLogin} from './server/customer.mjs';
import {startGuest} from './server/onboarding.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8'};
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
async function bodyJSON(req){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>24000)throw Error('Request too large');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
export function createApp(config,{fetcher}={}){
 configureCalculations(config);
 const loginAttempts=new Map();
 return http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
  try{
   const base=`http://${req.headers.host}`,url=new URL(req.url,base);
   if(!['127.0.0.1','localhost','[::1]',...(config.appOrigin?[new URL(config.appOrigin).hostname]:[])].includes(url.hostname)){json(res,403,{error:'Invalid host'});return;}
   if(req.headers.origin&&req.headers.origin!==(config.appOrigin||base)){json(res,403,{error:'Cross-origin access denied'});return;}
   if(url.pathname==='/api/config'&&req.method==='GET'){json(res,200,{mode:config.mode,model:config.model,reason:config.reason,keyConfigured:!!config.key});return;}
   if(url.pathname==='/api/dev/usage'&&req.method==='GET'){json(res,200,{mode:config.mode,usage:usageSummary(),cache:cacheStats()});return;}
   if(url.pathname.startsWith('/api/')){
    if(req.method!=='POST'){json(res,405,{error:'POST required'});return;}
    if(!req.headers['content-type']?.startsWith('application/json')){json(res,415,{error:'JSON required'});return;}
    const body=await bodyJSON(req),session=sessionFor(req.headers['x-session-id']);
    if(session.busy){json(res,409,{error:'A request is already running in this session'});return;}
    if(body.profile)session.profile=validateProfile(body.profile);
    if(url.pathname==='/api/session/guest'){res.setHeader('Set-Cookie','art_auth=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');json(res,200,startGuest(session,body.intent));return;}
    if(url.pathname==='/api/auth/login'){
     const ip=req.socket.remoteAddress,now=Date.now();for(const [key,value] of loginAttempts)if(now-value.at>60000)loginAttempts.delete(key);const attempts=loginAttempts.get(ip)||{count:0,at:now};
     if(attempts.count>=5){json(res,429,{error:'Too many login attempts. Please wait a minute and try again.'});return;}
     const customer=login(session,body.username,body.password);if(!customer){attempts.count++;loginAttempts.set(ip,attempts);json(res,401,{error:'Incorrect username or password.'});return;}
     loginAttempts.delete(ip);res.setHeader('Set-Cookie','art_auth='+session.authToken+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800');json(res,200,customer);return;
    }
    if(url.pathname==='/api/tools'){const allowed=['update_profile','retrieve_products','recommend_plans','compare_plans','calculate_premium','calculate_coverage','coverage_upgrade','market_analysis','customer_insights'];if(!allowed.includes(body.name)){json(res,400,{error:'Unsupported tool'});return;}const data=await executeTool(body.name,body.args||{},session,config);json(res,200,{mode:'calculated',data});return;}
    if(url.pathname==='/api/advice'){
     res.writeHead(200,{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store','X-Accel-Buffering':'no'});
     const event=data=>{if(!res.destroyed)res.write(JSON.stringify(data)+'\n');};
     if(session.authenticated&&!validLogin(session,req.headers.cookie))session.authenticated=false;
     session.onboarding=false;delete session.pendingIntent;
     session.busy=true;const cancelled=new AbortController();res.on('close',()=>cancelled.abort());try{const data=await advise(session,body,config,stage=>event({type:'status',stage}),fetcher,cancelled.signal);event({type:'result',data});}catch(e){event({type:'error',message:'Unable to process that input. Check the age, amounts, or duration and try again.'});}finally{session.busy=false;}res.end();return;
    }
    json(res,404,{error:'Unknown endpoint'});return;
   }
   if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
   const pathname=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname),parts=pathname.split('/');
   const allowed=pathname==='/index.html'||pathname==='/data/products.json'||/^\/(src|assets|tests)\//.test(pathname);
   const file=path.resolve(root,'.'+pathname),extension=path.extname(file);
   if(!allowed||parts.some(s=>s.startsWith('.'))||!types[extension]||!file.startsWith(root+path.sep)||file.includes(path.sep+'artifacts'+path.sep)&&extension!=='.png'){res.writeHead(404);res.end('Not found');return;}
   const content=await readFile(file);res.writeHead(200,{'Content-Type':types[extension],'Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:content);
  }catch(e){if(!res.headersSent)json(res,400,{error:'Invalid request. Check the input and try again.'});else res.end();}
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const environment=await loadEnvironment(root);const config=configuration();createApp(config).listen(config.port,config.host,()=>console.log(startupMessage(config,environment))).on('error',e=>{console.error(e.message);process.exitCode=1;});
}
