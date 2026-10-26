import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{PGlite}from'@electric-sql/pglite';
test('proposed push SQL seeds silently, deduplicates and enforces verified opt-in audience',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
 create table public.club_memberships(id uuid primary key,membership_status text,payment_status text,membership_end_date date);
 create table public.tournament_registrations(id uuid primary key,registration_status text,payment_status text);
 `);
 await db.exec(readFileSync(new URL('../sql/PROPOSAL_member_links.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../sql/PROPOSAL_push_notifications.sql',import.meta.url),'utf8'));
 const user='00000000-0000-4000-8000-000000000001',member='00000000-0000-4000-8000-000000000002',other='00000000-0000-4000-8000-000000000003';
 await db.query('insert into auth.users values($1,now()),($2,now())',[user,other]);
 await db.query("insert into club_memberships values($1,'active','paid',current_date+30)",[member]);
 await db.query("insert into mobile_membership_links(user_id,membership_record_id,relationship,verified_by,verification_note) values($1,$2,'self',$1,'Verified in local fixture only')",[user,member]);
 for(const[token,id,topics,disabled]of[['token-eligible',user,['news'],null],['token-unlinked',other,['news'],null],['token-optout',user,['news'],new Date().toISOString()],['token-wrong-topic',user,['tournament'],null]])await db.query('insert into mobile_push_devices(token,user_id,topics,consent_version,disabled_at)values($1,$2,$3,$4,$5)',[token,id,topics,'test',disabled]);
 const stage=events=>db.query('select mobile_stage_push_events($1::jsonb) as result',[JSON.stringify(events)]);
 const event=i=>({key:`news:${i}`,kind:'news',slug:`item-${i}`,title:`Public item ${i}`});
 const first=await stage([event(1)]);assert.equal(first.rows[0].result.baseline_only,true);assert.equal((await db.query('select * from mobile_push_deliveries')).rows.length,0);
 await stage([event(1),event(2)]);let rows=(await db.query('select token from mobile_push_deliveries')).rows;assert.deepEqual(rows,[{token:'token-eligible'}]);
 await stage([event(2)]);assert.equal((await db.query('select * from mobile_push_deliveries')).rows.length,1);
 await db.query('update mobile_membership_links set revoked_at=now() where user_id=$1',[user]);await stage([event(3)]);assert.equal((await db.query('select * from mobile_push_deliveries')).rows.length,1);
 const reg='00000000-0000-4000-8000-000000000004';await db.query("insert into tournament_registrations values($1,'confirmed','paid')",[reg]);await db.query("insert into mobile_registration_links(user_id,registration_id,verified_by,verification_note)values($1,$2,$1,'Verified player in fixture only')",[other,reg]);await stage([event(4)]);rows=(await db.query('select token from mobile_push_deliveries order by created_at')).rows;assert.equal(rows[1].token,'token-unlinked');
 await db.query("update tournament_registrations set registration_status='cancelled',payment_status='refunded' where id=$1",[reg]);await stage([event(5)]);assert.equal((await db.query('select * from mobile_push_deliveries')).rows.length,2);
 const grants=await db.query("select has_table_privilege('anon','mobile_push_devices','select') as anon_read,has_table_privilege('authenticated','mobile_push_devices','insert') as user_write");assert.deepEqual(grants.rows[0],{anon_read:false,user_write:false});
 }finally{await db.close();}
});
