# Project Nemo

*In Liebe für meinen Chihuahua Nemo, der tapfer gegen die Beschwerden des Alters ankämpft. (Geb. 20.01.2015)*

Ein selbst-hostbares, datenschutzorientiertes Tier-Dokumentationssystem. Tierarztbesuche, Medikamente, Impfungen, Kot- und Verhaltenstagebücher, Futterpläne, Blutbilder und mehr – alles an einem Ort, vollständig auf eigener Infrastruktur betrieben.

---

## Inhaltsverzeichnis

- [Funktionen](#funktionen)
- [Schnellstart](#schnellstart)
- [Konfiguration](#konfiguration)
- [Port ändern](#port-ändern)
- [FTP-Zugang (Plugin-Ordner)](#ftp-zugang-plugin-ordner)
- [Plugin-Entwicklung](#plugin-entwicklung)
- [Tier-Export & -Import](#tier-export---import)
- [Admin-Handbuch](#admin-handbuch)
- [Entwicklung ohne Docker](#entwicklung-ohne-docker)
- [Sicherheitshinweise](#sicherheitshinweise)
- [Lizenz](#lizenz)

---

## Funktionen

### Für Nutzer
| Funktion | Beschreibung |
|---|---|
| **Tierprofile** | Name, Tierart, Rasse, Geschlecht, Gewicht, Mikrochip-Nr., Foto |
| **Tierarztbesuche** | Vergangene und zukünftige Termine mit Grund, Diagnose, Behandlung, Kosten |
| **Medikamente** | Medikamentenpläne mit Dosierung, Häufigkeit und Zeitraum |
| **Blutbilder** | PDFs hochladen, ansehen und herunterladen, mit Bewertung |
| **Kottagebuch** | Tageseinträge mit Bewertung 1–5, Konsistenz, Blut-/Schleim-Kennzeichnung, Fotos |
| **Verhaltenstagebuch** | Tageseinträge mit Bewertung 1–5, Kategorie, Fotos |
| **Futterplan** | Mehrere Pläne mit Mahlzeiten, Futterarten und Mengen |
| **Impfplan** | Impfeinträge mit Fälligkeitswarnungen und E-Mail-Erinnerungen |
| **Ereignisse** | Sonstige Ereignisse (Pflege, Reise, Operation usw.) mit Erinnerungen |
| **Gewichtstagebuch** | Gewichtsverlauf mit Trendanzeige und Diagramm |
| **Kalender** | Vollständige Kalenderansicht aller Termine aller Tiere |
| **Dashboard** | Übersicht: nächste Termine, aktive Medikamente, 7-Tage-Trends |
| **Statistiken** | Trenddiagramme (Tagesdurchschnitt) und Tageszeitenmuster für Kot/Verhalten/Gewicht |
| **Excel-Export** | Export aller Tagebücher und Einträge als `.xlsx` |
| **Kalender-Synchronisation** | Kalender per ICS/WebCal-URL in jeder Kalender-App abonnieren |
| **E-Mail-Erinnerungen** | Automatische Erinnerungsmail für Tierarzttermine, Impfungen und Ereignisse |
| **Konto-Verwaltung** | E-Mail, Passwort ändern und eigenes Konto löschen |
| **Tier-Export/Import** | Vollständigen Tier-Datensatz als ZIP exportieren und auf anderer Instanz importieren |

### Für Admins
| Funktion | Beschreibung |
|---|---|
| **Nutzerverwaltung** | Nutzer anlegen, bearbeiten (inkl. E-Mail), aktivieren/deaktivieren — kein Zugriff auf Tierdaten |
| **Plugin-Manager** | Plugins per ZIP-Upload installieren, aktualisieren, deinstallieren und aktivieren/deaktivieren |
| **SMTP-Einstellungen** | Ausgehende E-Mail konfigurieren mit Testfunktion |
| **App-Einstellungen** | Registrierung, E-Mail-Verifikation und Passwort-Reset steuern |
| **Branding & SEO** | App-Name, Logo, Favicon und Meta-Tags anpassen |

---

## Schnellstart

### Voraussetzungen
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)

### 1. Klonen und konfigurieren

```bash
git clone https://github.com/CaptainN3ro/project-nemo.git
cd project-nemo

# Beispiel-Umgebungsdatei kopieren
cp .env.example .env
```

### 2. `.env` anpassen

Mindestens folgende Werte ändern:

```env
# Datenbankpasswörter
DB_ROOT_PASSWORD=sicheres_root_passwort
DB_PASSWORD=sicheres_db_passwort

# Sicherheits-Secrets — VOR dem Live-Betrieb unbedingt ändern!
JWT_SECRET=zufaelliger_32+_zeichen_string
JWT_REFRESH_SECRET=anderer_zufaelliger_32+_zeichen_string
ENCRYPTION_KEY=genau_32_zeichen_langer_schluessel

# FTP-Zugangsdaten für den Plugin-Ordner
FTP_PASS=sicheres_ftp_passwort
```

> **Sichere Secrets erzeugen:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### 3. Starten

```bash
docker compose up -d
```

> **Wichtig: Datensicherung**
> `docker compose down` stoppt Container — **Daten bleiben erhalten**.
> `docker compose down -v` löscht zusätzlich alle Volumes (**Datenbank, Uploads, Plugins weg!**).
> Für Updates immer nur `docker compose down` (ohne `-v`) verwenden.
>
> Backup der Uploads:
> ```bash
> docker run --rm -v nemo_uploads_data:/data -v $(pwd):/backup alpine \
>   tar czf /backup/uploads-backup.tar.gz -C /data .
> ```

Beim ersten Start wird ein Standard-Admin-Konto angelegt:

| Feld | Wert |
|---|---|
| E-Mail | `admin@example.com` |
| Passwort | `admin123` |

> **Passwort und E-Mail nach dem ersten Login sofort ändern!**

### 4. App aufrufen

Browser öffnen: **http://localhost** (oder der konfigurierte Port)

---

## Konfiguration

Die gesamte Konfiguration erfolgt über die `.env`-Datei:

```env
# ── Datenbank ────────────────────────────────────────────────
DB_ROOT_PASSWORD=rootpassword      # MySQL-Root-Passwort
DB_NAME=project_nemo               # Datenbankname
DB_USER=nemo                       # Datenbankbenutzer
DB_PASSWORD=nemopassword           # Datenbankpasswort

# ── Sicherheit (UNBEDINGT ÄNDERN!) ──────────────────────────
JWT_SECRET=...                     # Access-Token-Secret (mind. 32 Zeichen)
JWT_REFRESH_SECRET=...             # Refresh-Token-Secret (mind. 32 Zeichen)
ENCRYPTION_KEY=...                 # AES-256-Schlüssel für SMTP-Passwort (genau 32 Zeichen)

# ── App ─────────────────────────────────────────────────────
APP_PORT=80                        # Port, unter dem die App erreichbar ist
FRONTEND_URL=http://localhost      # Vollständige URL der App (wird in E-Mails verwendet)

# Für eigene Domain:
# FRONTEND_URL=https://nemo.meinedomain.de

# --- VITE_API_URL Erklärung ---
# Vite ist das Build-Tool, das das React-Frontend für den Browser kompiliert.
# VITE_API_URL gibt dem Frontend die Backend-API-Adresse bekannt.
#
# Leer lassen (empfohlen): nginx im Client-Container leitet alle
# /api-Anfragen automatisch an den Backend-Container weiter. Das Frontend
# ruft einfach /api/... relativ zur eigenen Domain auf — keine URL nötig.
#
# Nur setzen, wenn Frontend und Backend auf völlig getrennten Domains laufen:
# VITE_API_URL=https://api.meinedomain.de
VITE_API_URL=

# ── FTP ─────────────────────────────────────────────────────
SERVER_HOST=localhost              # IP/Hostname des Servers (für FTP-Passivmodus)
FTP_USER=nemo_ftp                  # FTP-Benutzername
FTP_PASS=changeme_ftp_pass        # FTP-Passwort
```

---

## Port ändern

### Web-Port ändern (Standard: 80)

In `.env`:
```env
APP_PORT=8080
```

Neustart: `docker compose up -d`
Erreichbar unter: `http://localhost:8080`

### Backend-API-Port

Das Backend läuft intern auf Port `3001` und ist standardmäßig nicht nach außen freigegeben — der gesamte Datenverkehr läuft über den nginx-Proxy im `client`-Container.

Um das Backend direkt freizugeben, in `docker-compose.yml` unter `server` hinzufügen:
```yaml
ports:
  - "3001:3001"
```

### Hinter einem Reverse Proxy betreiben (nginx/Traefik)

`ports` beim `client`-Container entfernen und über den eigenen Reverse Proxy freigeben. Dann setzen:
```env
FRONTEND_URL=https://nemo.meinedomain.de
```

---

## FTP-Zugang (Plugin-Ordner)

Der `plugins/`-Ordner ist per FTP zugänglich, sodass Plugin-Dateien ohne SSH-Zugang verwaltet werden können.

### Verbindung mit einem FTP-Client

| Einstellung | Wert |
|---|---|
| Host | IP-Adresse oder Hostname des Servers |
| Port | `21` |
| Benutzername | Wert von `FTP_USER` in `.env` |
| Passwort | Wert von `FTP_PASS` in `.env` |
| Modus | **Passiv (PASV)** |
| Passiver Portbereich | `21100–21110` |

**Empfohlener FTP-Client:** [FileZilla](https://filezilla-project.org/)

### FileZilla-Schnelleinrichtung
1. FileZilla öffnen → Servermanager → Neue Verbindung
2. Protokoll: FTP
3. Host: `server-ip`
4. Port: `21`
5. Verbindungsart: Normal
6. Benutzer/Passwort: aus `.env`
7. Übertragungseinstellungen → Übertragungsmodus: **Passiv**

> Bei Verbindung von außerhalb eines LANs sicherstellen, dass Ports `21` und `21100–21110` in der Firewall geöffnet sind und `SERVER_HOST` auf die öffentliche IP gesetzt ist.

---

## Plugin-Entwicklung

Plugins erweitern den Funktionsumfang von Project Nemo. Sie werden als `.zip`-Datei verteilt und über das Admin-Panel installiert. Eine vollständig kommentierte Referenzimplementierung liegt unter [`plugins/example-plugin/`](plugins/example-plugin/) — sie demonstriert alle in diesem Abschnitt beschriebenen Funktionen.

### Plugin-Struktur

```
mein-plugin/
├── .gitignore              # Empfohlen: node_modules, .env ausschließen
├── manifest.json           # Pflicht: Plugin-Metadaten
├── server/
│   ├── public.js           # Express-Router — Nutzer-Routen
│   └── admin.js            # Express-Router — nur Admin-Routen
├── assets/
│   └── icon.svg            # Plugin-Icon (Sidebar und Admin-Panel)
├── migrations/
│   ├── install.sql         # SQL bei Installation ausgeführt
│   ├── update.sql          # SQL bei Aktualisierung ausgeführt (optional)
│   └── uninstall.sql       # SQL bei Deinstallation ausgeführt (Tabellen löschen!)
└── html/
    ├── index.html          # Frontend für placement "top" (optional)
    └── pet.html            # Frontend für placement "pet" (optional)
```

### manifest.json

```json
{
  "name": "mein-plugin",
  "shortName": "Mein Plugin",
  "longName": "Vollständiger Plugin-Name",
  "version": "1.0.0",
  "author": "Dein Name",
  "authorLink": "https://deine-website.de",
  "description": "Was dieses Plugin macht.",
  "icon": "assets/icon.svg",
  "menuItem": {
    "placement": "top"
  }
}
```

| Feld | Pflicht | Beschreibung |
|---|---|---|
| `name` | Pflicht | Eindeutiger Bezeichner. **Nur Kleinbuchstaben, Bindestriche und Unterstriche.** Wird als URL-Pfad verwendet. |
| `shortName` | Pflicht | Kurze Bezeichnung im Sidebar-Menü |
| `longName` | Pflicht | Vollständiger Name im Plugin-Manager |
| `version` | — | Semantische Versionsnummer |
| `author` | — | Name des Autors |
| `authorLink` | — | Link zur Website des Autors |
| `description` | — | Beschreibung im Plugin-Manager |
| `icon` | — | Pfad zum Icon (relativ zum Plugin-Root) |
| `menuItem.placement` | — | `"top"` (Standard) oder `"pet"` — siehe unten |

### Menü-Platzierung

| Wert | Verhalten |
|---|---|
| `"top"` (Standard) | Erscheint als **Sidebar-Haupteintrag**. Lädt `html/index.html` unter Route `/plugin/mein-plugin`. |
| `"pet"` | Erscheint als **Tab in der Tier-Detailseite**. Lädt `html/pet.html?petId=:id&token=:jwt`. |

---

### server/public.js — Nutzer-Routen

Eingehängt unter: `/api/plugins/mein-plugin`

> **Modul-Auflösung:** `SERVER_SRC_PATH` wird von `app.js` beim Start gesetzt, damit Plugins Server-Module importieren können ohne Pfade hart zu kodieren (Entwicklung: `server/src/`, Docker: `/app/src/`). Den `req()`-Helfer für npm-Pakete aus dem Server-`node_modules` verwenden.

```javascript
const router = require('express').Router();
const path   = require('path');
const fs     = require('fs');

// ── Modul-Auflösung ────────────────────────────────────────────────────────
const serverSrc     = process.env.SERVER_SRC_PATH || path.join(__dirname, '../../../server/src');
const serverModules = path.join(serverSrc, '../node_modules');

function req(name) {
  try { return require(require.resolve(name, { paths: [serverModules] })); }
  catch { return require(name); }
}

// Server-Middleware
const { authenticate } = require(path.join(serverSrc, 'middleware/auth'));

// Datenbank (rohes SQL — kein Sequelize-Modell in Plugins nötig)
const { sequelize }  = require(path.join(serverSrc, 'config/database'));
const { QueryTypes } = req('sequelize');

// Datei-Upload
const multer         = req('multer');
const { v4: uuidv4 } = req('uuid');
// ──────────────────────────────────────────────────────────────────────────

// ── Datei-Upload-Konfiguration ─────────────────────────────────────────────
// process.env.UPLOAD_DIR wird von app.js immer gesetzt bevor Plugins geladen werden.
// Der Fallback nutzt SERVER_SRC_PATH für korrekte Auflösung in Docker und Entwicklung.
// HINWEIS: KEINE __dirname-relativen Pfade wie '../../../../uploads' verwenden —
//     der Pfad von Plugin-Dateien zum Uploads-Ordner unterscheidet sich zwischen
//     Docker und Entwicklung und würde auf das falsche Verzeichnis zeigen.
const UPLOAD_DIR = process.env.UPLOAD_DIR
  || path.join(process.env.SERVER_SRC_PATH || path.join(__dirname, '../../../server/src'), '../uploads');
const PLUGIN_DIR = path.join(UPLOAD_DIR, 'mein-plugin');
fs.mkdirSync(PLUGIN_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, PLUGIN_DIR),
    filename:    (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`)
  }),
  limits: { fileSize: 10 * 1024 * 1024 }  // 10 MB
});
// Dateien erreichbar unter: /uploads/mein-plugin/<uuid>.<ext>

// ── Alle Routen erfordern Authentifizierung ────────────────────────────────
router.use(authenticate);

// GET — Liste (gefiltert auf eingeloggten Nutzer, Eigentümer-Prüfung)
router.get('/items', async (req, res) => {
  try {
    const rows = await sequelize.query(
      'SELECT * FROM my_plugin_table WHERE user_id = ? ORDER BY created_at DESC',
      { replacements: [req.user.id], type: QueryTypes.SELECT }
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST — anlegen mit optionalem Datei-Upload
router.post('/items', upload.single('file'), async (req, res) => {
  try {
    const { title } = req.body;
    if (!title?.trim()) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Titel ist erforderlich.' });
    }
    const filePath = req.file ? `/uploads/mein-plugin/${req.file.filename}` : null;
    await sequelize.query(
      'INSERT INTO my_plugin_table (user_id, title, file_path) VALUES (?, ?, ?)',
      { replacements: [req.user.id, title.trim(), filePath] }
    );
    const [row] = await sequelize.query(
      'SELECT * FROM my_plugin_table WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      { replacements: [req.user.id], type: QueryTypes.SELECT }
    );
    res.status(201).json(row);
  } catch (e) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: e.message });
  }
});

// PUT — aktualisieren (Eigentümer-Prüfung)
router.put('/items/:id', async (req, res) => {
  try {
    const [row] = await sequelize.query(
      'SELECT * FROM my_plugin_table WHERE id = ? AND user_id = ?',
      { replacements: [req.params.id, req.user.id], type: QueryTypes.SELECT }
    );
    if (!row) return res.status(404).json({ error: 'Nicht gefunden.' });
    await sequelize.query(
      'UPDATE my_plugin_table SET title = ? WHERE id = ?',
      { replacements: [req.body.title ?? row.title, req.params.id] }
    );
    res.json({ ...row, title: req.body.title ?? row.title });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE — Zeile + Datei löschen (Eigentümer-Prüfung)
router.delete('/items/:id', async (req, res) => {
  try {
    const [row] = await sequelize.query(
      'SELECT * FROM my_plugin_table WHERE id = ? AND user_id = ?',
      { replacements: [req.params.id, req.user.id], type: QueryTypes.SELECT }
    );
    if (!row) return res.status(404).json({ error: 'Nicht gefunden.' });
    if (row.file_path) {
      const abs = path.join(PLUGIN_DIR, path.basename(row.file_path));
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
    }
    await sequelize.query('DELETE FROM my_plugin_table WHERE id = ?', { replacements: [req.params.id] });
    res.json({ message: 'Gelöscht.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET — Datei-Download (Eigentümer-Prüfung)
router.get('/items/:id/download', async (req, res) => {
  try {
    const [row] = await sequelize.query(
      'SELECT * FROM my_plugin_table WHERE id = ? AND user_id = ?',
      { replacements: [req.params.id, req.user.id], type: QueryTypes.SELECT }
    );
    if (!row || !row.file_path) return res.status(404).json({ error: 'Nicht gefunden.' });
    const abs = path.join(PLUGIN_DIR, path.basename(row.file_path));
    if (!fs.existsSync(abs)) return res.status(404).json({ error: 'Datei fehlt.' });
    res.download(abs, row.original_filename || 'datei');
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
```

### server/admin.js — Admin-Routen

Eingehängt unter: `/api/admin/plugins/mein-plugin`

```javascript
const router = require('express').Router();
const path   = require('path');

const serverSrc     = process.env.SERVER_SRC_PATH || path.join(__dirname, '../../../server/src');
const serverModules = path.join(serverSrc, '../node_modules');
function req(name) {
  try { return require(require.resolve(name, { paths: [serverModules] })); }
  catch { return require(name); }
}

const { authenticate } = require(path.join(serverSrc, 'middleware/auth'));
const { requireAdmin } = require(path.join(serverSrc, 'middleware/roleCheck'));
const { sequelize }    = require(path.join(serverSrc, 'config/database'));
const { QueryTypes }   = req('sequelize');

router.use(authenticate, requireAdmin);

// Statistiken über alle Nutzer
router.get('/stats', async (req, res) => {
  try {
    const [stats] = await sequelize.query(
      'SELECT COUNT(*) AS total, COUNT(DISTINCT user_id) AS users FROM my_plugin_table',
      { type: QueryTypes.SELECT }
    );
    res.json(stats);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Plugin-Einstellungen lesen (Singleton-Zeile, id = 1)
router.get('/settings', async (req, res) => {
  try {
    const [s] = await sequelize.query(
      'SELECT * FROM my_plugin_settings WHERE id = 1',
      { type: QueryTypes.SELECT }
    );
    res.json(s || {});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Plugin-Einstellungen speichern
router.put('/settings', async (req, res) => {
  try {
    await sequelize.query(
      'UPDATE my_plugin_settings SET some_value = ? WHERE id = 1',
      { replacements: [req.body.some_value] }
    );
    res.json({ message: 'Gespeichert.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
```

### html/index.html — Haupt-Plugin-Frontend

Wird in einem iframe unter `/plugin/mein-plugin` geladen. Der JWT wird von der `PluginFrame`-Komponente als URL-Parameter übergeben.

```html
<script>
  const token = new URLSearchParams(location.search).get('token') || '';

  // Authentifizierter API-Aufruf
  async function apiFetch(path, opts = {}) {
    const res = await fetch('/api/plugins/mein-plugin' + path, {
      ...opts,
      headers: { 'Authorization': `Bearer ${token}`, ...(opts.headers || {}) }
    });
    if (!res.ok) throw new Error((await res.json()).error || `HTTP ${res.status}`);
    return res.json();
  }

  // Datei-Upload (multipart)
  async function uploadFile(file, title) {
    const fd = new FormData();
    fd.append('file',  file);
    fd.append('title', title);
    const res = await fetch('/api/plugins/mein-plugin/items', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: fd
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  }
</script>
```

### html/pet.html — Tier-Plugin-Frontend

Wird als Tab in der Tier-Detailseite geladen. Erhält sowohl `petId` als auch `token`.

```html
<script>
  const params = new URLSearchParams(location.search);
  const petId  = params.get('petId');   // ID des aktuellen Tiers
  const token  = params.get('token');   // JWT für API-Aufrufe

  // Daten für dieses spezifische Tier abrufen
  async function fetchPetItems() {
    const res = await fetch(`/api/plugins/mein-plugin/pets/${petId}/items`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.json();
  }
</script>
```

### migrations/install.sql

```sql
CREATE TABLE IF NOT EXISTS my_plugin_table (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  pet_id     INT,
  data       TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (pet_id)  REFERENCES pets(id)  ON DELETE CASCADE
);
```

### migrations/uninstall.sql

> **Tabellen hier immer löschen.** Wird bei der Deinstallation ausgeführt.

```sql
DROP TABLE IF EXISTS my_plugin_table;
```

### ZIP bauen

```bash
# Linux / macOS
cd plugins/
zip -r mein-plugin-v1.0.0.zip mein-plugin/
```

```powershell
# Windows (PowerShell)
Compress-Archive -Path plugins\mein-plugin\* -DestinationPath mein-plugin-v1.0.0.zip
```

> Das ZIP muss die Plugin-Dateien auf der **Root-Ebene** oder in einem einzigen Unterordner enthalten — beides wird automatisch erkannt.

### Plugin installieren

1. **Admin → Plugins** öffnen
2. ZIP-Datei hineinziehen (oder klicken zum Durchsuchen)
3. Das Plugin wird sofort installiert und die Routen geladen — kein Server-Neustart nötig

### Plugin aktualisieren

Ein ZIP mit demselben `name` in `manifest.json` hochladen — das System erkennt es automatisch als Aktualisierung:

1. `migrations/update.sql` wird ausgeführt (falls vorhanden) — **vor** dem Austausch der Dateien
2. Das Plugin-Verzeichnis wird atomar durch die neue Version ersetzt
3. Der DB-Eintrag (Version, Beschreibung, Icon …) wird aktualisiert
4. Routen werden aus dem neuen Code neu geladen

> Vorhandene Datentabellen werden **nicht angefasst**, es sei denn `update.sql` ändert sie explizit. Daten bleiben immer erhalten.

**`migrations/update.sql` — idempotente Statements schreiben:**

Jede Anweisung muss **sicher mehrfach ausführbar** sein, da die Datei bei jedem Update erneut läuft.

```sql
-- migrations/update.sql  (v1.0 → v1.1)
-- Wird ausgeführt wenn dasselbe Plugin erneut als ZIP hochgeladen wird.
-- WICHTIG: Jede Anweisung muss idempotent sein (sicher mehrfach ausführbar).

-- Neue Spalte hinzufügen (IF NOT EXISTS verhindert Fehler bei Wiederholung)
ALTER TABLE my_plugin_table
  ADD COLUMN IF NOT EXISTS pet_id INT NULL;

-- Weitere Spalte mit Standardwert
ALTER TABLE my_plugin_table
  ADD COLUMN IF NOT EXISTS priority TINYINT NOT NULL DEFAULT 0;

-- Neue Tabelle anlegen (IF NOT EXISTS — sicher bei Wiederholung)
CREATE TABLE IF NOT EXISTS my_plugin_tags (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  item_id    INT NOT NULL,
  tag        VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES my_plugin_table(id) ON DELETE CASCADE
);

-- Index hinzufügen (MySQL 8.0.29+ unterstützt IF NOT EXISTS für Indizes)
-- Für ältere Versionen: über information_schema prüfen oder Fehler ignorieren
CREATE INDEX IF NOT EXISTS idx_my_plugin_pet ON my_plugin_table (pet_id);

-- Spaltentyp ändern (immer idempotent, da ALTER COLUMN das Ergebnis überschreibt)
-- ALTER TABLE my_plugin_table MODIFY COLUMN description TEXT;

-- Datensätze befüllen die durch die neue Spalte entstehen
-- (nur wenn noch nicht vorhanden, sonst doppelte Daten)
-- INSERT IGNORE INTO my_plugin_tags (item_id, tag)
--   SELECT id, 'migriert' FROM my_plugin_table WHERE pet_id IS NOT NULL;
```

> **Nicht in update.sql tun:** Keine `DROP TABLE` oder `DROP COLUMN` — das gehört in `uninstall.sql`. Keine Statements die bei Wiederholung Fehler werfen (z.B. `ALTER TABLE ADD COLUMN` ohne `IF NOT EXISTS`).

Bei der Deinstallation läuft weiterhin `uninstall.sql` und löscht alle Plugin-Tabellen.

### Export / Import-Hooks

Plugins können am **Tier-Export & -Import** teilnehmen, indem sie zwei benannte Funktionen aus ihrem `public.js`-Router exportieren:

```javascript
// Beide Hooks sind OPTIONAL.
// Fehlen sie, läuft Export/Import ohne die Daten dieses Plugins weiter — kein Fehler.

router.exportPetData = async function(petId, userId, uploadDir, filesToAdd) {
  // 1. Tier-bezogene Daten abfragen:
  const rows = await sequelize.query(
    'SELECT * FROM my_table WHERE pet_id = ? AND user_id = ?',
    { replacements: [petId, userId], type: QueryTypes.SELECT }
  );
  if (!rows.length) return null; // null = Plugin im ZIP überspringen

  // 2. Dateien zum ZIP hinzufügen:
  for (const row of rows) {
    if (row.file_path) {
      filesToAdd.push({
        diskPath:    path.join(uploadDir, 'mein-plugin', path.basename(row.file_path)),
        archivePath: `files/plugins/mein-plugin/${path.basename(row.file_path)}`
      });
    }
  }

  // 3. Daten zurückgeben (werden als plugins/mein-plugin.json im ZIP gespeichert):
  return { rows };
};

router.importPetData = async function(newPetId, userId, data, zip, uploadDir, fileMap) {
  // data     = geparster Inhalt von plugins/mein-plugin.json aus dem ZIP
  // fileMap  = { original_basename: archive_entry_name } für alle files/* im ZIP
  // zip      = AdmZip-Instanz — zip.getEntry(path) zum Extrahieren von Dateien nutzen

  for (const row of data.rows || []) {
    let newFilePath = null;
    if (row.file_path) {
      const entry = zip.getEntry(fileMap[path.basename(row.file_path)]);
      if (entry) {
        const newName = `${require('uuid').v4()}${path.extname(row.file_path)}`;
        fs.writeFileSync(path.join(uploadDir, 'mein-plugin', newName), entry.getData());
        newFilePath = `/uploads/mein-plugin/${newName}`;
      }
    }
    await sequelize.query(
      'INSERT INTO my_table (pet_id, user_id, ..., file_path) VALUES (?, ?, ..., ?)',
      { replacements: [newPetId, userId, ..., newFilePath] }
    );
  }
};
```

**Verhalten ohne Hooks:**

| Szenario | Verhalten |
|---|---|
| `exportPetData` fehlt oder gibt `null` zurück | Plugin wird stillschweigend übersprungen; kein Eintrag im ZIP |
| `importPetData` fehlt | Plugin-Daten im ZIP werden übersprungen; das Tier wird trotzdem vollständig importiert |
| Plugin auf Zielinstanz nicht installiert | Plugin-Daten werden übersprungen |
| Hook wirft einen Fehler | Fehler wird geloggt; Export/Import läuft weiter |

Funktionierende Referenzimplementierungen: [`plugins/example-plugin/server/public.js`](plugins/example-plugin/server/public.js) und [`plugins/photo-album/server/public.js`](plugins/photo-album/server/public.js).

---

## Tier-Export & -Import

Jedes Tier kann als selbst-enthaltenes ZIP exportiert und auf jeder anderen Project-Nemo-Instanz importiert werden.

### Tier exportieren

1. Tier-Detailseite öffnen
2. **„Exportieren"** neben dem Tiernamen klicken
3. ZIP-Datei wird sofort heruntergeladen

**Inhalt des ZIPs:**

```
nemo-export-Nemo-2026-06-02.zip
├── manifest.json          ← Version, Exportdatum, Tiername, enthaltene Plugins
├── data.json              ← Alle Kern-Tierdaten (ohne IDs, ohne Nutzerreferenzen)
├── files/
│   ├── images/            ← Profilfoto, Kot- und Verhaltensbilder
│   ├── bloodwork/         ← Blutbild-PDFs
│   └── plugins/
│       └── fotoalbum/     ← Plugin-spezifische Dateien (wenn Plugin Export unterstützt)
└── plugins/
    └── photo-album.json   ← Plugin-DB-Daten (wenn Plugin Export unterstützt)
```

Alle Dateireferenzen in `data.json` beziehen sich auf das `files/`-Verzeichnis — das ZIP ist vollständig in sich geschlossen.

### Tier importieren

1. **Meine Tiere** öffnen
2. **„Importieren"** klicken
3. ZIP-Datei auswählen — das Tier wird sofort angelegt und die Seite öffnet sich direkt

**Import-Regeln:**

- Das Tier wird immer **neu angelegt** — vorhandene Tiere werden nie überschrieben
- Alle Dateien erhalten neue UUIDs um Konflikte zu vermeiden
- Plugin-Daten werden nur importiert, wenn das **Plugin auf der Zielinstanz installiert und aktiv** ist
- Fehlt ein Plugin, werden seine Daten stillschweigend übersprungen — das Tier und alle Kerndaten werden trotzdem importiert
- Fehler in einzelnen Plugin-Import-Hooks werden geloggt, brechen den Import aber nicht ab

---

## Admin-Handbuch

### Erster Login

Standard-Zugangsdaten werden beim ersten Start in den Server-Logs ausgegeben:
```
Default admin created: admin@example.com / admin123 — CHANGE THIS PASSWORD!
```

### Nutzerverwaltung

- Admins können Nutzer anlegen, bearbeiten und deaktivieren
- **Admins haben keinen Zugriff auf Tierdaten** — Nutzerdaten sind pro Konto isoliert
- Deaktivierte Nutzer können sich nicht anmelden, Daten bleiben erhalten
- Deaktivierte Nutzer können über „Endgültig löschen" dauerhaft entfernt werden (löscht alle zugehörigen Daten)

### App-Einstellungen (Admin → Einstellungen)

| Einstellung | Beschreibung |
|---|---|
| **Registrierung erlauben** | „Registrieren"-Button auf der Login-Seite anzeigen |
| **Registrierung mit E-Mail-Bestätigung** | Neue Nutzer müssen ihre E-Mail bestätigen. Erfordert aktives SMTP. |
| **Passwort vergessen** | „Passwort vergessen?"-Link auf der Login-Seite anzeigen. Erfordert aktives SMTP. |

### Branding & SEO (Admin → Branding & SEO)

| Einstellung | Beschreibung |
|---|---|
| **App-Name** | Ersetzt „Project Nemo" überall (Sidebar, Login, Browser-Tab) |
| **Logo** | Bild-Upload für Sidebar-Header und Login-Seite |
| **Favicon** | Bild-Upload für den Browser-Tab |
| **SEO-Titel** | `<title>`-Tag im Browser |
| **Meta-Beschreibung** | `<meta name="description">` für Suchmaschinen |
| **Indexierung** | Toggle für `robots: index,follow` vs. `noindex,nofollow` |

### SMTP-Konfiguration (Admin → SMTP / E-Mail)

Erforderlich für: E-Mail-Verifikation, Passwort-Reset und Termin-Erinnerungen.

1. **Admin → SMTP / E-Mail** öffnen
2. SMTP-Server-Daten eingeben
3. **Test-E-Mail senden** zur Überprüfung
4. Toggle **„E-Mail-Versand aktivieren"** einschalten

**Häufige SMTP-Anbieter:**

| Anbieter | Host | Port | TLS |
|---|---|---|---|
| Gmail | `smtp.gmail.com` | `587` | ja |
| Outlook | `smtp-mail.outlook.com` | `587` | ja |
| Mailgun | `smtp.mailgun.org` | `587` | ja |
| Eigener Server | eigener Mailserver | `587` oder `465` | abhängig |

> Für Gmail ggf. ein [App-Passwort](https://support.google.com/accounts/answer/185833) erstellen.

---

## Entwicklung ohne Docker

### Voraussetzungen
- Node.js 20+
- MySQL 8

### Backend

```bash
cd server
npm install
cp ../.env.example .env
# .env mit lokalen DB-Zugangsdaten anpassen
npm run dev   # Startet auf http://localhost:3001
```

### Frontend

```bash
cd client
npm install
npm run dev   # Startet auf http://localhost:5173
```

Der Vite-Dev-Server leitet `/api` automatisch an `localhost:3001` weiter.

---

## Sicherheitshinweise

- **JWT-Token** laufen nach 15 Minuten ab; Refresh-Token nach 7 Tagen
- **SMTP-Passwörter** werden mit AES-256-GCM verschlüsselt gespeichert
- **Nutzerpasswörter** werden mit bcrypt (12 Runden) gehasht
- **Rate Limiting**: 500 Anfragen/15 Min. auf der API; 20 Anfragen/15 Min. auf Auth-Endpunkten
- **Admin-Isolation**: Admins können keine Tierdaten lesen oder ändern — auf Route-Ebene durchgesetzt
- **Datei-Uploads**: Bilder werden nach Dateiendung und Größe validiert; PDFs nach MIME-Typ
- **Passwort-Reset-Token** laufen nach 1 Stunde ab und können nur einmal verwendet werden
- **E-Mail-Verifikations-Token** laufen nach 24 Stunden ab

### Empfehlungen für den Produktivbetrieb

1. Alle Secrets in `.env` auf zufällige Strings mit 32+ Zeichen setzen
2. HTTPS verwenden (z.B. via [Traefik](https://traefik.io/) oder Cloudflare)
3. Standard-Admin-Passwort sofort nach dem ersten Login ändern
4. Docker-Images regelmäßig aktualisieren
5. FTP-Zugang einschränken (SFTP oder VPN bevorzugen)

---

## Lizenz

MIT License

Copyright (c) 2025 Project Nemo Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
