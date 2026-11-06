import {escapeHTML as esc,icon} from './icons.js';
// Presentation only: escape all response text and style its existing structure.
export function formatReply(value){
 const inline=text=>esc(text).replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>').replace(/(?:\bSAR\s*[0-9٠-٩][0-9٠-٩,.٬٫]*|[0-9٠-٩][0-9٠-٩,.٬٫]*\s*(?:SAR\b|ر\.س|ريال))/gi,amount=>'<span class="reply-amount">'+amount+'</span>');
 const lines=String(value||'').split(/\r?\n/);let output='',items=[],ordered=false,paragraphs=0;
 const flush=()=>{if(!items.length)return;const tag=ordered?'ol':'ul';output+='<'+tag+' class="reply-points '+(ordered?'reply-ranked':'reply-features')+'">'+items.map((item,index)=>'<li class="reply-point '+(/recommended|موصى به/i.test(item)?'reply-point-recommended':'')+'"><span class="reply-check" aria-hidden="true">'+(ordered?'<span>'+esc(item.match(/^\d+[.)]\s*/)?.[0].replace(/[.)\s]/g,'')||index+1)+'</span>':icon('check'))+'</span><span class="reply-point-copy">'+inline(ordered?item.replace(/^\d+[.)]\s*/,''):item)+'</span></li>').join('')+'</'+tag+'>';items=[];};
 for(const line of lines){const text=line.trim();if(!text){flush();continue;}const numbered=text.match(/^\d+[.)]\s+(.+)$/),bullet=text.match(/^[-*•]\s+(.+)$/);if(numbered||bullet){const nextOrdered=!!numbered;if(items.length&&nextOrdered!==ordered)flush();ordered=nextOrdered;items.push(numbered?text:bullet[1]);continue;}
 flush();const heading=text.match(/^#{1,3}\s+(.+)$/);if(heading){output+='<h3 class="reply-heading">'+inline(heading[1])+'</h3>';continue;}const question=/[?؟]$/.test(text);output+='<p class="'+(question?'reply-question':paragraphs++===0?'reply-lead':'reply-paragraph')+'">'+(question?'<span class="reply-question-icon" aria-hidden="true">'+icon('chat')+'</span>':'')+'<span>'+inline(text)+'</span></p>';
 }
 flush();return '<div class="reply-copy">'+output+'</div>';
}

export function isObsoleteVerificationNotice(message){return message?.role==='bot'&&(message.key==='error_ungrounded_numbers'||/The model returned a number that could not be verified|The live answer contained an unsupported number and was withheld|The model returned an unsupported number|أعاد النموذج رقماً لا يمكن التحقق منه|حُجب الرد المباشر لاحتوائه على رقم غير موثق/.test(message.localized?.en||message.localized?.ar||message.raw||''));}
