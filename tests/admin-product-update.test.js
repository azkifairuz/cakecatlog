import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { serializeProductVariantInputs } from '../src/lib/product-variants.js';
const dataUrl = text => 'data:text/javascript;base64,' + Buffer.from(text).toString('base64');
const names = ['getAdminProducts','getAdminCategories','getAdminAddons','createAdminCategory','createAdminProduct','updateAdminProduct','deleteAdminProduct','setAdminProductAvailability','uploadAdminProductImages','setAdminPrimaryProductImage','deleteAdminProductImage','syncAdminProductVariants','syncAdminProductAddons'];
const api = dataUrl(names.map(name => 'export async function '+name+'(...args) { globalThis.productEditCalls.push({name:'+JSON.stringify(name)+',args}); if (globalThis.productEditFailure?.name === '+JSON.stringify(name)+') throw globalThis.productEditFailure.error; return {id:"product"}; }').join('\n'));
const dependencies = {
 '$lib/pricing.js': new URL('../src/lib/pricing.js', import.meta.url).href,
 '$lib/product-validation.js': new URL('../src/lib/product-validation.js', import.meta.url).href,
 '$lib/product-variants.js': new URL('../src/lib/product-variants.js', import.meta.url).href,
 '$lib/api/admin.js': api,
 '$lib/api/upload.js': dataUrl('export const uploadProductImage = () => {throw Error("Unexpected upload")};'),
 '$lib/api/adapters.js': dataUrl('export const adaptProducts = value => value; export const adaptAddons = value => value;'),
 '$lib/api/auth.js': dataUrl('export const handleAdminAuthError = () => {};'),
 '@sveltejs/kit': dataUrl('export const fail = (status,data) => ({status,data});')
};
const source = await readFile(new URL('../src/routes/admin/dashboard/products/+page.server.js',import.meta.url),'utf8');
const {actions} = await import(dataUrl(source.replace(/from '([^']+)'/g,(_,path)=>{assert.ok(dependencies[path],path);return "from '"+dependencies[path]+"'";})));
function event(variants) {
 const form = new FormData();
 for(const [name,value] of Object.entries({id:'product',name:'Royal Bow',base_price:'900000',is_available:'on',product_variants:JSON.stringify(variants),product_addons:'[]',new_addons:'[]',primary_image_key:'existing:image'})) form.set(name,value);
 globalThis.productEditCalls=[];globalThis.productEditFailure=null;
 return {request:new Request('http://localhost/admin/dashboard/products',{method:'POST',body:form}),locals:{adminToken:'test'},cookies:{},fetch:()=>{throw Error('Unexpected network')}};
}
test('variant serialization retains existing IDs and omits missing IDs for new rows',()=>{
 const result=serializeProductVariantInputs([{id:'saved',name:'16 cm',price:'900000'},{id:null,name:'18 cm',price:'1700000',is_active:false}]);
 assert.equal(result[0].id,'saved');assert.equal(Object.hasOwn(result[1],'id'),false);assert.equal(result[1].isActive,false);
 assert.equal(JSON.stringify(result).includes('"id":null'),false);
});
test('actual update action sends one atomic update, preserves IDs and avoids duplicate variant/addon sync',async()=>{
 const e=event([{id:'saved',name:'16 cm',price:'900000'},{id:null,name:'18 cm',price:'1700000'}]);
 assert.deepEqual(await actions.updateProduct(e),{success:true});
 assert.deepEqual(globalThis.productEditCalls.map(call=>call.name),['updateAdminProduct','setAdminPrimaryProductImage']);
 const payload=globalThis.productEditCalls[0].args[1];
 assert.equal(payload.variants[0].id,'saved');assert.equal(Object.hasOwn(payload.variants[1],'id'),false);
 assert.equal(payload.variants[0].price,900000);assert.equal(payload.variants[1].price,1700000);
});
test('validation errors retain their status and helpful message',async()=>{
 const e=event([{id:'saved',name:'16 cm',price:'900000'}]);
 globalThis.productEditFailure={name:'updateAdminProduct',error:Object.assign(Error('ID ukuran tidak ditemukan pada produk ini.'),{status:422})};
 const result=await actions.updateProduct(e);
 assert.equal(result.status,422);assert.equal(result.data.stage,'product');assert.match(result.data.error,/ID ukuran/);
 assert.equal(globalThis.productEditCalls.length,1);
});
test('unexpected backend failures return a safe stage-specific error',async()=>{
 const e=event([]);globalThis.productEditFailure={name:'updateAdminProduct',error:Object.assign(Error('Failed query: update secret_table'),{status:500})};
 const result=await actions.updateProduct(e);assert.equal(result.status,500);assert.equal(result.data.stage,'product');
 assert.equal(result.data.error.includes('secret_table'),false);assert.match(result.data.error,/Detail produk/);
});
test('image failures after an update explicitly report that product and price were already saved',async()=>{
 const e=event([]);globalThis.productEditFailure={name:'setAdminPrimaryProductImage',error:Object.assign(Error('Image unavailable'),{status:404})};
 const result=await actions.updateProduct(e);assert.equal(result.data.stage,'images');assert.match(result.data.error,/harga produk sudah disimpan/);
 assert.equal(globalThis.productEditCalls.filter(call=>call.name==='updateAdminProduct').length,1);
});
