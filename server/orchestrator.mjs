import {activityLabel} from './activity.mjs';
import {advise} from './advisor.mjs';
import {motorRequest,motorAdvice} from './motor.mjs';
import {adviceFailure} from './errors.mjs';
export async function orchestrate(session,body,config,emit,fetcher,signal){
 if(typeof body.message!=='string'||!body.message.trim()||body.message.length>1000)throw Error('Invalid message');
 const events=[];const send=(id,status,result)=>{const event={id,status,label:activityLabel(id,body.message,session.profile,session.motor),result:result||null,simulated:config.mode!=='live'};events.push(event);emit(event);};
 const run=async(id,fn,result)=>{send(id,'in_progress');try{const status=await fn();send(id,status==='unavailable'?'unavailable':'completed',result);}catch(e){send(id,'unavailable');throw e;}};
 if(config.mode==='error')return adviceFailure('missing_key',session.profile,body.stage);
 const snapshot=structuredClone({profile:session.profile,motor:session.motor,productContexts:session.productContexts||{}});
 const motor=body.stage!=='explore'&&motorRequest(body.message,session);const target=motor?'motor':/life|حياة|حماية العائلة/i.test(body.message)?'life':session.profile.category||'life';
 session.productContexts||={};const previous=session.profile.category||'life';
 if(previous!==target){session.productContexts[previous]=structuredClone(session.profile);session.profile=session.productContexts[target]||{category:target};body={...body,profile:session.profile};}
 
 let result;
 try{
 if(motor)result=await motorAdvice(session,body,config,run,fetcher,signal);
 else {let active=null;result=await advise(session,body,config,id=>{if(active)send(active,'completed');active=id;send(id,'in_progress');},fetcher,signal);if(active)send(active,result.mode==='error'?'unavailable':'completed');}
 }catch(e){session.profile=snapshot.profile;session.motor=snapshot.motor;session.productContexts=snapshot.productContexts;result=adviceFailure(e.code||'provider',session.profile,body.stage,e);}
 return {...result,analysis:events.filter(e=>e.status!=='in_progress'),customer:session.customer||null};
}
