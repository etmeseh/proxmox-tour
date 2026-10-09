import de from '../../content/locales/de.json';
import en from '../../content/locales/en.json';
import tr from '../../content/locales/tr.json';
import lessonsDe from '../../content/locales/lessons.de.json';
import lessonsEn from '../../content/locales/lessons.en.json';
import lessonsTr from '../../content/locales/lessons.tr.json';

// Lektionstexte je Sprache in lessons.<lang>.json; fehlende Schlüssel fallen auf en, dann de zurück.
const catalogs = { de: { ...de, ...lessonsDe }, en: { ...en, ...lessonsEn }, tr: { ...tr, ...lessonsTr } };
export const languages = Object.keys(catalogs);

export function pickLanguage(saved, browser) {
  if (saved && catalogs[saved]) return saved;
  const b = (browser || 'en').slice(0, 2).toLowerCase();
  return catalogs[b] ? b : 'en';
}

// Fallback-Kette: gewählte Sprache → Englisch → Deutsch (Lektionen).
export function t(lang, key, vars) {
  const val = catalogs[lang]?.[key] ?? catalogs.en[key] ?? catalogs.de[key];
  if (val == null) console.warn('[proxmox-tour] fehlender i18n-Key:', key);
  const text = val ?? key;
  return vars ? text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m)) : text;
}
