import { init } from '../src/core/index.js';

// Testadapter: window.__pvtAlive steuert „Erweiterungs-Kontext lebt“.
window.__pvtAlive = true;
let onDead = null;
const mem = {};
init({
  isAlive: () => window.__pvtAlive,
  onInvalidated: (cb) => { onDead = cb; },
  storage: {
    get: async (k) => { if (!window.__pvtAlive) { onDead?.(); return null; } return mem[k] ?? null; },
    set: async (k, v) => { if (!window.__pvtAlive) { onDead?.(); return; } mem[k] = v; },
  },
  browserLang: 'de',
});
