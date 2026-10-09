// Welcher Endpunkt braucht welches Recht? Tabelle: content/permissions.json
// (Quelle: offizielle PVE-API-Dokumentation, „Permissions“ je GET-Endpunkt).
export const TIP = { role: 'PVEAuditor', path: '/' };

export function createPermissions(table) {
  const compiled = table.map((e) => ({ ...e, re: new RegExp(e.match) }));

  // path darf eine Query enthalten. Liefert null, wenn der Endpunkt unbekannt ist.
  function describe(pathWithQuery) {
    const path = String(pathWithQuery).split('?')[0];
    for (const e of compiled) {
      const m = e.re.exec(path);
      if (!m) continue;
      const g = m.groups || {};
      const fill = (s) => (s == null ? null : s.replace(/\{(\w+)\}/g, (x, k) => g[k] ?? x));
      return {
        endpoint: e.endpoint,
        path,
        public: !!e.public,
        privs: e.privs || [],
        any: !!e.any,
        on: fill(e.on),
        limited: e.limited ? { privs: e.limited.privs, on: fill(e.limited.on) } : null,
      };
    }
    return null;
  }
  return { describe };
}
