import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../src/core/lessons.js';

function fakeApi(map) {
  const calls = [];
  return { calls, get: async (p) => { calls.push(p); const hit = map[p]; return hit ? { ok: true, status: 200, data: hit } : { ok: false, status: 404, data: null }; } };
}
function mem() { const m = {}; return { get: async (k) => m[k] ?? null, set: async (k, v) => { m[k] = v; }, m }; }

const lesson = { id: 'snap', steps: [
  { id: 'a', type: 'read' },
  { id: 'b', type: 'check', check: { get: '/nodes/{node}/lxc/{vmid}/snapshot', assert: { any: { name: { ne: 'current' } } } } },
  { id: 'c', type: 'check', check: { get: '/nodes/{node}/tasks?vmid={vmid}', assert: { any: { type: 'vzrollback', starttime: { gte: '{stepStarted}' } } } } },
] };

const base = {
  '/nodes': [{ node: 'pve' }],
  '/cluster/resources?type=vm': [{ vmid: 100, type: 'lxc', name: 'CT100', node: 'pve' }, { vmid: 105, type: 'lxc', name: 'lab-01', node: 'pve' }, { vmid: 200, type: 'qemu', name: 'vm', node: 'pve' }],
  '/nodes/pve/status': { 'current-kernel': { machine: 'x86_64' } },
  '/cluster/nextid': '106',
  '/nodes/pve/time': { time: 1000 },
};

test('Voreinstellung wählt Container mit "lab" im Namen, nur LXC', async () => {
  const e = createEngine({ api: fakeApi(base), storage: mem(), lessons: [lesson] });
  const s = await e.open('snap', '100');
  assert.equal(s.vars.vmid, '105');
  assert.equal(s.containers.length, 2);
  assert.equal(s.vars.hostArch, 'amd64');
  assert.equal(s.vars.newid, '106');
});

test('Check: ok markiert Schritt, fail nicht; Fortschritt wird gespeichert', async () => {
  const api = fakeApi({ ...base, '/nodes/pve/lxc/105/snapshot': [{ name: 'current' }], '/nodes/pve/tasks?vmid=105': [] });
  const st = mem();
  const e = createEngine({ api, storage: st, lessons: [lesson] });
  const s = await e.open('snap');
  assert.equal((await e.check(s, 'b')).state, 'fail');
  api.get = (orig => async (p) => p === '/nodes/pve/lxc/105/snapshot' ? { ok: true, status: 200, data: [{ name: 'x' }, { name: 'current' }] } : orig(p))(api.get);
  assert.equal((await e.check(s, 'b')).state, 'ok');
  assert.ok(e.isDone('snap', 'b'));
  assert.deepEqual(JSON.parse(st.m.lessonProgress).snap.steps, { b: true });
  assert.deepEqual(e.stats('snap'), { done: 1, total: 3 });
});

test('stepStarted nutzt Serverzeit, alte Tasks zählen nicht', async () => {
  const api = fakeApi({ ...base, '/nodes/pve/tasks?vmid=105': [{ type: 'vzrollback', starttime: 900 }] });
  const e = createEngine({ api, storage: mem(), lessons: [lesson] });
  const s = await e.open('snap');
  await e.startStep(s, 'c');
  assert.equal(s.started.c, 1000);
  assert.equal((await e.check(s, 'c')).state, 'fail');
});

test('403 wird als noaccess gemeldet, nicht als fail', async () => {
  const api = { get: async (p) => (p.includes('/snapshot') ? { ok: false, status: 403, data: null } : fakeApi(base).get(p)) };
  const e = createEngine({ api, storage: mem(), lessons: [lesson] });
  const s = await e.open('snap');
  assert.equal((await e.check(s, 'b')).state, 'noaccess');
});

test('Fortschritt überlebt neuen Engine-Start; reset löscht', async () => {
  const st = mem();
  const e1 = createEngine({ api: fakeApi(base), storage: st, lessons: [lesson] });
  const s = await e1.open('snap');
  await e1.markDone(s, 'a', true);
  const e2 = createEngine({ api: fakeApi(base), storage: st, lessons: [lesson] });
  await e2.ready;
  assert.ok(e2.isDone('snap', 'a'));
  await e2.reset('snap');
  assert.ok(!e2.isDone('snap', 'a'));
});
