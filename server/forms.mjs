import { createHash } from 'node:crypto';
import { ORIGIN } from './public.mjs';
export class FormError extends Error { constructor(message,status=400){super(message);this.status=status;} }
const schemas={
  enquiry:{required:['full_name','email','phone','subject','message'],optional:['enquiry_type']},
  absence:{required:['player_first_name','player_last_name','email','phone','tournament_name','round_number','round_date','reason'],optional:['parent_guardian_name','parent_guardian_phone','notes']}
};
export function validateForm(kind,input){
  const schema=schemas[kind];if(!schema||!input||typeof input!=='object'||Array.isArray(input))throw new FormError('Invalid form.');
  if(input.confirmed!==true)throw new FormError('Confirm the details are correct before sending.');
  const result={};
  for(const field of [...schema.required,...schema.optional]){
    if(input[field]!==undefined&&typeof input[field]!=='string')throw new FormError('Invalid form field.');
    const value=String(input[field]||'').trim();
    if(schema.required.includes(field)&&!value)throw new FormError(`${field.replaceAll('_',' ')} is required.`);
    if(value.length>(['message','reason','notes'].includes(field)?3000:200))throw new FormError('One of the fields is too long.');
    // Existing website notification templates interpolate plain text as HTML.
    // Reject markup rather than sending active content to those templates.
    if(/[<>\u0000]/.test(value))throw new FormError('Use plain text without < or > characters.');
    result[field]=value;
  }
  if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(result.email))throw new FormError('Enter a valid email address.');
  result.email=result.email.toLowerCase();
  if(!/^[+\d() .-]{7,30}$/.test(result.phone)||result.phone.replace(/\D/g,'').length<7)throw new FormError('Enter a valid phone number.');
  if(kind==='absence'){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(result.round_date)||!Number.isFinite(Date.parse(result.round_date))||new Date(result.round_date).toISOString().slice(0,10)!==result.round_date)throw new FormError('Use a real round date in YYYY-MM-DD format.');
    if(!/^\d{1,2}$/.test(result.round_number)||Number(result.round_number)<1)throw new FormError('Enter the round number (1–99).');
    // The existing API has no separate guardian-phone field: preserve it in notes.
    if(result.parent_guardian_phone){result.notes=`Parent/guardian phone: ${result.parent_guardian_phone}\n${result.notes}`;delete result.parent_guardian_phone;}
  }
  return result;
}
export async function readFormBody(req){
  if(!String(req.headers['content-type']||'').startsWith('application/json'))throw new FormError('Send JSON.',415);
  let size=0;const chunks=[];
  for await(const chunk of req){size+=chunk.length;if(size>16384)throw new FormError('Form is too large.',413);chunks.push(chunk);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new FormError('Invalid JSON.');}
}
export function formService(fetcher=fetch,now=Date.now){
  // Memory-only pending/outcome records, never submitted PII. Single-instance
  // retry protection; use a shared durable store before multi-instance hosting.
  const requests=new Map(),limits=new Map();
  return async function submit(kind,input,key,ip='local'){
    if(!/^[A-Za-z0-9_-]{16,100}$/.test(String(key||'')))throw new FormError('A submission reference is required.');
    const payload=validateForm(kind,input);const hash=createHash('sha256').update(JSON.stringify({kind,payload})).digest('hex');
    const timestamp=now();
    for(const [k,v] of requests)if(v.expires<timestamp)requests.delete(k);
    for(const [k,v] of limits)if(v.until<timestamp)limits.delete(k);
    const old=requests.get(key);
    if(old){if(old.hash!==hash)throw new FormError('This submission reference has already been used.',409);return old.promise;}
    const bucket=limits.get(ip)||{count:0,until:timestamp+60000};
    if(bucket.count>=5)throw new FormError('Please wait a minute before sending another form.',429);
    if(limits.size>=10000&&!limits.has(ip)||requests.size>=10000)throw new FormError('Please try again later.',503);
    bucket.count++;limits.set(ip,bucket);
    const promise=(async()=>{
      try{
        const response=await fetcher(`${ORIGIN}${kind==='enquiry'?'/api/contact':'/api/absence'}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),redirect:'error',signal:AbortSignal.timeout(20000)});
        const data=await response.json();
        if(!response.ok||data.ok!==true)throw new Error('Upstream did not confirm storage');
        return {ok:true,reference:key,message:kind==='absence'?'Your absence report has been saved. This does not cancel your entry or request a refund.':'Your enquiry has been saved by the club.',email_status:kind==='absence'&&data.email_warning?'not_confirmed':'unknown'};
      }catch{throw new FormError('We could not confirm receipt. It may have been saved. Please contact the club before sending it again.',502);}
    })();
    requests.set(key,{hash,promise,expires:timestamp+24*60*60*1000});
    return promise;
  };
}
