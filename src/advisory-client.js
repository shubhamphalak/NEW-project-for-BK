const key='art-advisor-session';
export function sessionId(){let id=sessionStorage.getItem(key);if(!id){id=crypto.randomUUID();sessionStorage.setItem(key,id);}return id;}
export async function api(path,body,signal){const response=await fetch(path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json','X-Session-Id':sessionId()}:undefined,body:body?JSON.stringify(body):undefined,signal});if(!response.ok)throw Error('Service unavailable');return response;}
export async function configuration(){return (await api('/api/config')).json();}
export async function tool(name,profile,args={},signal){return (await(await api('/api/tools',{name,profile,args},signal)).json()).data;}
export async function advice(message,profile,stage,journey,onStatus,signal){if(typeof journey==='function'){signal=onStatus;onStatus=journey;journey=null;}onStatus=onStatus||(()=>{});const response=await api('/api/advice',{message,profile,stage,journey},signal),reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',result;
 const parse=line=>{if(!line.trim())return;const event=JSON.parse(line);if(event.type==='status')onStatus(event.stage);if(event.type==='result')result=event.data;if(event.type==='error'){const error=Error('The backend rejected the request.');error.code=event.code||'invalid_input';throw error;}};
 while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split('\n');buffer=lines.pop();for(const line of lines)parse(line);}buffer+=decoder.decode();if(buffer.trim())parse(buffer);if(!result)throw Error('No advisor response');return result;
}
