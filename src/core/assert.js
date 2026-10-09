// Deklarative Prüfungen für Lektions-Checks (kein eval).
// spec: { any|none|all: matcher } | { count: {gte,lte} } | { path, equals|ne|contains|matches }

export function interpolate(str, vars) {
  return String(str).replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
}

function getPath(obj, path, vars) {
  // Array = feste Segmente (Schlüssel dürfen Punkte enthalten, z. B. "Sys.Audit"), String = Punkt-getrennt.
  const keys = Array.isArray(path) ? path.map((k) => interpolate(k, vars)) : path.split('.');
  return keys.reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function testOp(val, op, want) {
  switch (op) {
    case 'equals': return String(val) === String(want);
    case 'ne': return String(val) !== String(want);
    case 'gte': return Number(val) >= Number(want);
    case 'lte': return Number(val) <= Number(want);
    case 'contains': return String(val ?? '').includes(String(want));
    case 'matches': try { return new RegExp(want).test(String(val ?? '')); } catch { return false; }
    default: return false;
  }
}

function match(item, matcher, vars) {
  return Object.entries(matcher).every(([field, cond]) => {
    const val = item?.[field];
    if (cond !== null && typeof cond === 'object') {
      return Object.entries(cond).every(([op, want]) => testOp(val, op, interpolate(want, vars)));
    }
    return testOp(val, 'equals', interpolate(cond, vars));
  });
}

// Liefert { ok: boolean, detail?: string }
export function evaluate(spec, data, vars = {}) {
  if (spec.path !== undefined) {
    const val = getPath(data, spec.path, vars);
    const op = ['equals', 'ne', 'contains', 'matches', 'gte', 'lte'].find((o) => spec[o] !== undefined);
    return { ok: op ? testOp(val, op, interpolate(spec[op], vars)) : val !== undefined, detail: String(val ?? '') };
  }
  const list = Array.isArray(data) ? data : [];
  if (spec.any) return { ok: list.some((i) => match(i, spec.any, vars)) };
  if (spec.none) return { ok: !list.some((i) => match(i, spec.none, vars)) };
  if (spec.all) return { ok: list.length > 0 && list.every((i) => match(i, spec.all, vars)) };
  if (spec.count) {
    const n = list.length;
    return { ok: Object.entries(spec.count).every(([op, want]) => testOp(n, op, want)), detail: String(n) };
  }
  return { ok: false, detail: 'unbekannte Prüfung' };
}
