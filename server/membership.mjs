import {load} from 'cheerio';
import {createHash} from 'node:crypto';
import {ORIGIN,website} from './public.mjs';
import {FormError} from './forms.mjs';
export function parseMembership(html){
 const $=load(html),chunks=[];
 $('script').each((_,el)=>{const t=$(el).text().trim();const m=t.match(/^self\.__next_f\.push\((\[.*\])\);?$/s);if(m){try{const row=JSON.parse(m[1]);if(row[0]===1&&typeof row[1]==='string')chunks.push(row[1]);}catch{}}});
 const candidates=[];
 function walk(value){if(!value||typeof value!=='object')return;for(const [k,v]of Object.entries(value)){if(['options','optionsFromDb'].includes(k)&&Array.isArray(v)&&v.length&&v.every(x=>x&&typeof x.key==='string'&&typeof x.name==='string'&&Number.isSafeInteger(x.fee_cents)&&x.fee_cents>0))candidates.push(v);else walk(v);}}
 for(const line of chunks.join('').split('\n')){const m=line.match(/^[a-f\d]+:(.*)$/s);if(m)try{walk(JSON.parse(m[1]));}catch{}}
 if(!candidates.length)throw new Error('Membership options are unavailable.');
 const options=candidates[0].map(x=>({key:x.key,name:x.name,fee_cents:x.fee_cents,description:String(x.description||''),joining_period:String(x.joining_period||'')}));
 const heading=$('h3').filter((_,x)=>$(x).text().trim()==='Terms & Conditions').first();
 const terms=heading.parent().find('li').map((_,li)=>$(li).text().trim()).get();
 if(!terms.length)throw new Error('Membership terms are unavailable.');
 const terms_snapshot=terms.join('\n');
 return {options,terms,terms_snapshot,terms_version:createHash('sha256').update(terms_snapshot).digest('hex'),writes_enabled:process.env.MOBILE_MEMBERSHIP_WRITES_ENABLED==='true'};
}
const fields=['first_name','last_name','date_of_birth','gender','email','phone','parent_guardian_first_name','parent_guardian_last_name','parent_guardian_phone','school','street_address','suburb','city','postcode','fide_id','nzcf_id'];
export function validateMembership(kind,input,current,now=new Date()){
 if(!input||typeof input!=='object'||input.terms_accepted!==true||input.terms_version!==current.terms_version)throw new FormError('Review and accept the current membership terms.');
 const option=current.options.find(x=>x.key===input.option_key);if(!option)throw new FormError('Select a current membership option.');
 if(kind==='renew'){
   let token=String(input.member_token||'').trim();
   if(token.startsWith('https://')){let u;try{u=new URL(token);}catch{throw new FormError('Invalid renewal link.');}if(u.origin!==ORIGIN||u.pathname!=='/join')throw new FormError('Use the secure renewal link sent by AKCC.');token=u.searchParams.get('member_token')||'';}
   if(!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)||token.length>2000)throw new FormError('Paste your secure renewal link from the club email.');
   return {member_token:token,option_key:option.key,terms_accepted:true};
 }
 const result={};for(const key of fields){if(input[key]!=null&&typeof input[key]!=='string')throw new FormError('Invalid member details.');const value=String(input[key]||'').trim();if(value.length>200||/[<>\u0000]/.test(value))throw new FormError('Use plain text of at most 200 characters per field.');result[key]=value;}
 for(const key of ['first_name','last_name','date_of_birth','gender','email','phone','street_address','suburb','city','postcode'])if(!result[key])throw new FormError(`${key.replaceAll('_',' ')} is required.`);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(result.date_of_birth)||!Number.isFinite(Date.parse(result.date_of_birth))||new Date(result.date_of_birth).toISOString().slice(0,10)!==result.date_of_birth)throw new FormError('Enter a valid date of birth (YYYY-MM-DD).');
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Auckland'}).format(now);if(result.date_of_birth>today)throw new FormError('Date of birth cannot be in the future.');
 if(!['Male','Female','Non-binary','Prefer not to say','Other'].includes(result.gender))throw new FormError('Select gender.');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email))throw new FormError('Enter a valid email.');result.email=result.email.toLowerCase();
 if(result.phone.replace(/\D/g,'').length<7||!/^[+\d() .-]{7,30}$/.test(result.phone))throw new FormError('Enter a valid phone number.');
 const birth=new Date(`${result.date_of_birth}T00:00:00Z`);const age=Number(today.slice(0,4))-birth.getUTCFullYear()-(today.slice(5)<result.date_of_birth.slice(5)?1:0);
 if(age<18&&(!result.parent_guardian_first_name||!result.parent_guardian_last_name||result.parent_guardian_phone.replace(/\D/g,'').length<7))throw new FormError('Parent/guardian name and phone are required for a child.');
 const method=input.payment_method;if(!['stripe','bank_transfer'].includes(method))throw new FormError('Select a payment method.');
 return {...result,items:[{key:option.key,quantity:1}],terms_accepted:true,payment_method:method};
}
export function membershipService(fetcher=fetch,env=process.env){
 const outcomes=new Map();const limits=new Map();
 const options=async()=>parseMembership(await website('/join',fetcher));
 return {options,async submit(kind,input,key,ip='local'){
   if(env.MOBILE_MEMBERSHIP_WRITES_ENABLED!=='true')throw new FormError('Native membership submission is awaiting backend validation. No membership or payment was created.',503);
   if(!/^[A-Za-z0-9_-]{16,100}$/.test(String(key||'')))throw new FormError('A submission reference is required.');
   const current=await options();let payload;
   if(kind==='recovery'){
     const email=String(input.email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw new FormError('Enter your registered email.');payload={email};
   }else payload=validateMembership(kind,input,current);
   if(kind==='join'&&payload.payment_method==='stripe'&&env.MOBILE_MEMBERSHIP_CARD_ENABLED!=='true')throw new FormError('Card joins await duplicate-payment validation. Bank transfer can be enabled separately.',503);
   const now=Date.now();for(const [k,v]of outcomes)if(v.expires<now)outcomes.delete(k);for(const[k,v]of limits)if(v.until<now)limits.delete(k);
   const hash=createHash('sha256').update(JSON.stringify({kind,payload})).digest('hex');
   const old=outcomes.get(key);if(old){if(old.hash!==hash)throw new FormError('This submission reference was already used.',409);return old.promise;}
   // Different button references for the same payload reuse the previous outcome.
   const prior=[...outcomes.values()].find(x=>x.hash===hash);if(prior)return prior.promise;
   const bucket=limits.get(ip)||{count:0,until:now+60000};if(bucket.count>=5||outcomes.size>=5000||limits.size>=5000&&!limits.has(ip))throw new FormError('Please wait before submitting again.',429);bucket.count++;limits.set(ip,bucket);
   const promise=(async()=>{
     let response,data;try{response=await fetcher(`${ORIGIN}/api/membership/${kind==='join'?'checkout':kind==='renew'?'renew':'recovery'}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),redirect:'error',signal:AbortSignal.timeout(20000)});data=await response.json();}catch{throw new FormError('Receipt is uncertain. Do not register or pay again; contact the club.',502);}
     if(!response.ok)throw new FormError(response.status>=500?'Membership outcome is uncertain. Contact the club before trying again.':String(data.error||'Membership needs club assistance.'),response.status);
     if(kind==='recovery')return {message:'If matching memberships exist, a secure renewal link will be emailed to their registered address.',status:'requested'};
     if(data.url){const u=new URL(data.url);if(u.protocol!=='https:'||u.hostname!=='checkout.stripe.com'||u.username||u.password)throw new FormError('Checkout needs club assistance. Do not submit again.',502);return {url:u.href,status:'pending_payment'};}
     if(kind==='join'&&data.bank_transfer){const b=data.bank_transfer;if(!Number.isSafeInteger(b.amount_cents)||b.amount_cents<=0||!['account_name','account_number','reference'].every(k=>typeof b[k]==='string'))throw new FormError('Bank instructions need club assistance.',502);return {status:'pending_payment',bank_transfer:{account_name:b.account_name,account_number:b.account_number,reference:b.reference,amount_cents:b.amount_cents}};}
     throw new FormError('Membership outcome is uncertain. Do not submit again; contact the club.',502);
   })();outcomes.set(key,{hash,promise,expires:now+86400000});return promise;
 }};
}
