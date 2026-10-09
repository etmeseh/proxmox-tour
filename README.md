# Proxmox VE Produkttour

Driver.js-Tour für die Proxmox-VE-Weboberfläche (`https://<host>:8006`). Keine Netzwerkzugriffe, keine Serveränderungen.

    npm install
    npm run build        # dist/proxmox-tour.user.js + dist/extension/

- **Userscript:** `dist/proxmox-tour.user.js` in Tampermonkey/Violentmonkey laden.
- **Extension:** `chrome://extensions` → Entwicklermodus → „Entpackte Erweiterung laden“ → `dist/extension/`.

Touren: `content/tours/*.json` (Struktur, Selektoren), Texte: `content/locales/{de,en,tr}.json`.
Getestet mit Proxmox VE 9.2.21 (UI: Englisch).
