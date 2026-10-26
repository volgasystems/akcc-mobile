import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { publicService } from './public.mjs';
import { formService, readFormBody, FormError } from './forms.mjs';
import { membershipService } from './membership.mjs';
import { pushConfigured, pushEligibility, cronAuthorized, registerPushDevice, pollAnnouncements, PUSH_CONSENT_VERSION } from './push.mjs';
const memberships=membershipService();
const reads = publicService();
const submitForm = formService();
const db = (process.env.MOBILE_ACCOUNTS_ENABLED === 'true' || process.env.MOBILE_PUSH_ENABLED === 'true') && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false,autoRefreshToken:false}}) : null;
export async function account(req, client = db) {
  if (!client) return {status:503, body:{error:'Member accounts are not configured.'}};
  const token = req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) return {status:401,body:{error:'Sign in to continue.'}};
  const {data:auth,error:authError} = await client.auth.getUser(token);
  if (authError || !auth.user || !auth.user.email_confirmed_at) return {status:401,body:{error:'A verified account is required.'}};
  // No email matching and no implicit guardian ownership.
  const {data:links,error} = await client.from('mobile_membership_links').select('membership_record_id,relationship').eq('user_id',auth.user.id).is('revoked_at',null);
  if (error) throw new Error('Member linking is not configured');
  const ids = (links || []).map(x=>x.membership_record_id);
  if (!ids.length) return {status:200,body:{memberships:[],payments:[]}};
  const members = await client.from('club_memberships').select('id,first_name,last_name,membership_id,membership_status,membership_end_date,payment_status').in('id',ids);
  const payments = await client.from('payment_records').select('payment_type,reference_id,amount_cents,status,created_at').eq('payment_type','membership').in('reference_id',ids).order('created_at',{ascending:false});
  if (members.error || payments.error) throw new Error('Member records unavailable');
  return {status:200,body:{memberships:members.data,payments:payments.data}};
}
export const server = createServer(async (req,res) => {
  const send = (status,body) => {res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
  try {
    const url = new URL(req.url,'http://localhost');
    if(url.pathname==='/v1/push/poll'&&req.method==='POST'){
      if(!pushConfigured(process.env,db))return send(503,{error:'Push delivery is not configured.'});
      if(!cronAuthorized(req.headers.authorization,process.env.MOBILE_PUSH_CRON_SECRET))return send(401,{error:'Unauthorised'});
      return send(200,await pollAnnouncements(db,await reads.feed(),process.env));
    }
    if(url.pathname==='/v1/push/device'&&req.method==='POST'){
      if(!pushConfigured(process.env,db))return send(503,{error:'Push delivery is not configured.'});
      return send(200,await registerPushDevice(db,req.headers.authorization,await readFormBody(req)));
    }
    const membership=url.pathname.match(/^\/v1\/membership\/(join|renew|recovery)$/);
    if(membership&&req.method==='POST')return send(200,await memberships.submit(membership[1],await readFormBody(req),req.headers['idempotency-key'],req.socket.remoteAddress||'unknown'));
    if (req.method === 'POST' && ['/v1/enquiries','/v1/absences'].includes(url.pathname)) {
      if (process.env.MOBILE_FORMS_ENABLED === 'false') return send(503,{error:'Native forms are currently disabled. Use the website form.'});
      const body=await readFormBody(req);
      return send(200,await submitForm(url.pathname==='/v1/enquiries'?'enquiry':'absence',body,req.headers['idempotency-key'],req.socket.remoteAddress||'unknown'));
    }
    if(req.method !== 'GET') return send(405,{error:'Method not allowed'});
    if(url.pathname==='/v1/membership/options')return send(200,await memberships.options());
    if(url.pathname==='/v1/push/eligibility'){if(!pushConfigured(process.env,db))return send(503,{error:'Push services are not configured.'});return send(200,await pushEligibility(db,req.headers.authorization));}
    if(url.pathname==='/v1/push/config'){const enabled=pushConfigured(process.env,db);return send(200,{enabled,project_id:enabled?process.env.EXPO_PROJECT_ID:null,consent_version:PUSH_CONSENT_VERSION});}
    if (url.pathname === '/health') return send(200,{ok:true,accounts_enabled:!!db});
    if (url.pathname === '/v1/calendar') return send(200,await reads.calendar());
    if (url.pathname === '/v1/results') return send(200,await reads.results());
    const news=url.pathname.match(/^\/v1\/news\/([A-Za-z0-9_-]{1,200})$/);
    if(news) return send(200,await reads.news(news[1]));
    if (url.pathname === '/v1/feed') return send(200,await reads.feed());
    if (url.pathname === '/v1/account') {const result=await account(req);return send(result.status,result.body);}
    const m = url.pathname.match(/^\/v1\/tournaments\/([A-Za-z0-9_-]{1,150})(\/players)?$/);
    if(m) return send(200,m[2] ? await reads.players(m[1]) : await reads.detail(m[1]));
    return send(404,{error:'Not found'});
  } catch (error) {if(error instanceof FormError)return send(error.status,{error:error.message});return send(503,{error:'Club information is temporarily unavailable. Please retry or visit the website.'});}
});
// Compare file URLs so Windows backslashes and spaces work as well as POSIX paths.
export function isDirectRun(entry, moduleUrl = import.meta.url, windows = process.platform === 'win32') {
  return !!entry && pathToFileURL(entry, { windows }).href === moduleUrl;
}
if (isDirectRun(process.argv[1])) {
  server.listen(Number(process.env.PORT || 8787), '0.0.0.0', () => {
    console.log(`AKCC read API listening on port ${server.address().port}`);
  });
}
