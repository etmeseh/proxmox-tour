# proxmox-tour

Driver.js-Tour und Lektionen für die Proxmox-VE-Weboberfläche. Build: `npm run build`, Tests: `node --test test/`.

## Git-Workflow

- Nach jedem abgeschlossenen Schritt: kleiner Commit mit klarer deutscher Nachricht (Präfix `feat`/`fix`/`docs`/`refactor`/`chore`), danach `git push`.
- Die `Co-Authored-By`-Zeile für Claude bleibt in jedem Commit erhalten (Transparenz: sichtbar, was mit KI entstanden ist).
- Keine Rewrites der Historie: kein squash, kein rebase auf gepushte Commits, kein force-push, kein `--date`.
- Vor jedem Push ein kurzer Secret-Check: `gitleaks dir . --no-banner --redact` und `gitleaks git . --no-banner --redact`.
- Fehler und Fixes bleiben sichtbar in der Historie (Fehler per eigenem `fix:`-Commit beheben, nicht verstecken).
- Git-Identität nur lokal im Repo setzen, nicht global.
- Das Passwort des lab-Benutzers und andere Zugangsdaten gehören nie ins Repo (weder im Code noch in Docs, Tests oder Screenshots).
