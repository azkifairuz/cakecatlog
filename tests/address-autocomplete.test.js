import test from 'node:test';
import assert from 'node:assert/strict';
import { createAddressAutocomplete } from '../src/lib/address-autocomplete.js';
import { createGooglePlacesLoader } from '../src/lib/google-places.js';
import { readFile } from 'node:fs/promises';
const flush = async () => { for(let i=0;i<8;i++) await Promise.resolve(); };
const deferred = () => { let resolve, reject; const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject}; };
function setup(search = async () => ({suggestions:[]})) {
 const states=[],addresses=[],calls=[];let tokens=0;const timers=new Map();let seq=0;
 const places={AutocompleteSessionToken:class{constructor(){this.id=++tokens;}},AutocompleteSuggestion:{fetchAutocompleteSuggestions:async(req)=>{calls.push(req);return search(req);}}};
 const controller=createAddressAutocomplete({getPlaces:async()=>places,onState:(s)=>states.push(s),onAddress:(s)=>addresses.push(s),setTimer:(callback,ms)=>{assert.equal(ms,300);timers.set(++seq,callback);return seq;},clearTimer:(id)=>timers.delete(id)});
 return {controller,states,addresses,calls,places,run:async()=>{const callbacks=[...timers.values()];timers.clear();callbacks.forEach((fn)=>fn());await flush();},timers};
}
function prediction(text='Jakarta',id='jakarta',details=async()=>{}) {const place={formattedAddress:'Jakarta, Indonesia',fetchFields:details};return {placeId:id,text:{toString:()=>text},toPlace:()=>place};}

test('three character minimum, debounce, and Indonesia restriction',async()=>{
 const h=setup();h.controller.update('ja');await h.run();assert.equal(h.calls.length,0);
 h.controller.update('jak');h.controller.update('jaka');assert.equal(h.timers.size,1);await h.run();assert.equal(h.calls.length,1);assert.equal(h.calls[0].input,'jaka');assert.deepEqual(h.calls[0].includedRegionCodes,['id']);assert.equal(h.calls[0].language,'id');
});
test('returns at most five place suggestions and skips query-only predictions',async()=>{
 const h=setup(async()=>({suggestions:[{},...Array.from({length:7},(_,i)=>({placePrediction:prediction('Jakarta '+i,String(i))}))]}));h.controller.update('jak');await h.run();assert.equal(h.states.at(-1).items.length,5);assert.equal(h.states.at(-1).items[0].text,'Jakarta 0');
});
test('stale search responses cannot replace newer suggestions',async()=>{
 const old=deferred(),recent=deferred();const h=setup((req)=>req.input==='jak'?old.promise:recent.promise);
 h.controller.update('jak');await h.run();h.controller.update('bandung');await h.run();recent.resolve({suggestions:[{placePrediction:prediction('Bandung','bandung')}]});await flush();old.resolve({suggestions:[{placePrediction:prediction()}]});await flush();assert.equal(h.states.at(-1).items[0].text,'Bandung');
});
test('select requests only the formatted address and starts a new session for later searches',async()=>{
 const fields=[];const h=setup(async()=>({suggestions:[{placePrediction:prediction('Jakarta','jakarta',async(options)=>fields.push(options))}]}));
 h.controller.update('jak');await h.run();const token=h.calls[0].sessionToken;h.controller.update('jaka');await h.run();assert.equal(h.calls[1].sessionToken,token);
 await h.controller.select(h.states.at(-1).items[0]);assert.deepEqual(fields,[{fields:['formattedAddress']}]);assert.deepEqual(h.addresses,['Jakarta, Indonesia']);h.controller.update('bandung');await h.run();assert.notEqual(h.calls[2].sessionToken,token);
});
test('typing during place selection preserves manual text instead of applying late details',async()=>{
 const details=deferred();const h=setup(async()=>({suggestions:[{placePrediction:prediction('Jakarta','jakarta',()=>details.promise)}]}));h.controller.update('jak');await h.run();const selecting=h.controller.select(h.states.at(-1).items[0]);h.controller.update('alamat manual nomor 12');details.resolve();await selecting;assert.deepEqual(h.addresses,[]);
});
test('destroy on switching to pickup cancels timers and late updates',async()=>{
 const late=deferred();const h=setup(()=>late.promise);h.controller.update('jak');await h.run();const stateCount=h.states.length;h.controller.destroy();late.resolve({suggestions:[{placePrediction:prediction()}]});await flush();assert.equal(h.states.length,stateCount);assert.deepEqual(h.addresses,[]);
 const pending=setup();pending.controller.update('jak');pending.controller.destroy();await pending.run();assert.equal(pending.calls.length,0);
});
test('missing key, empty results, search failures, and detail failures preserve manual input',async()=>{
 let last;const c=createAddressAutocomplete({getPlaces:async()=>{throw new Error('MAPS_NOT_CONFIGURED')},onState:(s)=>last=s,onAddress:()=>assert.fail(),debounceMs:0});c.update('jak');await new Promise((r)=>setTimeout(r,5));assert.equal(last.error,'MANUAL');c.destroy();
 const empty=setup();empty.controller.update('jak');await empty.run();assert.equal(empty.states.at(-1).error,'EMPTY');
 const error=setup(async()=>{throw new Error('provider error')});error.controller.update('jak');await error.run();assert.equal(error.states.at(-1).error,'UNAVAILABLE');
 const detail=setup(async()=>({suggestions:[{placePrediction:prediction('Jakarta','jakarta',async()=>{throw new Error('failed')})}]}));detail.controller.update('jak');await detail.run();await detail.controller.select(detail.states.at(-1).items[0]);assert.deepEqual(detail.addresses,[]);assert.equal(detail.states.at(-1).error,'UNAVAILABLE');
});
test('loader reuses existing Places library and does not load a script without a key',async()=>{
 let imports=0;const places={};const load=createGooglePlacesLoader({google:{maps:{importLibrary:async(name)=>{assert.equal(name,'places');imports++;return places;}}}},{createElement:()=>assert.fail('no script expected')});
 await assert.rejects(load(''),/MAPS_NOT_CONFIGURED/);const [a,b]=await Promise.all([load('key'),load('key')]);assert.equal(a,places);assert.equal(b,places);assert.equal(imports,1);
});
test('lazy loader injects one script for concurrent searches and handles network failure',async()=>{
 const win={};let count=0;const places={};const doc={createElement:()=>({remove(){}}),head:{appendChild(script){count++;queueMicrotask(()=>{win.google={maps:{importLibrary:async()=>places}};win[new URL(script.src).searchParams.get('callback')]();});}}};
 const load=createGooglePlacesLoader(win,doc);await Promise.all([load('key'),load('key')]);assert.equal(count,1);
 const failing=createGooglePlacesLoader({},{createElement:()=>({remove(){}}),head:{appendChild(script){queueMicrotask(()=>script.onerror());}}});await assert.rejects(failing('key'),/MAPS_LOAD_FAILED/);
});
test('all customer forms bind a persistent address state only inside delivery branches',async()=>{
 for(const path of ['checkout','order-form','form/[slug]']) {
  const source=await readFile(new URL(`../src/routes/${path}/+page.svelte`,import.meta.url),'utf8');assert.match(source,/DeliveryAddressField/);assert.match(source,/bind:value=\{deliveryAddress\}/);assert.match(source,/name="address"/);assert.match(source,/delivery.*=== 'delivery'/);
 }
});
