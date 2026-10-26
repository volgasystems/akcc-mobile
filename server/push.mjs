import {timingSafeEqual}from'node:crypto';
import {FormError}from'./forms.mjs';
import {ORIGIN}from'./public.mjs';
export const PUSH_CONSENT_VERSION='akcc-announcements-1';
export function pushConfigured(env,db){return !!db&&env.MOBILE_PUSH_ENABLED==='true'&&env.MOBILE_PUSH_CREDENTIALS_VERIFIED==='true'&&/^[a-f\d-]{36}$/i.test(env.EXPO_PROJECT_ID||'')&&!!env.EXPO_ACCESS_TOKEN&&String(env.MOBILE_PUSH_CRON_SECRET||'').length>=32;}
export function cronAuthorized(header,secret){const expected=Buffer.from(`Bearer ${secret||''}`),actual=Buffer.from(header||'');return !!secret&&actual.length===expected.length&&timingSafeEqual(actual,expected);}
export function announcementEvents(feed){
 const out=[];
 for(const [kind,rows]of [['tournament',feed.tournaments||[]],['news',feed.news||[]]])for(const row of rows){
  if(kind==='tournament'&&!row.registration_url)continue;
  let url;try{url=new URL(row.url);}catch{continue;}
  const match=url.pathname.match(kind==='news'?/^\/news\/([A-Za-z0-9_-]{1,200})$/:/^\/tournaments\/([A-Za-z0-9_-]{1,150})$/);
  if(url.origin!==ORIGIN||!match||typeof row.title!=='string'||!row.title.trim())continue;
  out.push({key:`${kind}:${match[1]}`,kind,slug:match[1],title:row.title.trim().slice(0,150)});
 }
 return out;
}
function checked(r){if(r.error)throw new FormError('Notification storage is unavailable.',503);return r.data;}
export async function verifiedPushUser(db,authorization){
 const token=authorization?.match(/^Bearer (\S+)$/)?.[1];if(!token)throw new FormError('Sign in to enable announcements.',401);
 const {data,error}=await db.auth.getUser(token);if(error||!data?.user?.email_confirmed_at)throw new FormError('A verified account is required.',401);
 return data.user;
}
async function eligible(db,id){return checked(await db.rpc('mobile_push_is_eligible',{p_user:id}))===true;}
export async function pushEligibility(db,authorization){const user=await verifiedPushUser(db,authorization);return {eligible:await eligible(db,user.id)};}
export async function registerPushDevice(db,authorization,body){
 const user=await verifiedPushUser(db,authorization);
 const token=body?.token;if(typeof token!=='string'||! /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{10,200}\]$/.test(token))throw new FormError('Invalid device token.');
 const existing=checked(await db.from('mobile_push_devices').select('user_id').eq('token',token).maybeSingle());
 if(existing&&existing.user_id!==user.id)throw new FormError('This device registration needs club assistance.',409);
 if(body.disabled===true){checked(await db.from('mobile_push_devices').update({disabled_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('token',token).eq('user_id',user.id));return {enabled:false};}
 if(!await eligible(db,user.id))throw new FormError('The club must verify your membership or confirmed player registration before enabling announcements.',403);
 const topics=body.topics;if(body.consent_version!==PUSH_CONSENT_VERSION||!Array.isArray(topics)||!topics.length||topics.length>2||topics.some(x=>!['news','tournament'].includes(x)))throw new FormError('Choose announcement topics and give consent.');
 const row={token,user_id:user.id,topics:[...new Set(topics)],consent_version:PUSH_CONSENT_VERSION,consent_at:new Date().toISOString(),disabled_at:null,updated_at:new Date().toISOString()};
 if(existing)checked(await db.from('mobile_push_devices').update(row).eq('token',token).eq('user_id',user.id));else checked(await db.from('mobile_push_devices').insert(row));
 return {enabled:true,topics:row.topics};
}
export async function pollAnnouncements(db,feed,env,fetcher=fetch){
 if(!pushConfigured(env,db))throw new FormError('Push delivery is not configured.',503);
 const staged=checked(await db.rpc('mobile_stage_push_events',{p_events:announcementEvents(feed)}));
 const pending=checked(await db.from('mobile_push_deliveries').select('id,token,source_key').eq('status','pending').order('created_at').limit(50))||[];
 const headers={'Content-Type':'application/json',Authorization:`Bearer ${env.EXPO_ACCESS_TOKEN}`};
 const stats={...staged,accepted:0,failed:0,uncertain:0,skipped:0};
 const update=async(id,values)=>checked(await db.from('mobile_push_deliveries').update({...values,updated_at:new Date().toISOString()}).eq('id',id));
 for(const row of pending){
  const claim=checked(await db.from('mobile_push_deliveries').update({status:'claimed',updated_at:new Date().toISOString()}).eq('id',row.id).eq('status','pending').select('id'));
  if(!claim?.length)continue;
  const device=checked(await db.from('mobile_push_devices').select('user_id,topics,disabled_at').eq('token',row.token).maybeSingle());
  const source=checked(await db.from('mobile_push_sources').select('kind,slug,title').eq('source_key',row.source_key).single());
  if(!device||device.disabled_at||!device.topics.includes(source.kind)||!await eligible(db,device.user_id)){await update(row.id,{status:'skipped'});stats.skipped++;continue;}
  let ticket;
  try{
   const response=await fetcher('https://exp.host/--/api/v2/push/send',{method:'POST',headers,body:JSON.stringify({to:row.token,title:source.kind==='news'?'AKCC news update':'New AKCC tournament',body:source.title,sound:'default',channelId:'announcements',data:{kind:source.kind,slug:source.slug}}),signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw new Error('Push response unavailable');const data=await response.json();ticket=Array.isArray(data.data)?data.data[0]:data.data;if(!ticket)throw new Error('Push ticket unavailable');
  }catch{await update(row.id,{status:'uncertain',error_code:'transport_unknown'});stats.uncertain++;continue;}
  if(ticket.status==='ok'&&ticket.id){await update(row.id,{status:'accepted',ticket_id:String(ticket.id)});stats.accepted++;}
  else{const code=String(ticket.details?.error||'push_error').slice(0,100);await update(row.id,{status:'failed',error_code:code});stats.failed++;if(code==='DeviceNotRegistered')checked(await db.from('mobile_push_devices').update({disabled_at:new Date().toISOString()}).eq('token',row.token));}
 }
 // Receipts confirm handoff to APNs/FCM, not viewing by the person.
 const awaiting=checked(await db.from('mobile_push_deliveries').select('id,token,ticket_id').eq('status','accepted').limit(100))||[];
 if(awaiting.length){
  const response=await fetcher('https://exp.host/--/api/v2/push/getReceipts',{method:'POST',headers,body:JSON.stringify({ids:awaiting.map(x=>x.ticket_id)}),signal:AbortSignal.timeout(15000)});
  if(response.ok){const data=await response.json();for(const row of awaiting){const receipt=data.data?.[row.ticket_id];if(!receipt)continue;const code=String(receipt.details?.error||'push_error').slice(0,100);await update(row.id,receipt.status==='ok'?{status:'delivered'}:{status:'failed',error_code:code});if(receipt.details?.error==='DeviceNotRegistered')checked(await db.from('mobile_push_devices').update({disabled_at:new Date().toISOString()}).eq('token',row.token));}}
 }
 return stats;
}
