# Proxmox VE Produkttour

Driver.js-Tour für die Proxmox-VE-Weboberfläche (`https://<host>:8006`). Keine Netzwerkzugriffe, keine Serveränderungen.

    npm install
    npm run build        # dist/proxmox-tour.user.js + dist/extension/

- **Userscript:** `dist/proxmox-tour.user.js` in Tampermonkey/Violentmonkey laden.
- **Extension:** `chrome://extensions` → Entwicklermodus → „Entpackte Erweiterung laden“ → `dist/extension/`.

Touren: `content/tours/*.json` (Struktur, Selektoren), Texte: `content/locales/{de,en,tr}.json`.
Getestet mit Proxmox VE 9.2.21 (UI: Englisch).

## Benötigte Rechte (Lektionen)

Die Lektions-Checks lesen nur per GET. Welcher Endpunkt welches Recht braucht, steht in `content/permissions.json` (Quelle: PVE-API-Dokumentation). Für einen Lern-Benutzer genügt die Rolle `PVEAuditor` auf `/` (Datacenter → Permissions → Add). Fehlt ein Recht, zeigt das Panel den Endpunkt und das fehlende Recht an.
