import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const store = {};
function fakeChrome({ id = 'abc', failWith = null } = {}) {
  globalThis.chrome = {
    runtime: { id },
    storage: { local: {
      get: async (k) => { if (failWith) throw new Error(failWith); return { [k]: store[k] }; },
      set: async (o) => { if (failWith) throw new Error(failWith); Object.assign(store, o); },
    } },
  };
}
const load = async () => (await import(`../src/adapters/extension.js?${Math.random()}`)).adapter;

beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });

test('lebender Kontext: get/set funktionieren, kein Callback', async () => {
  fakeChrome();
  const a = await load();
  let dead = 0; a.onInvalidated(() => dead++);
  await a.storage.set('k', 'v');
  assert.equal(await a.storage.get('k'), 'v');
  assert.equal(a.isAlive(), true);
  assert.equal(dead, 0);
});

test('chrome.runtime.id fehlt: kein chrome.storage-Aufruf, Callback, null', async () => {
  fakeChrome({ id: null });
  let touched = 0;
  globalThis.chrome.storage.local.get = async () => { touched++; return {}; };
  globalThis.chrome.storage.local.set = async () => { touched++; };
  const a = await load();
  let dead = 0; a.onInvalidated(() => dead++);
  assert.equal(a.isAlive(), false);
  assert.equal(await a.storage.get('k'), null);
  await a.storage.set('k', 'v');
  assert.equal(touched, 0);
  assert.equal(dead, 2);
});

test('„Extension context invalidated“ wird abgefangen statt geworfen', async () => {
  fakeChrome({ failWith: 'Extension context invalidated.' });
  const a = await load();
  let dead = 0; a.onInvalidated(() => dead++);
  assert.equal(await a.storage.get('k'), null);
  await a.storage.set('k', 'v');
  assert.equal(dead, 2);
});

test('andere Fehler werden weitergereicht', async () => {
  fakeChrome({ failWith: 'QUOTA_BYTES quota exceeded' });
  const a = await load();
  await assert.rejects(() => a.storage.set('k', 'v'), /QUOTA/);
});

test('chrome.runtime selbst wirft: gilt als tot', async () => {
  globalThis.chrome = { get runtime() { throw new Error('boom'); } };
  const a = await load();
  assert.equal(a.isAlive(), false);
});
