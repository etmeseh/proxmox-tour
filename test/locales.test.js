import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = (f) => JSON.parse(readFileSync(new URL(`../content/locales/${f}`, import.meta.url), 'utf8'));
const langs = ['de', 'en', 'tr'];
const files = (l) => ({ ...read(`${l}.json`), ...read(`lessons.${l}.json`) });
const cat = Object.fromEntries(langs.map((l) => [l, files(l)]));
const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
const markers = (s) => [(s.match(/\*\*/g) || []).length, (s.match(/`/g) || []).length, (s.match(/\n/g) || []).length].join('/');

for (const l of ['en', 'tr']) {
  test(`${l}: dieselben Schlüssel wie de`, () => {
    const missing = Object.keys(cat.de).filter((k) => !(k in cat[l]));
    const extra = Object.keys(cat[l]).filter((k) => !(k in cat.de));
    assert.deepEqual({ missing, extra }, { missing: [], extra: [] });
  });
  test(`${l}: Platzhalter und Markup stimmen mit de überein`, () => {
    const bad = Object.keys(cat.de).filter((k) => k in cat[l] && k !== 'nav.progress'
      && (placeholders(cat.de[k]) !== placeholders(cat[l][k]) || markers(cat.de[k]) !== markers(cat[l][k])));
    assert.deepEqual(bad, []);
  });
}

test('jeder Text-Schlüssel der Lektionen/Touren existiert (Struktur ↔ Texte)', async () => {
  const dir = new URL('../content/lessons/', import.meta.url);
  const need = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const les = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
    need.push(`lesson.${les.id}.title`, `lesson.${les.id}.desc`);
    for (const s of les.steps) need.push(`lesson.${les.id}.${s.id}.title`, `lesson.${les.id}.${s.id}.body`);
  }
  const tdir = new URL('../content/tours/', import.meta.url);
  for (const f of readdirSync(tdir).filter((x) => x.endsWith('.json'))) {
    for (const s of JSON.parse(readFileSync(new URL(f, tdir), 'utf8')).steps) need.push(`${s.key}.title`, `${s.key}.body`);
  }
  for (const l of langs) assert.deepEqual(need.filter((k) => !(k in cat[l])), [], l);
});
