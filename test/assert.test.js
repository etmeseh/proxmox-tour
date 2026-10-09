import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, interpolate } from '../src/core/assert.js';

const snaps = [{ name: 'vor_test', snaptime: 5 }, { name: 'current' }];
const vars = { snap: 'vor_test', stepStarted: '100', foreign: 'arm64|aarch64' };

test('interpolate lässt unbekannte Variablen stehen', () => {
  assert.equal(interpolate('{a}-{b}', { a: 1 }), '1-{b}');
});
test('any/none', () => {
  assert.ok(evaluate({ any: { name: '{snap}' } }, snaps, vars).ok);
  assert.ok(evaluate({ any: { name: { ne: 'current' } } }, snaps, vars).ok);
  assert.ok(!evaluate({ any: { name: { ne: 'current' } } }, [{ name: 'current' }], vars).ok);
  assert.ok(evaluate({ none: { name: 'x' } }, snaps, vars).ok);
});
test('Zahlenvergleich und contains', () => {
  const backups = [{ volid: 'local:backup/vzdump-lxc-100-2026.tar.zst', ctime: 150 }];
  assert.ok(evaluate({ any: { volid: { contains: 'vzdump-lxc-100-' }, ctime: { gte: '{stepStarted}' } } }, backups, vars).ok);
  assert.ok(!evaluate({ any: { ctime: { gte: 200 } } }, backups, vars).ok);
});
test('matches (Fremdarchitektur)', () => {
  const tpl = [{ volid: 'local:vztmpl/debian-13_arm64.tar.zst' }, { volid: 'local:vztmpl/debian-13_amd64.tar.zst' }];
  assert.ok(!evaluate({ none: { volid: { matches: '{foreign}' } } }, tpl, vars).ok);
  assert.ok(evaluate({ none: { volid: { matches: '{foreign}' } } }, [tpl[1]], vars).ok);
});
test('path und count', () => {
  assert.ok(evaluate({ path: 'arch', equals: 'amd64' }, { arch: 'amd64' }, vars).ok);
  assert.ok(evaluate({ path: 'status', equals: 'running' }, { status: 'running' }, vars).ok);
  assert.ok(!evaluate({ path: 'arch', equals: 'amd64' }, { arch: 'arm64' }, vars).ok);
  assert.ok(evaluate({ count: { gte: 1 } }, [1], vars).ok);
  assert.ok(evaluate({ count: { lte: 0 } }, [], vars).ok);
});
test('Nicht-Listen liefern bei Listen-Prüfungen false statt zu werfen', () => {
  assert.ok(!evaluate({ any: { a: 1 } }, null, vars).ok);
});

test('path als Array: Schlüssel mit Punkten (Rechte-Namen) und Interpolation', () => {
  const perms = { '/vms/100': { 'VM.Snapshot': 1, 'VM.Audit': 1 } };
  const v = { vmid: '100' };
  assert.ok(evaluate({ path: ['/vms/{vmid}', 'VM.Snapshot'], equals: '1' }, perms, v).ok);
  assert.ok(!evaluate({ path: ['/vms/{vmid}', 'Sys.Audit'], equals: '1' }, perms, v).ok);
  assert.ok(!evaluate({ path: ['/vms/{vmid}', 'VM.Snapshot'], equals: '1' }, {}, v).ok);
  assert.ok(!evaluate({ path: ['/', 'Sys.Audit'], equals: '1' }, { '/': { 'Sys.Audit': 0 } }, v).ok);
  assert.ok(evaluate({ path: 'a.b' }, { a: { b: 0 } }).ok);
});
