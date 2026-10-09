// Architektur-Hilfen: Host-Architektur aus uname -m (API) und Erkennung fremder Templates.
const MAP = { x86_64: 'amd64', amd64: 'amd64', aarch64: 'arm64', arm64: 'arm64' };
const NAMES = { amd64: /(^|[^a-z0-9])(amd64|x86_64)([^a-z0-9]|$)/i, arm64: /(^|[^a-z0-9])(arm64|aarch64)([^a-z0-9]|$)/i };

export function hostArch(machine) {
  return MAP[String(machine || '').toLowerCase()] || null;
}

// Regex-String für Dateinamen anderer Architekturen (für die deklarativen Checks).
export function foreignPattern(arch) {
  if (arch === 'amd64') return '(arm64|aarch64)';
  if (arch === 'arm64') return '(amd64|x86_64)';
  return '$^'; // unbekannter Host: nichts melden
}

// Architektur, die der Dateiname nennt (oder null, wenn er keine nennt).
export function archOfName(name) {
  for (const [arch, re] of Object.entries(NAMES)) if (re.test(name)) return arch;
  return null;
}

export function isForeign(name, arch) {
  const named = archOfName(name);
  return !!arch && !!named && named !== arch;
}
