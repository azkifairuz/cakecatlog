import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { hasAdminPermission } from '../src/lib/admin-access.js';
import { visibleAdminMenus } from '../src/lib/admin-menu.js';
const url = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const key = `features_${Date.now()}`;
const state = { calls: [], errors: {}, results: {}, auth: [] }; globalThis[key] = state;
const kit = url(`export const fail=(status,data)=>({status,data}); export const error=(status,message)=>{throw {status,message}}; export const redirect=(status,location)=>{throw {status,location}};`);
const auth = url(`export function handleAdminAuthError(err){ const s=globalThis[${JSON.stringify(key)}]; s.auth.push(err); if(err.status===401) throw {status:303,location:'/admin/login'}; }`);
const accessSource = await readFile(new URL('../src/lib/server/admin-access.js', import.meta.url),'utf8');
const access = url(accessSource.replace("'@sveltejs/kit'", `'${kit}'`).replace("'$lib/admin-access.js'", `'${new URL('../src/lib/admin-access.js',import.meta.url).href}'`));
const apiNames = ['getPaymentAccounts','createPaymentAccount','updatePaymentAccount','deletePaymentAccount','changePassword','requestForgotPassword','getThermalInvoice','getOrderInvoice'];
function stubApi(names) { return url(names.map((name)=>`export async function ${name}(...args){ const s=globalThis[${JSON.stringify(key)}]; s.calls.push([${JSON.stringify(name)},...args]); if(s.errors[${JSON.stringify(name)}]) throw s.errors[${JSON.stringify(name)}]; return s.results[${JSON.stringify(name)}] ?? []; }`).join('\n')); }
const common = {'@sveltejs/kit':kit,'$lib/server/admin-access.js':access,'$lib/api/auth.js':auth};
async function server(path, extra={}) {
 const source = await readFile(new URL(`../src/${path}`,import.meta.url),'utf8');
 const dependencies = {...common,...extra};
 return import(url(source.replace(/from '([^']+)'/g,(_,path)=>{ assert.ok(dependencies[path],`Unmapped ${path}`);return `from '${dependencies[path]}'`; })));
}
const bank = await server('routes/admin/dashboard/rekening-pembayaran/+page.server.js', {'$lib/api/payment-accounts.js':stubApi(apiNames)});
const account = await server('routes/admin/dashboard/account/+page.server.js', {'$lib/api/account.js':stubApi(apiNames)});
const forgot = await server('routes/admin/forgot-password/+page.server.js', {'$lib/api/account.js':stubApi(apiNames)});
const pdf = await server('routes/admin/dashboard/orders/[id]/invoice/pdf/+server.js', {'$lib/api/order-print.js':stubApi(apiNames)});
const id='00000000-0000-4000-8000-000000000001';
function event(values={}, permissions=['order.write','order.read']) {
 state.calls=[];state.results={};state.errors={};state.auth=[];
 const form = new FormData();for(const [key,value] of Object.entries(values)) form.set(key,value);
 const headers={};return {locals:{adminToken:'session-token',adminUser:{username:'Admin',role:'admin',permissions}},params:{id},url:new URL('http://localhost/admin/dashboard'),fetch:()=>{},cookies:{},setHeaders:(values)=>Object.assign(headers,values),headers,request:new Request('http://localhost',{method:'POST',body:form})};
}

test('bank and account menus are visible to authorized users and preserve restrictions',()=>{
 const restricted={role:'admin',permissions:['order.read'],menus:[{name:'Orders',url:'/admin/orders'}]};
 assert.ok(visibleAdminMenus(restricted).some((menu)=>menu.url==='/admin/dashboard/account'));
 assert.ok(!visibleAdminMenus(restricted).some((menu)=>menu.url==='/admin/dashboard/rekening-pembayaran'));
 assert.ok(visibleAdminMenus({...restricted,permissions:['order.write']}).some((menu)=>menu.url==='/admin/dashboard/rekening-pembayaran'));
 assert.equal(hasAdminPermission({role:'super_admin'},'order.write'),true);
});
test('bank load distinguishes empty data from outage; denied users cannot access API',async()=>{
 const input=event();assert.deepEqual(await bank.load(input),{accounts:[],loadError:null});assert.equal(input.headers['cache-control'],'private, no-store');
 state.errors.getPaymentAccounts={status:503,message:'Unavailable'};assert.equal((await bank.load(input)).loadError,'Unavailable');
 const denied=event({},['order.read']);await assert.rejects(bank.load(denied),(err)=>err.status===403);assert.equal(state.calls.length,0);
});
test('bank create and update preserve account numbers as strings including leading zeros',async()=>{
 let input=event({name:'BCA',norek:'001234'});assert.equal((await bank.actions.create(input)).success,true);assert.deepEqual(state.calls[0],['createPaymentAccount',{name:'BCA',norek:'001234'},'session-token',input.fetch]);
 input=event({id,name:'Mandiri',norek:'000222'});assert.equal((await bank.actions.update(input)).success,true);assert.equal(state.calls[0][2].norek,'000222');
});
test('bank validates input, preserves failures and requires delete confirmation',async()=>{
 let input=event({name:'BCA',norek:''});assert.equal((await bank.actions.create(input)).status,422);assert.equal(state.calls.length,0);
 input=event({id});assert.equal((await bank.actions.delete(input)).status,422);assert.equal(state.calls.length,0);
 input=event({id,confirm:'on'});assert.equal((await bank.actions.delete(input)).success,true);assert.equal(state.calls[0][0],'deletePaymentAccount');
 input=event({name:'BCA',norek:'001'});state.errors.createPaymentAccount={status:422,message:'Failed'};const result=await bank.actions.create(input);assert.equal(result.data.values.norek,'001');assert.equal(result.status,422);
});
test('thermal proxy streams a valid PDF without exposing session credentials in URLs',async()=>{
 const input=event();state.results.getThermalInvoice=new Response('%PDF-1.4',{headers:{'content-type':'application/pdf','content-disposition':'inline; filename="test.pdf"'}});
 const response=await pdf.GET(input);assert.equal(await response.text(),'%PDF-1.4');assert.equal(response.headers.get('cache-control'),'private, no-store');assert.deepEqual(state.calls[0],['getThermalInvoice',id,'session-token',input.fetch]);
});
test('thermal proxy rejects denied sessions, provider failures and non-PDF responses',async()=>{
 let input=event({},['order.write']);await assert.rejects(pdf.GET(input),(err)=>err.status===403);assert.equal(state.calls.length,0);
 input=event();state.errors.getThermalInvoice={status:404};await assert.rejects(pdf.GET(input),(err)=>err.status===404);
 input=event();state.results.getThermalInvoice=Response.json({});await assert.rejects(pdf.GET(input),(err)=>err.status===502);
 input=event();state.errors.getThermalInvoice={status:401};await assert.rejects(pdf.GET(input),(err)=>err.status===303);
});
test('password validation and wrong current password never invalidate the admin session',async()=>{
 let input=event({currentPassword:'old',newPassword:'password123',confirmPassword:'different'});assert.equal((await account.actions.save(input)).status,422);assert.equal(state.calls.length,0);
 input=event({currentPassword:' wrong ',newPassword:'new-password',confirmPassword:'new-password'});state.errors.changePassword={status:401,message:'Password saat ini salah'};const result=await account.actions.save(input);assert.equal(result.status,401);assert.equal(state.auth.length,0);assert.ok(!JSON.stringify(result).includes('new-password'));
});
test('password success preserves spaces and describes key revocation; expired sessions redirect',async()=>{
 let input=event({currentPassword:' old ',newPassword:' new-password ',confirmPassword:' new-password '});const result=await account.actions.save(input);assert.equal(result.success,true);assert.match(result.message,/API key/);assert.equal(state.calls[0][1].newPassword,' new-password ');
 input=event({currentPassword:'old',newPassword:'new-password',confirmPassword:'new-password'});state.errors.changePassword={status:401,message:'Token tidak valid'};await assert.rejects(account.actions.save(input),(err)=>err.status===303);
});
test('forgot password is generic and handles validation, rate limiting and outages',async()=>{
 let input=event({identifier:''});assert.equal((await forgot.actions.default(input)).status,422);assert.equal(state.calls.length,0);
 input=event({identifier:'missing-user'});assert.match((await forgot.actions.default(input)).message,/Jika akun ditemukan/);
 input=event({identifier:'Admin'});state.errors.requestForgotPassword={status:429};assert.equal((await forgot.actions.default(input)).status,429);
});

// Exercise the existing server actions with API mocks, keeping adapters and filters real.
async function oldServer(path, extras={}) {
 const source=await readFile(new URL(`../src/${path}`,import.meta.url),'utf8');
 const names=(source.match(/import\s*\{([^}]+)\}\s*from '\$lib\/api\/admin.js'/)?.[1]||'').split(',').map((name)=>name.trim()).filter(Boolean);
 return server(path,{'$lib/api/admin.js':stubApi(names),'$lib/api/upload.js':stubApi(['uploadBanner']),'$lib/api/adapters.js':new URL('../src/lib/api/adapters.js',import.meta.url).href,'$lib/server/admin-orders.js':new URL('../src/lib/server/admin-orders.js',import.meta.url).href,'$lib/analytics.js':new URL('../src/lib/analytics.js',import.meta.url).href,'$lib/server/delivery-proof-action.js':url('export function uploadDeliveryProofAction() {}'),...extras});
}
const categories=await oldServer('routes/admin/dashboard/categories/+page.server.js');
const banners=await oldServer('routes/admin/dashboard/banners/+page.server.js');
const orders=await oldServer('routes/admin/dashboard/orders/+page.server.js');
const dashboard=await oldServer('routes/admin/dashboard/+page.server.js');
test('category update retains explicit slug and preserves conflicting values',async()=>{
 let input=event({id,name:'New Name',slug:'old-slug'});assert.equal((await categories.actions.updateCategory(input)).success,true);assert.deepEqual(state.calls[0][2],{name:'New Name',slug:'old-slug'});
 input=event({id,name:'New Name',slug:'old-slug'});state.errors.updateAdminCategory={status:409,message:'Conflict'};const result=await categories.actions.updateCategory(input);assert.equal(result.status,409);assert.equal(result.data.values.slug,'old-slug');
});
test('banner replacement updates the image without modifying order or active state',async()=>{
 const input=event({id,image:new File(['image'],'new.png',{type:'image/png'})});state.results.uploadBanner={publicUrl:'https://test/new.png'};
 assert.equal((await banners.actions.replaceImage(input)).success,true);assert.deepEqual(state.calls[1][2],{imageUrl:'https://test/new.png'});
});
test('receipt deletion requires confirmation and confirmation email forwards the order',async()=>{
 let input=event({id});assert.equal((await orders.actions.deleteReceipt(input)).status,422);assert.equal(state.calls.length,0);
 input=event({id,confirm:'on'});assert.equal((await orders.actions.deleteReceipt(input)).success,true);assert.equal(state.calls[0][0],'deleteAdminOrderReceipt');
 input=event({id});assert.equal((await orders.actions.resendConfirmation(input)).success,true);assert.equal(state.calls[0][0],'sendAdminOrderConfirmationEmail');
});
test('delivery analytics shares dashboard filters and has isolated failure feedback',async()=>{
 let input=event();input.url=new URL('http://localhost/admin/dashboard?start=2026-10-01&end=2026-10-15&date_type=created_at');
 state.results.getAdminDashboard={summary:{}};state.results.getAdminDeliveryBreakdown={pickupCount:2,deliveryCount:3};
 const result=await dashboard.load(input);assert.equal(result.deliveryData.pickupCount,2);
 const call=state.calls.find((call)=>call[0]==='getAdminDeliveryBreakdown');assert.deepEqual(call[1],{startDate:'2026-10-01',endDate:'2026-10-15',dateFilterType:'created_at'});
 state.errors.getAdminDeliveryBreakdown={status:503};assert.ok((await dashboard.load(input)).deliveryData.error);
});
const hooks = await server('hooks.server.js', { '$lib/api/auth.js': url('export async function getAdminMe() { return {}; } export function isAuthError(err) { return err.status === 401; }') });
test('forgot password is reachable without authentication while dashboard stays protected',async()=>{
 const context={ url:new URL('http://localhost/admin/forgot-password'), locals:{}, cookies:{get:()=>null}, request:new Request('http://localhost/admin/forgot-password') };
 assert.equal((await hooks.handle({event:context,resolve:async()=>new Response('form')})).status,200);
 context.url=new URL('http://localhost/admin/dashboard');
 await assert.rejects(hooks.handle({event:context,resolve:async()=>new Response('dashboard')}),(err)=>err.status===303);
});
