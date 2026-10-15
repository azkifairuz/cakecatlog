import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const url=(s)=>`data:text/javascript;base64,${Buffer.from(s).toString('base64')}`;
const state={calls:[],error:null};const key=`menuConflict_${Date.now()}`;globalThis[key]=state;
const source=await readFile(new URL('../src/routes/admin/dashboard/menus/+page.server.js',import.meta.url),'utf8');
const names=source.match(/import \{([^}]+)\} from '\$lib\/api\/admin.js'/)[1].split(',').map((v)=>v.trim());
const api=url(names.map((name)=>`export async function ${name}(...args){const s=globalThis[${JSON.stringify(key)}];s.calls.push([${JSON.stringify(name)},...args]);if(s.error)throw s.error;}`).join('\n'));
const kit=url('export const fail=(status,data)=>({status,data});');
const auth=url('export const handleAdminAuthError=()=>{};');
const deps={'@sveltejs/kit':kit,'$lib/api/admin.js':api,'$lib/api/auth.js':auth};
const {actions}=await import(url(source.replace(/from '([^']+)'/g,(_,path)=>`from '${deps[path]}'`)));
function event(id=''){state.calls=[];state.error=null;const data=new FormData();for(const [k,v]of Object.entries({id,name:'Rekening Pembayaran',url:'/admin/dashboard/rekening-pembayaran',icon:'Wallet',displayOrder:'11',isActive:'on'}))data.set(k,v);return {request:new Request('http://localhost',{method:'POST',body:data}),locals:{adminToken:'token'},fetch:()=>{},cookies:{}};}
test('duplicate menu preserves values and returns backend 409',async()=>{const e=event();state.error={status:409,message:'URL menu sudah digunakan'};const result=await actions.save(e);assert.equal(result.status,409);assert.equal(result.data.values.url,'/admin/dashboard/rekening-pembayaran');assert.equal(result.data.values.displayOrder,11);assert.equal(result.data.values.isActive,true);});
test('editing an existing inactive menu calls update instead of duplicate create',async()=>{const e=event('existing');assert.equal((await actions.save(e)).success,true);assert.equal(state.calls[0][0],'updateAdminMenu');assert.equal(state.calls[0][1],'existing');assert.equal(state.calls[0][2].isActive,true);});
