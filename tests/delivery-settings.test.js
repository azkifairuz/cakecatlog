import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getDeliveryMaxTime, normalizeSiteInfo, deliveryTimeHint } from '../src/lib/site-info.js';

test('delivery cutoff reads both API naming formats, preserves existing store fields and defaults safely',()=>{
 assert.equal(getDeliveryMaxTime({deliveryMaxTime:'20:30'}),'20:30');
 assert.equal(getDeliveryMaxTime({delivery_max_time:'17:45'}),'17:45');
 for(const value of [null,{}, {deliveryMaxTime:'24:00'}, {deliveryMaxTime:''}]) assert.equal(getDeliveryMaxTime(value),'18:00');
 const info=normalizeSiteInfo({pickupDays:'Every day',pickupStoreHours:'09–20',whatsappNumber:'6281234',deliveryMaxTime:'21:00'});
 assert.equal(info.delivery_max_time,'21:00');assert.equal(info.pickup_days,'Every day');assert.equal(info.pickup_store_hours,'09–20');assert.equal(info.whatsapp_number,'6281234');
 assert.match(deliveryTimeHint('20:30','id'),/20:30 WIB/);assert.match(deliveryTimeHint('20:30','en'),/Latest delivery time/);
});
const dataUrl=text=>'data:text/javascript;base64,'+Buffer.from(text).toString('base64');
const api=dataUrl('export const getAdminSiteInfo=async()=>({pickupDays:"Every day",address:"Jakarta",whatsappNumber:"6281234",deliveryMaxTime:"20:00"}); export const updateAdminSiteInfo=async(payload)=>{globalThis.deliverySettingsPayload=payload;return payload;};');
const dependencies={
 '@sveltejs/kit':dataUrl('export const fail=(status,data)=>({status,data});'),
 '$lib/site-info.js':new URL('../src/lib/site-info.js',import.meta.url).href,
 '$lib/api/admin.js':api,
 '$lib/api/auth.js':dataUrl('export const handleAdminAuthError=()=>{};')
};
const source=await readFile(new URL('../src/routes/admin/dashboard/site-info/+page.server.js',import.meta.url),'utf8');
const {actions,load}=await import(dataUrl(source.replace(/from '([^']+)'/g,(_,path)=>{assert.ok(dependencies[path],path);return "from '"+dependencies[path]+"'";})));
function event(value){
 const form=new FormData();for(const [key,val]of Object.entries({pickup_days:'Every day',address:'Jakarta',whatsapp_number:'6281234'}))form.set(key,val);
 if(value!==undefined)form.set('delivery_max_time',value);
 globalThis.deliverySettingsPayload=null;
 return {request:new Request('http://localhost/admin/dashboard/site-info',{method:'POST',body:form}),locals:{adminToken:'test'},cookies:{},fetch:()=>{throw Error('Unexpected network');}};
}
test('settings form loads and saves the configured delivery cutoff',async()=>{
 assert.equal((await load({locals:{},cookies:{}})).siteInfo.delivery_max_time,'20:00');
 assert.equal((await actions.saveSiteInfo(event('19:45'))).success,true);
 assert.equal(globalThis.deliverySettingsPayload.deliveryMaxTime,'19:45');
});
test('invalid cutoff preserves form values and never sends an API update',async()=>{
 const result=await actions.saveSiteInfo(event('25:00'));
 assert.equal(result.status,400);assert.equal(result.data.values.delivery_max_time,'25:00');
 assert.match(result.data.error,/HH:mm/);assert.equal(globalThis.deliverySettingsPayload,null);
});
test('older forms omit the new field rather than resetting the configured cutoff',async()=>{
 assert.equal((await actions.saveSiteInfo(event(undefined))).success,true);
 assert.equal(Object.hasOwn(globalThis.deliverySettingsPayload,'deliveryMaxTime'),false);
});
