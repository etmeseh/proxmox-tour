// Read-only-Client für die Proxmox-API. Nur GET, nur same-origin, nur /api2/json.
// Schreibende Methoden gibt es hier absichtlich nicht.
const SAFE_PATH = /^\/[A-Za-z0-9_\-\/.:,=&?%]*$/;

export function createApi(fetchImpl = (...a) => fetch(...a)) {
  async function get(path) {
    if (typeof path !== 'string' || !SAFE_PATH.test(path) || path.includes('..') || path.startsWith('//')) {
      throw new Error(`api: ungültiger Pfad: ${path}`);
    }
    let res;
    try {
      res = await fetchImpl(`/api2/json${path}`, { method: 'GET', credentials: 'same-origin', headers: { Accept: 'application/json' } });
    } catch (e) {
      return { ok: false, status: 0, data: null, error: String(e) };
    }
    let data = null;
    try { data = (await res.json()).data ?? null; } catch { /* keine JSON-Antwort */ }
    return { ok: res.ok, status: res.status, data };
  }
  return { get };
}
