/* global GM_getValue, GM_setValue */
export const adapter = {
  isAlive: () => true,
  onInvalidated() {},
  storage: {
    get: async (key) => GM_getValue(key, null),
    set: async (key, value) => GM_setValue(key, value),
  },
  browserLang: navigator.language,
};
