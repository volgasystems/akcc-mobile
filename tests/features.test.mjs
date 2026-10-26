import test from 'node:test';
import assert from 'node:assert/strict';
import {formService,validateForm} from '../server/forms.mjs';
import {parseCalendar,parseResults,parseNews} from '../server/public.mjs';
const enquiry={full_name:'Test Person',email:'test@example.invalid',phone:'+64220000000',subject:'Test only',message:'Mock submission',confirmed:true};
const absence={player_first_name:'Test',player_last_name:'Player',email:'test@example.invalid',phone:'+64220000000',tournament_name:'Mock Open',round_number:'2',round_date:'2026-11-07',reason:'Mock only',confirmed:true};
test('forms require explicit confirmation, valid phone/date and plain text',()=>{
 for(const form of [{...enquiry,confirmed:false},{...enquiry,phone:'123'},{...enquiry,message:'<img src=x>'}])assert.throws(()=>validateForm('enquiry',form));
 assert.throws(()=>validateForm('absence',{...absence,round_date:'2026-02-30'}));
 assert.throws(()=>validateForm('absence',{...absence,round_number:'0'}));
});
test('only expected fields go to the existing fixed endpoint, never echoed PII',async()=>{
 let sent;const service=formService(async(url,init)=>{sent={url,payload:JSON.parse(init.body)};return Response.json({ok:true,data:{email:'secret',stripe_payment_intent_id:'private'}});});
 const result=await service('enquiry',{...enquiry,role:'admin'},'test_reference_0001');
 assert.equal(sent.url,'https://www.aucklandknights.co.nz/api/contact');assert.equal(sent.payload.role,undefined);assert.equal(sent.payload.confirmed,undefined);assert.equal(result.data,undefined);assert.ok(!JSON.stringify(result).includes('secret'));
});
test('simultaneous retries submit only once and changed payload is refused',async()=>{
 let count=0;const service=formService(async()=>{count++;await new Promise(resolve=>setTimeout(resolve,10));return Response.json({ok:true});});
 const result=await Promise.all([service('absence',absence,'test_reference_0002'),service('absence',absence,'test_reference_0002')]);
 assert.equal(count,1);assert.deepEqual(result[0],result[1]);await assert.rejects(()=>service('absence',{...absence,reason:'Changed'},'test_reference_0002'),/already been used/);
});
test('ambiguous upstream failure is retained and never automatically posted again',async()=>{
 let count=0;const service=formService(async()=>{count++;throw new Error('Connection lost after save');});
 await assert.rejects(()=>service('enquiry',enquiry,'test_reference_0003'),/may have been saved/);
 await assert.rejects(()=>service('enquiry',enquiry,'test_reference_0003'),/may have been saved/);assert.equal(count,1);
});
test('upstream email warning preserves saved status without promising delivery',async()=>{
 const service=formService(async()=>Response.json({ok:true,email_warning:'SMTP unavailable',data:{phone:'private'}}));
 const r=await service('absence',absence,'test_reference_0004');assert.equal(r.ok,true);assert.equal(r.email_status,'not_confirmed');assert.ok(r.message.includes('does not cancel'));
});
test('submission rate is capped without blocking an idempotent replay',async()=>{
 const service=formService(async()=>Response.json({ok:true}));for(let i=0;i<5;i++)await service('enquiry',enquiry,`test_rate_ref_000${i}`,'ip');
 await assert.rejects(()=>service('enquiry',enquiry,'test_rate_ref_0005','ip'),/wait a minute/);assert.equal((await service('enquiry',enquiry,'test_rate_ref_0000','ip')).ok,true);
});
test('calendar excludes draft rows, retains public year and event type',()=>{
 const markup=state=>`<main><h1>Calendar</h1><section><h2>2026 Calendar</h2><div class="grid"><div>Nov 7</div><div><a href="/tournaments/rapid">Rapid</a><span class="uppercase">${state}</span><p>Club event — active membership</p></div></div></section></main>`;
 assert.equal(parseCalendar(markup('draft')).items.length,0);const r=parseCalendar(markup('open'));assert.equal(r.items[0].title,'Rapid');assert.equal(r.items[0].club_event,true);
});
test('results preserve placings and Vega while filtering executable links',()=>{
 const rows=parseResults('<main><section><h2>2026 Results</h2><article><h3>Rapid <span>(7 Nov)</span></h3><p>1st: Test Player</p><a href="https://www.vegaresults.com/vega/123">Vega</a><a href="javascript:evil()">bad</a></article></section></main>');assert.equal(rows[0].first,'Test Player');assert.equal(rows[0].title,'Rapid');assert.equal(rows[0].links.length,1);
});
test('news returns text without scripts or private embedded payloads',()=>{
 const n=parseNews('<main><article><p>7 Nov</p><h1>Club news</h1><div><p>Public update</p><script>private_data</script></div></article></main>','news');assert.deepEqual(n.paragraphs,['Public update']);assert.ok(!JSON.stringify(n).includes('private_data'));
});
