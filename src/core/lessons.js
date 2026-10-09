import { evaluate, interpolate } from './assert.js';
import { hostArch, foreignPattern } from './arch.js';

const PROGRESS_KEY = 'lessonProgress';
const VARS_KEY = 'lessonVars';

const parse = (s) => { try { return s ? JSON.parse(s) : {}; } catch { return {}; } };

// api: { get(path) }, storage: { get(key), set(key, value) }, lessons: Lektions-JSONs
export function createEngine({ api, storage, lessons }) {
  let progress = {};
  let savedVars = {};
  const ready = (async () => {
    progress = parse(await storage.get(PROGRESS_KEY));
    savedVars = parse(await storage.get(VARS_KEY));
  })();

  const saveProgress = () => storage.set(PROGRESS_KEY, JSON.stringify(progress));
  const saveVars = () => storage.set(VARS_KEY, JSON.stringify(savedVars));

  const find = (id) => lessons.find((l) => l.id === id);

  function stats(id) {
    const l = find(id);
    const done = Object.keys(progress[id]?.steps || {}).filter((s) => l.steps.some((x) => x.id === s)).length;
    return { done, total: l.steps.length };
  }

  // 401/403 merken: das Panel zeigt, welcher Endpunkt welches Recht braucht.
  function note(s, path, r) {
    if (r.status !== 401 && r.status !== 403) return;
    const key = path.split('?')[0];
    const known = s.denied.find((d) => d.path === key);
    if (!known) s.denied.push({ path: key, status: r.status });
    else if (r.status === 401) known.status = 401;
  }

  async function serverTime(s) {
    const path = `/nodes/${s.vars.node}/time`;
    const r = await api.get(path);
    note(s, path, r);
    return r.ok && r.data?.time ? r.data.time : Math.floor(Date.now() / 1000);
  }

  // Einen Lektions-Durchlauf vorbereiten: Variablen aus der API ableiten.
  async function open(id, contextVmid) {
    await ready;
    const lesson = find(id);
    const s = { lesson, vars: {}, containers: [], started: {}, denied: [] };

    const [nodes, res] = await Promise.all([api.get('/nodes'), api.get('/cluster/resources?type=vm')]);
    note(s, '/nodes', nodes);
    note(s, '/cluster/resources', res);
    s.containers = (res.data || []).filter((r) => r.type === 'lxc').sort((a, b) => a.vmid - b.vmid);
    const firstNode = nodes.data?.[0]?.node || s.containers[0]?.node || 'pve';

    // Voreinstellung: zuletzt gewählt, sonst Container mit „lab“ im Namen, sonst aktueller Kontext, sonst erster.
    const pick = s.containers.find((c) => String(c.vmid) === String(savedVars.vmid))
      || s.containers.find((c) => /lab/i.test(c.name || ''))
      || s.containers.find((c) => String(c.vmid) === String(contextVmid))
      || s.containers[0];
    s.vars.vmid = pick ? String(pick.vmid) : '';
    s.vars.node = pick?.node || firstNode;
    s.vars.snap = savedVars.snap || 'vor_test';

    const statusPath = `/nodes/${s.vars.node}/status`;
    const status = await api.get(statusPath);
    note(s, statusPath, status);
    const machine = status.data?.['current-kernel']?.machine;
    s.vars.hostMachine = machine || '?';
    s.vars.hostArch = hostArch(machine) || '?';
    s.vars.foreignArch = foreignPattern(hostArch(machine));

    const nextid = await api.get('/cluster/nextid');
    note(s, '/cluster/nextid', nextid);
    s.vars.newid = String(nextid.data || '');
    s.vars.backupFile = '<datei>.tar.zst';
    return s;
  }

  async function setVar(s, name, value) {
    s.vars[name] = String(value);
    if (name === 'vmid') {
      const c = s.containers.find((x) => String(x.vmid) === String(value));
      if (c) s.vars.node = c.node;
    }
    if (name === 'vmid' || name === 'snap') { savedVars[name] = s.vars[name]; await saveVars(); }
  }

  async function startStep(s, stepId) {
    if (!s.started[stepId]) s.started[stepId] = await serverTime(s);
  }

  async function refreshBackupFile(s) {
    if (!s.lesson.needs?.includes('backupFile')) return;
    const path = '/nodes/' + s.vars.node + '/storage/local/content?content=backup';
    const r = await api.get(path);
    note(s, path, r);
    const mine = (r.data || []).filter((b) => String(b.volid).includes(`vzdump-lxc-${s.vars.vmid}-`)).sort((a, b) => b.ctime - a.ctime);
    s.vars.backupFile = mine[0] ? mine[0].volid.split('/').pop() : '<datei>.tar.zst';
  }

  async function check(s, stepId) {
    const step = s.lesson.steps.find((x) => x.id === stepId);
    if (!step?.check) return { state: 'none' };
    await refreshBackupFile(s);
    const vars = { ...s.vars, stepStarted: String(s.started[stepId] ?? 0) };
    const path = interpolate(step.check.get, vars);
    const r = await api.get(path);
    note(s, path, r);
    if (r.status === 401 || r.status === 403) return { state: 'noaccess', path, status: r.status };
    if (!r.ok) return { state: 'error', path };
    const out = evaluate(step.check.assert, r.data, vars);
    if (out.ok) await markDone(s, stepId, true);
    return { state: out.ok ? 'ok' : 'fail', detail: out.detail, path };
  }

  async function markDone(s, stepId, done) {
    const p = (progress[s.lesson.id] ||= { steps: {}, updated: 0 });
    if (done) p.steps[stepId] = true; else delete p.steps[stepId];
    p.updated = Math.floor(Date.now() / 1000);
    await saveProgress();
  }

  const isDone = (lessonId, stepId) => !!progress[lessonId]?.steps?.[stepId];

  async function reset(id) { delete progress[id]; await saveProgress(); }

  return { lessons, ready, open, setVar, startStep, check, markDone, isDone, stats, reset, refreshBackupFile };
}
