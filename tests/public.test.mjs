import test from 'node:test';
import assert from 'node:assert/strict';
import {parseListing,parseDetail,parsePlayers,safeLink,website,publicService} from '../server/public.mjs';
import {account} from '../server/index.mjs';
test('player DTO includes only the eight public columns',()=>{
 const rows=parsePlayers('<main><table><tbody><tr><td>1</td><td>CM</td><td>A Player</td><td>M</td><td>110033474</td><td>2043</td><td>2100</td><td>AKCC</td></tr></tbody></table></main><script>{"email":"private@example.invalid","date_of_birth":"2013-05-31","stripe_payment_intent_id":"secret"}</script>');
 assert.equal(rows.length,1);assert.deepEqual(Object.keys(rows[0]).sort(),['title','name','gender','fide_id','fide_rating','nzcf_rating','club'].sort());assert.ok(!JSON.stringify(rows).includes('private'));assert.equal(rows[0].fide_rating,2043);
});
test('public detail routes preserve open-event registration links and do not invent fees',()=>{
 const t=parseDetail('<main><article><h1>Open Rapid</h1><p>Date: 7 November</p><a href="/tournaments/open/register">Register</a><p>General/Open Event</p></article></main>','open');
 assert.equal(t.club_event,false);assert.equal(t.registration_url,'https://www.aucklandknights.co.nz/tournaments/open/register');assert.equal(t.fee,'');assert.equal(t.entries_url,null);
});
test('listing ignores site navigation and malformed links',()=>{
 const a=parseListing('<a href="/tournaments/hidden">Hidden</a><main><article><h3>Rapid</h3><a href="/tournaments/rapid">Details</a><a href="/tournaments/rapid/register">Register</a></article></main>','tournaments');assert.equal(a.length,1);assert.equal(a[0].slug,'rapid');
});
test('rejects executable links and network-relative page fetches',async()=>{
 assert.equal(safeLink('javascript:alert(1)'),null);assert.equal(safeLink('https://user:pass@example.com'),null);await assert.rejects(()=>website('//evil.invalid',()=>{throw new Error('must not fetch')}));
});
test('public player fetch is blocked if entries are disabled',async()=>{
 const reads=publicService(async()=>new Response('<main><article><h1>Private entries</h1></article></main>'));await assert.rejects(()=>reads.players('rapid'),/disabled/);
});
test('private account API fails closed without service configuration',async()=>{assert.equal((await account({headers:{}},null)).status,503);});
test('private account API requires server-verified identity',async()=>{
 assert.equal((await account({headers:{}},{})).status,401);
 const db={auth:{getUser:async()=>({data:{user:{id:'u',email_confirmed_at:null}}})}};
 assert.equal((await account({headers:{authorization:'Bearer fake'}},db)).status,401);
});
test('verified user without staff-created links sees no membership or payment data',async()=>{
 let filters=[];const chain={select(){return this},eq(k,v){filters.push([k,v]);return this},is:async()=>({data:[],error:null})};const db={auth:{getUser:async()=>({data:{user:{id:'verified-user',email_confirmed_at:'now'}}})},from:table=>{assert.equal(table,'mobile_membership_links');return chain;}};
 const r=await account({headers:{authorization:'Bearer valid'}},db);assert.deepEqual(r.body,{memberships:[],payments:[]});assert.deepEqual(filters,[['user_id','verified-user']]);
});
