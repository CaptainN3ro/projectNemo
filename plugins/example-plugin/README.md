# Beispiel-Plugin für Project Nemo

Dieses Plugin ist ein vollständiges Referenz-Beispiel für die Plugin-Entwicklung. Es implementiert ein einfaches Notiz-System mit optionalem Dateianhang und zeigt dabei alle verfügbaren Plugin-Funktionen.

---

## Zweck

Dieses Plugin ist **kein produktiv einzusetzendes Feature**, sondern eine kommentierte Vorlage, die zeigt:

- Modul-Auflösung (`SERVER_SRC_PATH` + `req()`-Helfer)
- Datenbankzugriff via Sequelize (SELECT, INSERT, UPDATE, DELETE)
- Datei-Upload mit multer und persistenter Speicherung unter `UPLOAD_DIR`
- Datei-Download und -Löschung
- Eingabevalidierung und Eigentümer-Prüfung
- Admin-Einstellungen (Singleton-Zeile, Statistiken)
- Export-Hook (`exportPetData`) für den Tier-Export
- Import-Hook (`importPetData`) für den Tier-Import
- Update-Migration (`migrations/update.sql`)

---

## Installation

1. Plugin-Ordner als `.zip` packen:
   ```bash
   cd plugins/
   zip -r example-plugin-1.1.0.zip example-plugin/
   ```
2. In Project Nemo: **Admin → Plugins**
3. ZIP-Datei hochladen

---

## Aktualisierung

Eine neue Version als ZIP mit demselben `name` (`example-plugin`) hochladen. Das System führt `migrations/update.sql` automatisch aus, bevor die Dateien ausgetauscht werden — vorhandene Daten bleiben erhalten.

---

## Dateistruktur

```
example-plugin/
├── .gitignore
├── manifest.json                  ← Plugin-Metadaten
├── assets/
│   └── icon.svg
├── server/
│   ├── public.js                  ← Nutzer-Routen + Export/Import-Hooks
│   └── admin.js                   ← Admin-Routen (Statistiken, Einstellungen)
├── migrations/
│   ├── install.sql                ← Tabellen anlegen
│   ├── update.sql                 ← Schema-Änderungen bei Aktualisierung
│   └── uninstall.sql              ← Tabellen löschen
└── html/
    ├── index.html                 ← Frontend (placement: "top")
    └── pet.html                   ← Tier-Frontend (placement: "pet")
```

---

## API-Routen

Alle Routen erfordern ein gültiges JWT (`Authorization: Bearer <token>`).

### Nutzer-Routen (`/api/plugins/example-plugin`)

| Methode | Pfad | Beschreibung |
|---|---|---|
| `GET` | `/notes` | Alle eigenen Notizen auflisten |
| `POST` | `/notes` | Neue Notiz erstellen (optional mit Dateianhang) |
| `PUT` | `/notes/:id` | Titel/Inhalt einer Notiz ändern |
| `DELETE` | `/notes/:id` | Notiz und Dateianhang löschen |
| `GET` | `/notes/:id/download` | Dateianhang herunterladen |

### Admin-Routen (`/api/admin/plugins/example-plugin`)

| Methode | Pfad | Beschreibung |
|---|---|---|
| `GET` | `/stats` | Statistiken über alle Notizen |
| `GET` | `/settings` | Plugin-Einstellungen lesen |
| `PUT` | `/settings` | Plugin-Einstellungen speichern |

---

## Export & Import

Ab Version 1.1.0 (nach Ausführung von `update.sql`) unterstützt dieses Plugin den Tier-Export/Import:

- **Export**: Notizen mit `pet_id` werden inkl. Dateianhängen in die Export-ZIP aufgenommen.
- **Import**: Notizen werden auf der Zielinstanz mit neuen Datei-UUIDs wiederhergestellt, sofern das Plugin dort installiert ist.

Wenn das Plugin **nicht installiert** oder der **Hook nicht vorhanden** ist, werden die Daten beim Import stillschweigend übersprungen — der Rest des Imports läuft normal weiter.

---

## Datenbank-Tabellen

```sql
-- Notizen (Hauptdaten)
example_notes (
  id, user_id, pet_id,   ← pet_id durch update.sql hinzugefügt
  title, content,
  file_path, original_filename, file_size,
  created_at, updated_at
)

-- Einstellungen (Singleton, id = 1)
example_plugin_settings (
  id,
  max_notes_per_user,  ← Standard: 50
  allow_file_uploads,  ← Standard: true
  updated_at
)
```

---

## Voraussetzungen

- Project Nemo ≥ 1.0.0
- Keine zusätzlichen npm-Abhängigkeiten

---

## Lizenz

MIT — © CaptainN3ro · https://github.com/CaptainN3ro
