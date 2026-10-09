import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hostArch, foreignPattern, archOfName, isForeign } from '../src/core/arch.js';

test('hostArch', () => {
  assert.equal(hostArch('x86_64'), 'amd64');
  assert.equal(hostArch('aarch64'), 'arm64');
  assert.equal(hostArch('riscv64'), null);
});
test('archOfName erkennt Template-Namen', () => {
  assert.equal(archOfName('local:vztmpl/debian-13-standard_13.6-1_arm64.tar.zst'), 'arm64');
  assert.equal(archOfName('debian-13-standard_13.6-1_amd64.tar.zst'), 'amd64');
  assert.equal(archOfName('alpine-3.24-default_20260803_arm64.tar.xz'), 'arm64');
  assert.equal(archOfName('ubuntu-24.04-standard_24.04-2_all.tar.zst'), null);
});
test('isForeign', () => {
  assert.ok(isForeign('debian-13_arm64.tar.zst', 'amd64'));
  assert.ok(!isForeign('debian-13_amd64.tar.zst', 'amd64'));
  assert.ok(!isForeign('ubuntu_all.tar.zst', 'amd64'));
  assert.ok(!isForeign('debian-13_arm64.tar.zst', null));
});
test('foreignPattern passt zu den Namen', () => {
  assert.ok(new RegExp(foreignPattern('amd64')).test('x_arm64.tar.zst'));
  assert.ok(!new RegExp(foreignPattern('amd64')).test('x_amd64.tar.zst'));
  assert.ok(!new RegExp(foreignPattern(null)).test('x_arm64.tar.zst'));
});
