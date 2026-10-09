import { proxmoxLang } from './guard.js';

const visible = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';

// Text-Matcher: String oder { en, de, ... } je nach Proxmox-UI-Sprache.
function wanted(text) {
  if (text == null) return null;
  if (typeof text === 'string') return text;
  return text[proxmoxLang()] ?? text.en ?? null;
}

// spec: { css: string | string[], text?, within?, closest? } oder Liste von Specs (Fallbacks).
export function find(spec) {
  if (Array.isArray(spec) && spec.every((s) => typeof s === 'object')) {
    for (const s of spec) {
      const el = find(s);
      if (el) return el;
    }
    return null;
  }
  const selectors = Array.isArray(spec.css) ? spec.css : [spec.css];
  const root = spec.within ? document.querySelector(spec.within) : document;
  if (!root) return null;
  const text = wanted(spec.text);

  for (const sel of selectors) {
    for (const el of root.querySelectorAll(sel)) {
      if (!visible(el)) continue;
      if (text && (el.innerText || '').trim() !== text) continue;
      return spec.closest ? el.closest(spec.closest) : el;
    }
  }
  return null;
}
