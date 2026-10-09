# Lernnotizen Proxmox – Quelle für die Lektionen

Stand: 09.10.2026 · Host: ThinkPad E490, Proxmox VE (Kernel 7.0.x-pve), Architektur amd64
Diese Notizen beruhen auf echten Übungen und Fehlern vom 08.10.2026.

---

## Lektion 1: CPU-Architektur (amd64 vs. arm64)

### Worum geht es?
Jede CPU-Familie hat ihren eigenen Befehlssatz (ISA). Ein Programm wird für genau einen Befehlssatz kompiliert. Läuft es auf einer anderen Architektur, kommt: **`Exec format error`**.

| Architektur | Andere Namen | Typisch für |
|---|---|---|
| **amd64** | x86_64, x64 | Intel/AMD-PCs und Laptops, die meisten Server |
| **arm64** | aarch64 | Apple-Silicon-Macs, Raspberry Pi 4/5, Smartphones |

### Warum ist das bei Containern so wichtig?
- LXC- und Docker-Container teilen sich **Kernel und CPU des Hosts**. Template/Image muss **dieselbe Architektur** haben wie der Host.
- VMs können eine fremde Architektur nur per Emulation (QEMU) ausführen, also sehr langsam.

### Was mir passiert ist
1. Erstes Proxmox-ISO passte nicht zur Hardware → Bootfehler.
2. Template `debian-13-standard_13.6-1_arm64.tar.zst` auf einem amd64-Host:
   - Konsole: `termproxy` / „Failed to spawn"
   - `pct start 100 --debug` zeigte: `Exec format error - Failed to exec "/sbin/init"`
   - Lösung: CT löschen, arm64-Template entfernen, **amd64**-Template herunterladen.

### Befehle
```bash
uname -m                      # x86_64 oder aarch64
dpkg --print-architecture     # amd64 oder arm64
file /bin/ls                  # für welche Architektur ein Programm gebaut ist
pveam update
pveam available --section system | grep debian-13
pveam download local debian-13-standard_<version>_amd64.tar.zst
pveam remove local:vztmpl/<falsches-template>
```

### Merksatz
**Bei jedem Download (ISO, Template, Docker-Image, Binary) die Architektur im Dateinamen prüfen.**
Extra-Falle: Docker-Images auf einem Apple-Silicon-Mac bauen → `docker buildx build --platform linux/amd64 ...`

### Prüfbar über die API
- Host-Architektur: `GET /api2/json/nodes/{node}/status` (CPU-Info)
- Templates: `GET /api2/json/nodes/{node}/storage/local/content?content=vztmpl` → `volid` enthält `arm64` → Warnung

---

## Lektion 2: Snapshot & Rollback

### Worum geht es?
Ein Snapshot friert den Zustand eines Containers ein. Vor jeder riskanten Änderung (Update, Konfiguration) nimmt man einen Snapshot und kann bei Problemen zurück.

### Ablauf (so habe ich es geübt)
1. Zustand erzeugen: im Container `echo "hallo" > /root/test.txt`
2. **CT → Snapshots → Take Snapshot**, Name z. B. `vor_test`
   (Name beginnt mit Buchstaben, keine Leerzeichen, keine Umlaute)
3. Etwas kaputt machen: `rm /root/test.txt`
4. **Snapshots → `vor_test` auswählen → Rollback** (CT stoppt kurz, ggf. wieder starten)
5. Prüfen: `cat /root/test.txt` → Datei ist wieder da

### Befehle
```bash
pct snapshot <id> <name>
pct listsnapshot <id>
pct rollback <id> <name>
```

### Merksatz
**Snapshot ≠ Backup.** Ein Snapshot liegt auf derselben Platte. Stirbt die Platte, ist der Snapshot auch weg.

### Prüfbar über die API
- `GET /api2/json/nodes/{node}/lxc/{vmid}/snapshot` → Liste enthält einen Eintrag außer `current`

---

## Lektion 3: Backup & Restore

### Worum geht es?
Ein Backup (vzdump) ist eine eigenständige Datei, die man auf anderen Speicher legen und daraus den Container neu erstellen kann.

| | Snapshot | Backup |
|---|---|---|
| Wo | Gleiche Platte | Eigene Datei, idealerweise anderer Speicher |
| Wofür | Schnell zurück vor einer Änderung | Daten überleben auch einen Plattenausfall |
| Regel | Vor Änderungen | Regelmäßig, geplant |

### Ablauf
1. **CT → Backup → Backup now**: Storage `local`, Mode `Snapshot` (CT läuft weiter), Compression `ZSTD`
2. Geplant: **Datacenter → Backup → Add**: Zeit z. B. 03:00, CT auswählen, Retention **Keep Last: 3**
3. **Restore testen** (wichtigster Schritt): **local → Backups → Restore**, neue CT-ID (z. B. 101), starten, prüfen, danach löschen

### Befehle
```bash
vzdump <id> --mode snapshot --storage local --compress zstd
pct restore <neue-id> /var/lib/vz/dump/<datei>.tar.zst --storage local-lvm --unique
```
`--unique` vergibt eine neue MAC-Adresse, damit es keinen Netzwerkkonflikt mit dem Original gibt.

### Merksätze
- **Ein Backup, dessen Restore nie getestet wurde, ist kein Backup.**
- Backups auf derselben Platte sind nur eine Übung. Echter Schutz braucht einen anderen Speicher (externe Platte, NAS, Proxmox Backup Server).

### Prüfbar über die API
- `GET /api2/json/nodes/{node}/storage/local/content?content=backup` → Datei mit `vzdump-lxc-{vmid}-` vorhanden
- Geplante Jobs: `GET /api2/json/cluster/backup`

---

## Lektion 4: Debugging, wenn ein Container nicht startet

### Was mir passiert ist
- In der Weboberfläche: Konsole öffnet nicht (`termproxy`-Fehler), CT-Start „Failed to spawn".
- Die Fehlermeldung in der Oberfläche war zu allgemein. Erst der Debug-Start zeigte die Ursache.

### Vorgehen
1. Auf dem Host (Node → Shell):
   ```bash
   pct start <id> --debug 2>&1 | tail -40
   ```
2. **Die eigentliche Ursache steht meistens ganz unten.**
3. Typische Ursachen:
   - `Exec format error` → falsche Architektur (siehe Lektion 1)
   - Fehlende Features für Docker im LXC → `nesting=1,keyctl=1`
4. Konfiguration ansehen: `pct config <id>`

### Merksatz
**Nicht raten, sondern die Debug-Ausgabe lesen.** Meine erste Vermutung (Proxmox-Version passt nicht zu Debian 13) war falsch. Die Debug-Ausgabe hat die echte Ursache in einer Zeile gezeigt.

### Prüfbar über die API
- Status: `GET /api2/json/nodes/{node}/lxc/{vmid}/status/current` → `status: running`
- Letzte Tasks mit Fehlern: `GET /api2/json/nodes/{node}/tasks?errors=1&vmid={vmid}`
