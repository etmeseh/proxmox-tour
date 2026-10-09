import { h } from './dom.js';
import { t } from './i18n.js';
import { hostArch, archOfName, isForeign } from './arch.js';

const CSS = `
:host { all: initial; }
.bar { position: fixed; top: 12px; left: 50%; transform: translateX(-50%); z-index: 2147483000; max-width: 640px;
  background: #b45309; color: #fff; border-radius: 6px; padding: 10px 14px; box-shadow: 0 4px 14px rgba(0,0,0,.45);
  font: 13px/1.4 -apple-system, "Segoe UI", Roboto, sans-serif; display: flex; gap: 12px; align-items: flex-start; }
.bar strong { display: block; margin-bottom: 2px; }
button { all: unset; cursor: pointer; font-size: 18px; line-height: 1; padding: 0 4px; }
`;

const visible = (el) => el.getClientRects().length > 0;

// Warnt im „Create: LXC Container“-Assistenten, wenn das gewählte Template zu einer anderen CPU-Architektur gehört.
export function createArchCheck({ api, getLang }) {
  let hostArchPromise = null;
  const getHostArch = () => (hostArchPromise ||= (async () => {
    const nodes = await api.get('/nodes');
    const node = nodes.data?.[0]?.node;
    if (!node) return null;
    const st = await api.get(`/nodes/${node}/status`);
    return hostArch(st.data?.['current-kernel']?.machine);
  })());

  const host = document.createElement('div');
  host.id = 'pvt-banner';
  const root = host.attachShadow({ mode: 'open' });
  let shown = null;      // aktuell angezeigtes Template
  let dismissed = null;  // vom Nutzer weggeklicktes Template

  function hide() { if (shown !== null) { root.replaceChildren(); host.remove(); shown = null; } }

  async function show(template, arch) {
    if (shown === template) return;
    const lang = getLang();
    const vars = { template, templateArch: archOfName(template), hostArch: arch };
    root.replaceChildren(
      h('style', {}, CSS),
      h('div', { class: 'bar', role: 'alert' },
        h('div', {}, h('strong', {}, t(lang, 'arch.warn.title')), t(lang, 'arch.warn.body', vars)),
        h('button', { title: t(lang, 'lessons.close'), onclick: () => { dismissed = template; hide(); } }, '×')));
    if (!host.isConnected) document.body.appendChild(host);
    shown = template;
  }

  // Wizard erkennen ohne Textvergleich (sprachunabhängig): Felder hostname + unprivileged.
  function findTemplateValue() {
    const win = [...document.querySelectorAll('.x-window')].find((w) => visible(w)
      && w.querySelector('input[name="hostname"]') && w.querySelector('input[name="unprivileged"]'));
    if (!win) return null;
    const direct = win.querySelector('input[name="ostemplate"]')?.value;
    if (direct) return direct;
    return [...win.querySelectorAll('input')].map((i) => i.value).find((v) => /\.tar\.(zst|xz|gz)$/i.test(v)) || null;
  }

  async function update() {
    const value = findTemplateValue();
    if (!value) { dismissed = null; return hide(); }
    if (value === dismissed) return;
    const arch = await getHostArch();
    if (isForeign(value, arch)) await show(value, arch); else hide();
  }

  return { update, destroy: () => { hide(); host.remove(); } };
}
