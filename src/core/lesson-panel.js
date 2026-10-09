import { h, richText } from './dom.js';
import { t } from './i18n.js';
import { find } from './finder.js';
import { runTour } from './tour-runner.js';
import { interpolate } from './assert.js';
import { TIP } from './permissions.js';

const CSS = `
:host { all: initial; }
.panel { position: fixed; right: 16px; bottom: 64px; z-index: 2147483000; width: 390px; max-height: calc(100vh - 100px);
  display: flex; flex-direction: column; background: #1f2933; color: #e4e7eb; border: 1px solid #3e4c59; border-radius: 8px;
  box-shadow: 0 8px 28px rgba(0,0,0,.5); font: 13px/1.45 -apple-system, "Segoe UI", Roboto, sans-serif; }
header { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid #3e4c59; }
header h2 { flex: 1; margin: 0; font-size: 14px; }
.body { overflow-y: auto; padding: 8px 12px 12px; }
button { font: inherit; color: inherit; background: #323f4b; border: 1px solid #52606d; border-radius: 4px; padding: 5px 10px; cursor: pointer; }
button:hover:not(:disabled) { background: #3e4c59; }
button.primary { background: #2b8fd6; border-color: #1d6fa5; color: #fff; }
button.ghost { background: none; border: none; padding: 2px 6px; font-size: 16px; }
button:disabled { opacity: .6; cursor: default; }
.lesson-item { display: block; width: 100%; text-align: left; margin: 6px 0; padding: 10px; }
.lesson-item b { display: block; }
.muted { color: #9aa5b1; font-size: 12px; }
.vars { display: grid; grid-template-columns: auto 1fr; gap: 6px 8px; align-items: center; margin: 6px 0 10px; }
select, input { font: inherit; background: #fff; color: #111; border: 1px solid #52606d; border-radius: 4px; padding: 4px 6px; min-width: 0; }
.hint { background: #3d3a1f; border-left: 3px solid #d9b13b; padding: 6px 8px; margin: 6px 0; font-size: 12px; }
.step { border: 1px solid #3e4c59; border-radius: 6px; margin: 6px 0; overflow: hidden; }
.step > .head { display: flex; gap: 8px; width: 100%; text-align: left; border: none; border-radius: 0; background: #27323d; padding: 8px 10px; align-items: center; }
.step.done > .head .mark { background: #2f9e44; border-color: #2f9e44; color: #fff; }
.mark { flex: none; width: 20px; height: 20px; border-radius: 50%; border: 1px solid #52606d; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; }
.step .content { padding: 8px 10px 10px; }
code { background: #111820; padding: 1px 4px; border-radius: 3px; font: 12px ui-monospace, Menlo, monospace; }
.cmd { margin: 8px 0; }
.cmd .where { font-size: 11px; color: #9aa5b1; margin-bottom: 2px; }
.cmd .row { display: flex; gap: 6px; align-items: stretch; }
.cmd pre { flex: 1; margin: 0; padding: 6px 8px; background: #111820; border-radius: 4px; overflow-x: auto; font: 12px ui-monospace, Menlo, monospace; white-space: pre; }
.cmd.destructive pre { border-left: 3px solid #e03131; }
.warn { color: #ff8787; font-size: 12px; margin-top: 3px; }
.actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 8px; }
.perm { background: #3a2323; border-left: 3px solid #e03131; padding: 6px 8px; margin: 6px 0; font-size: 12px; }
.perm ul { margin: 4px 0 4px 16px; padding: 0; } .perm li { margin: 2px 0; }
.res.ok { color: #69db7c; } .res.fail { color: #ffa94d; } .res.bad { color: #ff8787; }
.bar { height: 4px; background: #3e4c59; border-radius: 2px; margin: 4px 0 8px; } .bar i { display: block; height: 100%; background: #2f9e44; border-radius: 2px; }
`;

export function createLessonPanel({ engine, getLang, getContextVmid, isAlive = () => true, onDead = () => {}, describe = () => null }) {
  const host = document.createElement('div');
  host.id = 'pvt-panel';
  const root = host.attachShadow({ mode: 'open' });
  const lang = () => getLang();
  let view = 'list';
  let session = null;
  let openStep = null;
  let results = {};
  let poll = null;
  let hlMissing = null;

  const stopPoll = () => { clearInterval(poll); poll = null; };

  async function runCheck(stepId, silent) {
    if (!silent) { results[stepId] = { state: 'checking' }; render(); }
    results[stepId] = await engine.check(session, stepId);
    render();
    if (results[stepId].state === 'ok') stopPoll();
  }

  function startPoll(stepId) {
    stopPoll();
    const step = session.lesson.steps.find((s) => s.id === stepId);
    if (!step?.check || engine.isDone(session.lesson.id, stepId)) return;
    poll = setInterval(() => {
      if (!isAlive()) { stopPoll(); onDead(); return; } // verwaistes Skript: nicht weiter abfragen
      runCheck(stepId, true);
    }, 5000);
  }

  async function toggle(stepId) {
    stopPoll();
    hlMissing = null;
    if (openStep === stepId) { openStep = null; return render(); }
    openStep = stepId;
    await engine.startStep(session, stepId);
    await engine.refreshBackupFile(session);
    render();
    startPoll(stepId);
  }

  async function openLesson(id) {
    session = await engine.open(id, getContextVmid());
    view = 'lesson'; openStep = null; results = {}; hlMissing = null;
    render();
  }

  function copy(text, btn) {
    const done = () => { btn.textContent = t(lang(), 'lessons.copied'); setTimeout(() => { btn.textContent = t(lang(), 'lessons.copy'); }, 1500); };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, () => fallback());
    else fallback();
    function fallback() {
      const ta = h('textarea', {}); ta.value = text; root.append(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch { /* nicht möglich */ }
      ta.remove();
    }
  }

  function highlight(step, key) {
    hlMissing = null;
    if (!find(step.highlight)) { hlMissing = step.id; return render(); }
    runTour({ steps: [{ key, target: step.highlight, side: 'bottom' }] }, lang());
  }

  function varsView() {
    const L = lang();
    const rows = [];
    for (const name of session.lesson.vars || []) {
      let input;
      if (name === 'vmid') {
        input = h('select', { onchange: async (e) => { await engine.setVar(session, 'vmid', e.target.value); results = {}; render(); } },
          session.containers.map((c) => h('option', { value: c.vmid, selected: String(c.vmid) === session.vars.vmid }, `${c.vmid} · ${c.name || ''}`)));
        if (!session.containers.length) input = h('span', { class: 'muted' }, t(L, 'lessons.noCt'));
      } else {
        input = h('input', { type: 'text', value: session.vars[name] || '', onchange: (e) => engine.setVar(session, name, e.target.value.trim()) });
      }
      rows.push(h('label', {}, t(L, `lessons.var.${name}`)), input);
    }
    return h('div', {}, h('div', { class: 'vars' }, rows),
      session.lesson.vars?.includes('vmid') ? h('div', { class: 'hint' }, t(L, 'lessons.labHint')) : null);
  }

  function cmdView(c) {
    const L = lang();
    const text = interpolate(c.cmd, session.vars);
    const btn = h('button', {}, t(L, 'lessons.copy'));
    btn.addEventListener('click', () => copy(text, btn));
    return h('div', { class: `cmd${c.destructive ? ' destructive' : ''}` },
      h('div', { class: 'where' }, t(L, `lessons.where.${c.where}`)),
      h('div', { class: 'row' }, h('pre', {}, text), btn),
      c.destructive ? h('div', { class: 'warn' }, t(L, 'lessons.destructive')) : null);
  }

  function permItem(d) {
    const L = lang();
    const info = describe(d.path);
    const endpoint = info?.endpoint || d.path;
    if (d.status === 401) return t(L, 'perm.item.expired', { endpoint });
    if (!info || !info.privs.length) return t(L, 'perm.item.unknown', { endpoint });
    return t(L, info.any ? 'perm.item.any' : 'perm.item.all', { endpoint, privs: info.privs.join(', '), on: info.on });
  }

  // Sammelblock oben: alle bisher verweigerten Endpunkte mit dem nötigen Recht.
  function permBlock() {
    if (!session.denied.length) return null;
    const L = lang();
    return h('div', { class: 'perm', role: 'alert' },
      h('b', {}, t(L, 'perm.title')), h('div', {}, t(L, 'perm.intro')),
      h('ul', {}, session.denied.map((d) => h('li', {}, permItem(d)))),
      session.denied.some((d) => d.status === 403) ? h('div', {}, t(L, 'perm.tip', { role: TIP.role, tipPath: TIP.path })) : null);
  }

  // Hinweis, wenn ein Endpunkt ohne bestimmtes Recht nur eingeschränkt antwortet (kein 403, aber evtl. leer).
  function limitedHint(r) {
    if (r?.state !== 'fail' || !r.path) return null;
    const info = describe(r.path);
    if (!info?.limited) return null;
    return h('div', { class: 'hint' }, t(lang(), 'perm.limited', { endpoint: info.endpoint, privs: info.limited.privs.join(', '), on: info.limited.on }));
  }

  function resultView(stepId) {
    const L = lang();
    const r = results[stepId];
    if (!r || r.state === 'none') return null;
    const map = { ok: ['ok', 'lessons.checkOk'], fail: ['fail', 'lessons.checkFail'], noaccess: ['bad', 'lessons.noAccess'], error: ['bad', 'lessons.error'], checking: ['', 'lessons.checking'] };
    const [cls, key] = map[r.state] || ['', 'lessons.error'];
    return h('span', { class: `res ${cls}` }, t(L, key));
  }

  function stepView(step, i) {
    const L = lang();
    const id = session.lesson.id;
    const key = `lesson.${id}.${step.id}`;
    const done = engine.isDone(id, step.id);
    const open = openStep === step.id;
    const vars = session.vars;
    const head = h('button', { class: 'head', onclick: () => toggle(step.id) },
      h('span', { class: 'mark' }, done ? '✓' : String(i + 1)), h('b', {}, richText(t(L, `${key}.title`, vars))));
    const el = h('div', { class: `step${done ? ' done' : ''}` }, head);
    if (!open) return el;
    const content = h('div', { class: 'content' }, richText(t(L, `${key}.body`, vars)));
    (step.cmds || []).forEach((c) => content.append(cmdView(c)));
    const actions = h('div', { class: 'actions' });
    if (step.highlight) actions.append(h('button', { onclick: () => highlight(step, key) }, t(L, 'lessons.show')));
    if (step.check) actions.append(...[h('button', { class: 'primary', onclick: () => runCheck(step.id, false) }, t(L, 'lessons.check')), resultView(step.id)].filter(Boolean));
    if (!step.check && step.type !== 'read') actions.append(h('button', { class: 'primary', onclick: async () => { await engine.markDone(session, step.id, !done); render(); } }, done ? t(L, 'lessons.undo') : t(L, 'lessons.markDone')));
    if (step.type === 'read') actions.append(h('button', { class: 'primary', onclick: async () => { await engine.markDone(session, step.id, !done); render(); } }, done ? t(L, 'lessons.undo') : t(L, 'lessons.markDone')));
    content.append(actions);
    const lim = limitedHint(results[step.id]);
    if (lim) content.append(lim);
    if (hlMissing === step.id) content.append(h('div', { class: 'hint' }, t(L, 'lessons.hlMissing')));
    el.append(content);
    return el;
  }

  function bar(id) {
    const s = engine.stats(id);
    return h('div', {}, h('div', { class: 'muted' }, t(lang(), 'lessons.progress', s)), h('div', { class: 'bar' }, h('i', { style: `width:${(s.done / s.total) * 100}%` })));
  }

  function listView() {
    const L = lang();
    return engine.lessons.map((l) => h('button', { class: 'lesson-item', onclick: () => openLesson(l.id) },
      h('b', {}, richText(t(L, `lesson.${l.id}.title`))), h('span', { class: 'muted' }, t(L, `lesson.${l.id}.desc`)), bar(l.id)));
  }

  function render() {
    const L = lang();
    const body = root.querySelector('.body');
    const scroll = body ? body.scrollTop : 0;
    const title = view === 'lesson' ? t(L, `lesson.${session.lesson.id}.title`) : t(L, 'lessons.title');
    const content = view === 'list' ? listView() : [
      h('button', { onclick: () => { stopPoll(); view = 'list'; render(); } }, '← ' + t(L, 'lessons.back')),
      bar(session.lesson.id), varsView(), permBlock(),
      session.lesson.steps.map(stepView),
      h('div', { class: 'actions' }, h('button', { onclick: async () => { await engine.reset(session.lesson.id); results = {}; render(); } }, t(L, 'lessons.reset')))];
    root.replaceChildren(
      h('style', {}, CSS),
      h('div', { class: 'panel' },
        h('header', {}, h('h2', {}, title), h('button', { class: 'ghost', title: t(L, 'lessons.close'), onclick: close }, '×')),
        h('div', { class: 'body' }, content)));
    root.querySelector('.body').scrollTop = scroll;
  }

  function open() { if (!host.isConnected) document.body.appendChild(host); view = 'list'; render(); }
  function close() { stopPoll(); host.remove(); }
  function toggleOpen() { host.isConnected ? close() : open(); }

  return { toggle: toggleOpen, close, rerender: () => { if (host.isConnected) render(); } };
}
