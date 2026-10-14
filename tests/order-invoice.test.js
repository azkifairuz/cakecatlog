import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { copyInvoiceAccount, formatInvoiceCurrency } from '../src/lib/order-invoice.js';
const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const key = `invoiceTest_${Date.now()}`;
const state = { calls: [], result: null, failure: null };
globalThis[key] = state;
const api = moduleUrl(`export async function getOrderInvoice(...args) { const state = globalThis[${JSON.stringify(key)}]; state.calls.push(args); if(state.failure) throw state.failure; return state.result; }`);
const kit = moduleUrl(`export function error(status, message) { throw { status, message }; }`);
const source = await readFile(new URL('../src/routes/order/invoice/[id]/+page.server.js', import.meta.url), 'utf8');
const { load } = await import(moduleUrl(source.replace("'@sveltejs/kit'", `'${kit}'`).replace("'$lib/api/order-invoice.js'", `'${api}'`)));
const id = '00000000-0000-4000-8000-000000000001';
function event() {
 state.calls = []; state.failure = null; state.result = { order: { id }, items: [], totals: { total: 100 }, paymentAccounts: [] };
 const headers = {};
 return { params: { id }, fetch: () => {}, headers, setHeaders: (values) => Object.assign(headers, values) };
}

test('invoice loader uses public API and prevents caching', async () => {
 const input = event();
 const result = await load(input);
 assert.equal(result.invoice, state.result);
 assert.deepEqual(state.calls[0], [id, input.fetch]);
 assert.equal(input.headers['cache-control'], 'private, no-store');
});
test('invalid and unknown orders show 404; incomplete or unavailable invoice is not displayed', async () => {
 let input = event(); input.params.id = 'invalid';
 await assert.rejects(load(input), (err) => err.status === 404);
 assert.equal(state.calls.length, 0);
 input = event(); state.failure = { status: 404 };
 await assert.rejects(load(input), (err) => err.status === 404);
 input = event(); state.failure = { status: 500, message: 'private database detail' };
 await assert.rejects(load(input), (err) => err.status === 503 && !err.message.includes('private'));
 input = event(); state.result = {};
 await assert.rejects(load(input), (err) => err.status === 502);
});
test('copy preserves account leading zeros and copies only the number', async () => {
 const calls = [];
 await copyInvoiceAccount('0012345678', { writeText: async (text) => calls.push(text) });
 assert.deepEqual(calls, ['0012345678']);
});
test('clipboard unavailability and rejection are reported for manual-copy feedback', async () => {
 await assert.rejects(copyInvoiceAccount('0012345678', null));
 await assert.rejects(copyInvoiceAccount('', { writeText: async () => assert.fail('must not copy empty account') }));
 await assert.rejects(copyInvoiceAccount('0012345678', { writeText: async () => { throw new Error('Denied'); } }), /Denied/);
 assert.match(formatInvoiceCurrency(-10000), /10\.000/);
});
test('API invoice wrapper uses GET and encodes the order identifier', async () => {
 const source = await readFile(new URL('../src/lib/api/order-invoice.js', import.meta.url), 'utf8');
 const client = moduleUrl(`export async function apiFetch(...args) { const state = globalThis[${JSON.stringify(key)}]; state.calls.push(args); return { data: state.result }; } export const unwrapData = (response) => response.data;`);
 const wrapper = await import(moduleUrl(source.replace("'./client.js'", `'${client}'`)));
 state.calls = [];
 await wrapper.getOrderInvoice(id, 'fetch');
 assert.deepEqual(state.calls[0], [`/orders/${id}/invoice`, { method: 'GET' }, 'fetch']);
});
