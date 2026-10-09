import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createPermissions } from '../src/core/permissions.js';

const table = JSON.parse(readFileSync(new URL('../content/permissions.json', import.meta.url), 'utf8'));
const { describe } = createPermissions(table);

test('Rechte laut PVE-API-Doku (Stand 2026-10-09)', () => {
  const st = describe('/nodes/pve/status');
  assert.deepEqual([st.privs, st.on, st.any], [['Sys.Audit'], '/nodes/pve', false]);
  assert.deepEqual(describe('/nodes/pve/lxc/105/config').on, '/vms/105');
  assert.deepEqual(describe('/nodes/pve/lxc/105/snapshot').privs, ['VM.Audit']);
  assert.deepEqual(describe('/nodes/pve/lxc/105/status/current').privs, ['VM.Audit']);
  const sc = describe('/nodes/pve/storage/local/content?content=backup');
  assert.deepEqual([sc.privs, sc.any, sc.on], [['Datastore.Audit', 'Datastore.AllocateSpace'], true, '/storage/local']);
  assert.deepEqual([describe('/cluster/backup').privs, describe('/cluster/backup').on], [['Sys.Audit'], '/']);
});

test('Query-String wird ignoriert, unbekannte Endpunkte liefern null', () => {
  assert.equal(describe('/nodes/pve/tasks?vmid=100&limit=20').endpoint, '/nodes/{node}/tasks');
  assert.equal(describe('/access/users'), null);
});

test('tasks und lxc-Liste: kein 403, aber eingeschränkte Antwort ohne Recht', () => {
  const t = describe('/nodes/pve/tasks?errors=1&vmid=100');
  assert.equal(t.public, true);
  assert.deepEqual(t.limited, { privs: ['Sys.Audit'], on: '/nodes/pve' });
});

test('jeder von Engine und Lektionen genutzte Endpunkt ist in der Tabelle', () => {
  // Feste Endpunkte der Engine (src/core/lessons.js); bei Änderungen dort hier ergänzen.
  const paths = ['/nodes', '/cluster/resources?type=vm', '/nodes/pve/status', '/cluster/nextid',
    '/nodes/pve/time', '/nodes/pve/storage/local/content?content=backup'];
  const dir = new URL('../content/lessons/', import.meta.url);
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    for (const s of JSON.parse(readFileSync(new URL(f, dir), 'utf8')).steps) {
      if (s.check) paths.push(s.check.get.replace('{node}', 'pve').replace('{vmid}', '100').replace('{newid}', '102'));
    }
  }
  assert.deepEqual(paths.filter((p) => !describe(p)), []);
});

test('jeder Eintrag ist öffentlich, mit Recht versehen oder beschreibt Einschränkungen', () => {
  for (const e of table) assert.ok(e.public || (e.privs?.length && e.on), e.endpoint);
});
