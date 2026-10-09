import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from '../src/core/api.js';

const okFetch = (calls) => async (url, init) => { calls.push({ url, init }); return { ok: true, status: 200, json: async () => ({ data: [1] }) }; };

test('sendet nur GET auf /api2/json', async () => {
  const calls = [];
  const api = createApi(okFetch(calls));
  const r = await api.get('/nodes/pve/status');
  assert.equal(r.ok, true);
  assert.equal(calls[0].url, '/api2/json/nodes/pve/status');
  assert.equal(calls[0].init.method, 'GET');
  assert.equal(calls[0].init.body, undefined);
});

test('lehnt fremde Hosts, Protokolle und Traversal ab', async () => {
  const api = createApi(okFetch([]));
  for (const bad of ['http://evil.example/x', '//evil.example/x', 'nodes/pve', '/nodes/../access', '/a b', '/x;rm', 5, null]) {
    await assert.rejects(() => api.get(bad), /ungültiger Pfad/, String(bad));
  }
});

test('Query-Strings erlaubt', async () => {
  const calls = [];
  await createApi(okFetch(calls)).get('/nodes/pve/tasks?errors=1&vmid=100');
  assert.equal(calls[0].url, '/api2/json/nodes/pve/tasks?errors=1&vmid=100');
});

test('403/Netzwerkfehler werden nicht geworfen', async () => {
  const f403 = async () => ({ ok: false, status: 403, json: async () => ({}) });
  assert.equal((await createApi(f403).get('/x')).status, 403);
  const boom = async () => { throw new Error('offline'); };
  assert.equal((await createApi(boom).get('/x')).ok, false);
});
