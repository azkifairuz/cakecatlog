import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const dataUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const api = dataUrl(`export async function submitCheckoutOrder(payload) { globalThis.__priceCalls.push(payload); return globalThis.__priceOrder; }
export const submitSingleProductOrder=submitCheckoutOrder;
export const getOrderFormData=()=>({}); export const getCustomOrderFormData=()=>({});`);
const dependencies = {
 '$lib/cart-pricing.js': new URL('../src/lib/cart-pricing.js', import.meta.url).href,
 '$lib/cart-variants.js': new URL('../src/lib/cart-variants.js', import.meta.url).href,
 '$lib/price-notice.js': new URL('../src/lib/price-notice.js', import.meta.url).href,
 '$lib/phone-number.js': new URL('../src/lib/phone-number.js', import.meta.url).href,
 '$lib/i18n.svelte.js': dataUrl('export const normalizeLocale = value => value === "en" ? "en" : "id"; export const translate = (_, key) => key;'),
 '$lib/api/public.js': api,
 '$lib/api/upload.js': dataUrl('export const uploadReferenceImage = () => { throw Error("unexpected upload"); };'),
 '$lib/api/adapters.js': dataUrl('export const adaptProducts = x => x;'),
 '$lib/site-info.js': dataUrl('export const normalizeSiteInfo = x => x;'),
 '@sveltejs/kit': dataUrl('export const fail=(status,data)=>({status,data}); export const error=(status,message)=>Object.assign(Error(message),{status});')
};
async function server(name) {
 const source = await readFile(new URL(`../src/routes/${name}/+page.server.js`, import.meta.url), 'utf8');
 return import(dataUrl(source.replace(/from '([^']+)'/g, (_, path) => {
  assert.ok(dependencies[path], `Unmapped dependency: ${path}`); return `from '${dependencies[path]}'`;
 })));
}
const checkout = await server('checkout');
const direct = await server('order-form');
const custom = await server('form/[slug]');
const warning = { code: 'PRICE_UPDATED', previousTotal: 100000, newTotal: 115000 };
function event() {
 const form = new FormData();
 for (const [name,value] of Object.entries({ customer_name:'Customer',phone_number:'081511111111',phone_country:'ID',email:'test@example.com',delivery_option:'pickup',delivery_date:'2028-12-01',delivery_time:'09:00',product_id:'cake',product_variant_id:'size',quantity:'1',locale:'en',total_price:'100000',expected_total:'100000',cart_items:JSON.stringify([{cartItemId:'item',product_id:'cake',product_variant_id:'size',quantity:1}]),customized_options:JSON.stringify({size:{variant_id:'size'},addons:[]}) })) form.set(name,value);
 const calls=[];
 return { request:new Request('http://localhost/checkout',{method:'POST',body:form}),params:{slug:'birthday'},cookies:{set(...args){calls.push(args);}},calls };
}
for (const [name,action] of [['cart',checkout.actions.checkout],['direct',direct.actions.order],['custom',custom.actions.order]]) {
 test(`${name} action keeps a changed-price order successful, passes expected total and saves receipt notice once`, async()=>{
  globalThis.__priceCalls=[]; globalThis.__priceOrder={id:'order-1',pricingWarning:warning};
  const e=event(); const result=await action(e);
  assert.equal(result.success,true); assert.equal(result.orderId,'order-1');
  assert.equal(globalThis.__priceCalls.length,1);
  assert.equal(globalThis.__priceCalls[0].expectedTotal,100000);
  assert.deepEqual(result.pricingWarning,warning);
  assert.equal(e.calls.length,1);
  const notice=JSON.parse(e.calls[0][1]); assert.equal(notice.orderId,'order-1'); assert.equal(notice.locale,'en');
 });
}
test('an already created order remains successful if notice storage fails',async()=>{
 globalThis.__priceCalls=[]; globalThis.__priceOrder={id:'order-1',pricingWarning:warning};
 const e=event();e.cookies.set=()=>{throw Error('blocked cookie');};
 assert.equal((await checkout.actions.checkout(e)).success,true);
 assert.equal(globalThis.__priceCalls.length,1);
});
