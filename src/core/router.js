import { proxmoxLang } from './guard.js';

const visible = (el) => el.getClientRects().length > 0;

// Kontext aus Hash (#v1:0:=lxc%2F100:4:...) und DOM.
export function getContext() {
  const m = decodeURIComponent(location.hash).match(/=([a-z]+)\/([^:]+)/);
  const nodeType = m ? m[1] : 'datacenter';
  const nodeId = m ? m[2] : null;

  const sel = [...document.querySelectorAll('.x-treelist-item-selected .x-treelist-item-text')].find(visible);
  const dialog = [...document.querySelectorAll('.x-window')]
    .filter(visible)
    .map((w) => w.querySelector('.x-title-text, .x-window-header-title')?.innerText.trim())
    .find(Boolean) || null;

  return { nodeType, nodeId, view: sel ? sel.innerText.trim() : null, dialog, lang: proxmoxLang() };
}

function textOf(v, lang) {
  return typeof v === 'string' ? v : v[lang] ?? v.en;
}

// trigger: { nodeType?: string[], view?: text, dialog?: text }
export function matches(trigger, ctx) {
  if (!trigger) return false;
  if (trigger.nodeType && !trigger.nodeType.includes(ctx.nodeType)) return false;
  if (trigger.view && textOf(trigger.view, ctx.lang) !== ctx.view) return false;
  if (trigger.dialog) return textOf(trigger.dialog, ctx.lang) === ctx.dialog;
  return !ctx.dialog;
}

export function onChange(cb) {
  let raf = 0;
  const run = () => { raf = 0; cb(); };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(run); };
  window.addEventListener('hashchange', schedule);
  const obs = new MutationObserver(schedule);
  obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  cb();
  return () => {
    window.removeEventListener('hashchange', schedule);
    obs.disconnect();
    if (raf) cancelAnimationFrame(raf);
  };
}
