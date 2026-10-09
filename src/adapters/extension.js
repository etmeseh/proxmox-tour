/* global chrome */
// chrome.* nur nutzen, solange der Erweiterungs-Kontext lebt. Nach einem Reload/Update der
// Erweiterung bleibt dieses Content-Script verwaist: chrome.runtime.id ist dann leer und
// Aufrufe werfen „Extension context invalidated“.
const alive = () => {
  try { return !!chrome.runtime?.id; } catch { return false; }
};

let onDead = null;
const dead = () => { onDead?.(); return null; };
const invalidated = (e) => /context invalidated/i.test(String(e?.message || e));

export const adapter = {
  isAlive: alive,
  onInvalidated(cb) { onDead = cb; },
  storage: {
    async get(key) {
      if (!alive()) return dead();
      try { return (await chrome.storage.local.get(key))[key] ?? null; } catch (e) { if (invalidated(e)) return dead(); throw e; }
    },
    async set(key, value) {
      if (!alive()) return dead();
      try { await chrome.storage.local.set({ [key]: value }); } catch (e) { if (invalidated(e)) return dead(); throw e; }
    },
  },
  browserLang: navigator.language,
};
