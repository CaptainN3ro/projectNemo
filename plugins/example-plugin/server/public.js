/**
 * Example Plugin — public routes
 * Mounted at: /api/plugins/example-plugin
 *
 * Demonstrates:
 *  - Module resolution       (SERVER_SRC_PATH + req() helper)
 *  - Authentication          (authenticate middleware)
 *  - Database access         (sequelize raw queries — SELECT / INSERT / UPDATE / DELETE)
 *  - File upload             (multer, persistent storage under UPLOAD_DIR)
 *  - File download           (res.download)
 *  - File deletion           (fs.unlinkSync)
 *  - Input validation
 *  - Ownership check         (users only see their own data)
 *  - Admin-settings read     (max_notes_per_user limit enforced)
 *  - Export hook             (exportPetData — called when exporting a pet)
 *  - Import hook             (importPetData — called when importing a pet)
 *  - Graceful missing hooks  (if either hook is absent, export/import proceeds without this plugin's data)
 */

const router = require('express').Router();
const path   = require('path');
const fs     = require('fs');

// ── Module resolution ──────────────────────────────────────────────────────
// SERVER_SRC_PATH is injected by app.js at startup.
//   Dev:    <project>/server/src
//   Docker: /app/src
// Use req() for npm packages so they are found in the server's node_modules.
const serverSrc     = process.env.SERVER_SRC_PATH || path.join(__dirname, '../../../server/src');
const serverModules = path.join(serverSrc, '../node_modules');

function req(name) {
  try { return require(require.resolve(name, { paths: [serverModules] })); }
  catch { return require(name); }
}

const { authenticate } = require(path.join(serverSrc, 'middleware/auth'));
const { sequelize }    = require(path.join(serverSrc, 'config/database'));
const { QueryTypes }   = req('sequelize');
const multer           = req('multer');
const { v4: uuidv4 }   = req('uuid');

// ── File upload config ─────────────────────────────────────────────────────
// process.env.UPLOAD_DIR is always set by app.js before plugins load.
// The fallback derives the correct path from SERVER_SRC_PATH so it works in
// both Docker (/app/uploads) and local dev (<project>/server/uploads).
// Files stored here are served by Express at: /uploads/example-plugin/<file>
const UPLOAD_DIR  = process.env.UPLOAD_DIR
  || path.join(process.env.SERVER_SRC_PATH || path.join(__dirname, '../../../server/src'), '../uploads');
const PLUGIN_DIR  = path.join(UPLOAD_DIR, 'example-plugin');
if (!fs.existsSync(PLUGIN_DIR)) fs.mkdirSync(PLUGIN_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, PLUGIN_DIR),
    filename:    (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    // Accept common document and image types
    const allowed = ['.pdf', '.txt', '.md', '.png', '.jpg', '.jpeg', '.gif', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Ungültiger Dateityp'));
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

// ── All routes require authentication ─────────────────────────────────────
router.use(authenticate);

// ── Helper: read admin settings ────────────────────────────────────────────
async function getSettings() {
  const [s] = await sequelize.query(
    'SELECT * FROM example_plugin_settings WHERE id = 1',
    { type: QueryTypes.SELECT }
  );
  return s || { max_notes_per_user: 50, allow_file_uploads: true };
}

// ── GET /api/plugins/example-plugin/notes ─────────────────────────────────
// Returns all notes belonging to the authenticated user.
router.get('/notes', async (req, res) => {
  try {
    const notes = await sequelize.query(
      `SELECT id, title, content, file_path, original_filename, file_size, created_at, updated_at
       FROM example_notes
       WHERE user_id = ?
       ORDER BY updated_at DESC`,
      { replacements: [req.user.id], type: QueryTypes.SELECT }
    );
    res.json(notes);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/plugins/example-plugin/notes ────────────────────────────────
// Creates a new note. Optionally attaches a file (multipart/form-data).
router.post('/notes', upload.single('file'), async (req, res) => {
  try {
    const settings = await getSettings();

    // Enforce per-user note limit from admin settings
    const [{ count }] = await sequelize.query(
      'SELECT COUNT(*) AS count FROM example_notes WHERE user_id = ?',
      { replacements: [req.user.id], type: QueryTypes.SELECT }
    );
    if (parseInt(count) >= settings.max_notes_per_user) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: `Maximum von ${settings.max_notes_per_user} Notizen erreicht.` });
    }

    // Reject file if uploads are disabled in settings
    if (req.file && !settings.allow_file_uploads) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Datei-Uploads sind vom Admin deaktiviert.' });
    }

    const { title, content } = req.body;
    if (!title?.trim()) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Titel ist erforderlich.' });
    }

    const filePath         = req.file ? `/uploads/example-plugin/${req.file.filename}` : null;
    const originalFilename = req.file ? req.file.originalname : null;
    const fileSize         = req.file ? req.file.size : null;

    await sequelize.query(
      `INSERT INTO example_notes (user_id, title, content, file_path, original_filename, file_size)
       VALUES (?, ?, ?, ?, ?, ?)`,
      { replacements: [req.user.id, title.trim(), content || null, filePath, originalFilename, fileSize] }
    );

    // Return the newly created row
    const [note] = await sequelize.query(
      'SELECT * FROM example_notes WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      { replacements: [req.user.id], type: QueryTypes.SELECT }
    );
    res.status(201).json(note);
  } catch (e) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: e.message });
  }
});

// ── PUT /api/plugins/example-plugin/notes/:id ─────────────────────────────
// Updates title and content of an existing note (ownership enforced).
router.put('/notes/:id', async (req, res) => {
  try {
    const [note] = await sequelize.query(
      'SELECT * FROM example_notes WHERE id = ? AND user_id = ?',
      { replacements: [req.params.id, req.user.id], type: QueryTypes.SELECT }
    );
    if (!note) return res.status(404).json({ error: 'Notiz nicht gefunden.' });

    const { title, content } = req.body;
    if (title !== undefined && !title.trim()) return res.status(400).json({ error: 'Titel darf nicht leer sein.' });

    await sequelize.query(
      'UPDATE example_notes SET title = ?, content = ?, updated_at = NOW() WHERE id = ?',
      { replacements: [title?.trim() ?? note.title, content ?? note.content, req.params.id] }
    );

    const [updated] = await sequelize.query(
      'SELECT * FROM example_notes WHERE id = ?',
      { replacements: [req.params.id], type: QueryTypes.SELECT }
    );
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /api/plugins/example-plugin/notes/:id ──────────────────────────
// Deletes a note and its attached file from disk (ownership enforced).
router.delete('/notes/:id', async (req, res) => {
  try {
    const [note] = await sequelize.query(
      'SELECT * FROM example_notes WHERE id = ? AND user_id = ?',
      { replacements: [req.params.id, req.user.id], type: QueryTypes.SELECT }
    );
    if (!note) return res.status(404).json({ error: 'Notiz nicht gefunden.' });

    // Delete the physical file if one was attached
    if (note.file_path) {
      const absPath = path.join(PLUGIN_DIR, path.basename(note.file_path));
      if (fs.existsSync(absPath)) fs.unlinkSync(absPath);
    }

    await sequelize.query('DELETE FROM example_notes WHERE id = ?', { replacements: [req.params.id] });
    res.json({ message: 'Notiz gelöscht.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/plugins/example-plugin/notes/:id/download ────────────────────
// Triggers a file download for the attached file (ownership enforced).
router.get('/notes/:id/download', async (req, res) => {
  try {
    const [note] = await sequelize.query(
      'SELECT * FROM example_notes WHERE id = ? AND user_id = ?',
      { replacements: [req.params.id, req.user.id], type: QueryTypes.SELECT }
    );
    if (!note)           return res.status(404).json({ error: 'Nicht gefunden.' });
    if (!note.file_path) return res.status(404).json({ error: 'Kein Anhang vorhanden.' });

    const absPath = path.join(PLUGIN_DIR, path.basename(note.file_path));
    if (!fs.existsSync(absPath)) return res.status(404).json({ error: 'Datei nicht gefunden.' });

    res.download(absPath, note.original_filename || 'anhang');
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

// ── EXPORT / IMPORT HOOKS ────────────────────────────────────────────────
//
// Both hooks are OPTIONAL. If a plugin does not export them, the export/import
// process simply skips that plugin's data without error.
//
// Hook signatures:
//   exportPetData(petId, userId, uploadDir, filesToAdd) → data | null
//   importPetData(newPetId, userId, data, zip, uploadDir, fileMap) → void
//
// ── exportPetData ──────────────────────────────────────────────────────────
// Called by exportService.js for every active plugin when a pet is exported.
//
// Parameters:
//   petId      – ID of the pet being exported
//   userId     – ID of the owner (use for ownership checks in queries)
//   uploadDir  – absolute path to the uploads directory (UPLOAD_DIR)
//   filesToAdd – array to push { diskPath, archivePath } objects into;
//                the export service adds these files to the ZIP automatically
//
// Return value:
//   • An object (any shape) → included in the ZIP as plugins/<name>.json
//   • null / undefined     → plugin is silently skipped (no entry in ZIP)
//
// ── importPetData ──────────────────────────────────────────────────────────
// Called by importService.js when the plugin is installed on the target
// instance and the ZIP contains a plugins/<name>.json entry.
// NOT called if the plugin is not installed on the target.
//
// Parameters:
//   newPetId  – ID of the newly created pet on the target instance
//   userId    – ID of the importing user
//   data      – parsed content of plugins/<name>.json from the ZIP
//   zip       – AdmZip instance (use zip.getEntry(path) to extract files)
//   uploadDir – absolute path to the uploads directory on the target
//   fileMap   – map of original_basename → archive_entry_name for all files/*
//               entries in the ZIP; use to look up exported files by basename

router.exportPetData = async function exportPetData(petId, userId, uploadDir, filesToAdd) {
  // Export notes that are linked to this specific pet.
  // The pet_id column is added by migrations/update.sql (v1.0 → v1.1).
  // If the plugin hasn't been updated yet, the column doesn't exist and this
  // returns null — the export proceeds without this plugin's data.
  try {
    const notes = await sequelize.query(
      'SELECT * FROM example_notes WHERE pet_id = ? AND user_id = ?',
      { replacements: [petId, userId], type: QueryTypes.SELECT }
    );

    if (!notes.length) return null; // nothing to export for this pet

    // Add file attachments to the ZIP
    for (const note of notes) {
      if (note.file_path) {
        const abs = path.join(uploadDir, 'example-plugin', path.basename(note.file_path));
        if (fs.existsSync(abs)) {
          filesToAdd.push({
            diskPath:    abs,
            archivePath: `files/plugins/example-plugin/${path.basename(note.file_path)}`
          });
        }
      }
    }

    return { notes };
  } catch {
    // pet_id column may not exist yet (pre-update.sql); skip gracefully
    return null;
  }
};

router.importPetData = async function importPetData(newPetId, userId, data, zip, uploadDir, fileMap) {
  const pluginDir = path.join(uploadDir, 'example-plugin');
  fs.mkdirSync(pluginDir, { recursive: true });

  for (const note of data.notes || []) {
    let newFilePath = null;

    // Re-extract the attached file with a fresh UUID filename
    if (note.file_path) {
      const basename    = path.basename(note.file_path);
      const archivePath = fileMap[basename];
      if (archivePath) {
        const zipEntry = zip.getEntry(archivePath);
        if (zipEntry) {
          const ext         = path.extname(basename).toLowerCase();
          const newFilename = `${uuidv4()}${ext}`;
          fs.writeFileSync(path.join(pluginDir, newFilename), zipEntry.getData());
          newFilePath = `/uploads/example-plugin/${newFilename}`;
        }
      }
    }

    await sequelize.query(
      `INSERT INTO example_notes
         (user_id, pet_id, title, content, file_path, original_filename, file_size)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      { replacements: [userId, newPetId, note.title || null, note.content || null, newFilePath, note.original_filename || null, note.file_size || null] }
    );
  }
};
