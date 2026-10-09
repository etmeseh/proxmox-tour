import { h } from './dom.js';
import { t } from './i18n.js';

const CSS = `
:host { all: initial; }
.bar { position: fixed; bottom: 16px; right: 16px; z-index: 2147483000; max-width: 380px;
  background: #1f2933; color: #e4e7eb; border: 1px solid #d9b13b; border-left-width: 4px; border-radius: 6px; padding: 10px 12px;
  box-shadow: 0 6px 20px rgba(0,0,0,.5); font: 13px/1.4 -apple-system, "Segoe UI", Roboto, sans-serif; }
.row { display: flex; gap: 8px; margin-top: 8px; }
button { font: inherit; color: #fff; background: #2b8fd6; border: 1px solid #1d6fa5; border-radius: 4px; padding: 5px 10px; cursor: pointer; }
button.ghost { background: none; border-color: #52606d; color: #e4e7eb; }
`;

// Hinweis nach Erweiterungs-Update: eigenständig, nutzt kein chrome.*.
export function showUpdateNotice(lang) {
  document.getElementById('pvt-notice')?.remove();
  const host = document.createElement('div');
  host.id = 'pvt-notice';
  const root = host.attachShadow({ mode: 'open' });
  root.append(
    h('style', {}, CSS),
    h('div', { class: 'bar', role: 'alert' },
      t(lang, 'ext.invalidated'),
      h('div', { class: 'row' },
        h('button', { onclick: () => location.reload() }, t(lang, 'ext.reload')),
        h('button', { class: 'ghost', onclick: () => host.remove() }, t(lang, 'lessons.close')))));
  document.body.appendChild(host);
}
