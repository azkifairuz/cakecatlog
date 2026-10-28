import test from 'node:test';
import assert from 'node:assert/strict';
import { createAddressAutocomplete } from '../src/lib/address-autocomplete.js';
import { readFile } from 'node:fs/promises';
const flush = async () => { for(let i=0;i<8;i++) await Promise.resolve(); };
const deferred = () => { let resolve, reject; const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject}; };
function setup(search = async () => []) {
 const states=[],addresses=[],calls=[];const timers=new Map();let seq=0;
 const controller=createAddressAutocomplete({search:async(query,options)=>{calls.push({query,...options});return search(query,options);},onState:(s)=>states.push(s),onAddress:(s)=>addresses.push(s),setTimer:(callback,ms)=>{assert.equal(ms,300);timers.set(++seq,callback);return seq;},clearTimer:(id)=>timers.delete(id)});
 return {controller,states,addresses,calls,run:async()=>{const callbacks=[...timers.values()];timers.clear();callbacks.forEach((fn)=>fn());await flush();},timers};
}
const location = (label='Tebet Timur, Tebet, Kota Jakarta Selatan, DKI Jakarta', code='31.74.01.1001', postalCode='12820') => ({code,label,postalCode,name:label.split(',')[0],level:4});

test('three character minimum, debounce, and limit passed to backend search',async()=>{
 const h=setup();h.controller.update('te');await h.run();assert.equal(h.calls.length,0);
 h.controller.update('teb');h.controller.update('tebe');assert.equal(h.timers.size,1);await h.run();assert.equal(h.calls.length,1);assert.equal(h.calls[0].query,'tebe');assert.equal(h.calls[0].limit,5);
});
test('maps backend locations to at most five suggestions',async()=>{
 const h=setup(async()=>Array.from({length:7},(_,i)=>location('Tebet '+i,String(i))));h.controller.update('teb');await h.run();
 const items=h.states.at(-1).items;assert.equal(items.length,5);assert.deepEqual(items[0],{id:'0',text:'Tebet 0',postalCode:'12820'});
});
test('stale search responses cannot replace newer suggestions and are aborted',async()=>{
 const old=deferred(),recent=deferred();const h=setup((query)=>query==='jak'?old.promise:recent.promise);
 h.controller.update('jak');await h.run();h.controller.update('bandung');assert.equal(h.calls[0].signal.aborted,true);await h.run();
 recent.resolve([location('Bandung','bandung')]);await flush();old.resolve([location()]);await flush();assert.equal(h.states.at(-1).items[0].text,'Bandung');
});
test('select fills label with postal code and keeps suggestions closed while adding street details',async()=>{
 const h=setup(async()=>[location()]);h.controller.update('tebet');await h.run();h.controller.select(h.states.at(-1).items[0]);
 assert.deepEqual(h.addresses,['Tebet Timur, Tebet, Kota Jakarta Selatan, DKI Jakarta 12820']);assert.deepEqual(h.states.at(-1).items,[]);
 h.controller.update(h.addresses[0]+', Jl. Mawar No. 5');await h.run();assert.equal(h.calls.length,1);
 h.controller.update('kebon jeruk');await h.run();assert.equal(h.calls.length,2);
});
test('destroy on switching to pickup cancels timers and late updates',async()=>{
 const late=deferred();const h=setup(()=>late.promise);h.controller.update('jak');await h.run();const stateCount=h.states.length;h.controller.destroy();late.resolve([location()]);await flush();assert.equal(h.states.length,stateCount);assert.deepEqual(h.addresses,[]);
 const pending=setup();pending.controller.update('jak');pending.controller.destroy();await pending.run();assert.equal(pending.calls.length,0);
});
test('empty results and search failures preserve manual input',async()=>{
 const empty=setup();empty.controller.update('jak');await empty.run();assert.equal(empty.states.at(-1).error,'EMPTY');
 const error=setup(async()=>{throw new Error('backend error')});error.controller.update('jak');await error.run();assert.equal(error.states.at(-1).error,'UNAVAILABLE');assert.deepEqual(error.addresses,[]);
});
test('all customer forms bind a persistent address state only inside delivery branches',async()=>{
 for(const path of ['checkout','order-form','form/[slug]']) {
  const source=await readFile(new URL(`../src/routes/${path}/+page.svelte`,import.meta.url),'utf8');assert.match(source,/DeliveryAddressField/);assert.match(source,/bind:value=\{deliveryAddress\}/);assert.match(source,/name="address"/);assert.match(source,/delivery.*=== 'delivery'/);
 }
});
