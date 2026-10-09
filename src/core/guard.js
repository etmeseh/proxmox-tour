// Läuft die Seite wirklich auf Proxmox VE? (nur DOM, kein Zugriff auf Ext)
export function isProxmox() {
  return /Proxmox Virtual Environment/i.test(document.title);
}

// UI-Sprache der Proxmox-Oberfläche (für Text-Matcher), aus dem Sprach-Cookie.
export function proxmoxLang() {
  const m = document.cookie.match(/PVELangCookie=([^;]+)/);
  const code = m ? decodeURIComponent(m[1]).toLowerCase() : 'en';
  return code.split(/[-_]/)[0] || 'en';
}
