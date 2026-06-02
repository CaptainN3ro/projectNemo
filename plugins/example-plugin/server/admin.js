/**
 * Example Plugin — admin routes
 * Mounted at: /api/admin/plugins/example-plugin
 *
 * Demonstrates:
 *  - Admin-only access  (authenticate + requireAdmin)
 *  - Reading settings   (singleton row pattern)
 *  - Writing settings   (UPDATE singleton)
 *  - Aggregate stats    (COUNT, SUM across all users)
 */

const router = require('express').Router();
const path   = require('path');

// ── Module resolution (same pattern as public.js) ─────────────────────────
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

// ── All routes require admin authentication ────────────────────────────────
router.use(authenticate, requireAdmin);

// ── GET /api/admin/plugins/example-plugin/stats ───────────────────────────
// Returns aggregate statistics across all users.
router.get('/stats', async (req, res) => {
  try {
    const [stats] = await sequelize.query(
      `SELECT
         COUNT(*)                                            AS total_notes,
         COUNT(DISTINCT user_id)                            AS users_with_notes,
         COUNT(CASE WHEN file_path IS NOT NULL THEN 1 END)  AS notes_with_files,
         COALESCE(SUM(file_size), 0)                        AS total_file_bytes
       FROM example_notes`,
      { type: QueryTypes.SELECT }
    );
    res.json(stats);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/admin/plugins/example-plugin/settings ────────────────────────
// Returns the current plugin settings.
router.get('/settings', async (req, res) => {
  try {
    const [settings] = await sequelize.query(
      'SELECT max_notes_per_user, allow_file_uploads FROM example_plugin_settings WHERE id = 1',
      { type: QueryTypes.SELECT }
    );
    res.json(settings || { max_notes_per_user: 50, allow_file_uploads: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PUT /api/admin/plugins/example-plugin/settings ────────────────────────
// Updates plugin settings (singleton row, always id = 1).
router.put('/settings', async (req, res) => {
  try {
    const { max_notes_per_user, allow_file_uploads } = req.body;

    if (max_notes_per_user !== undefined && (isNaN(max_notes_per_user) || max_notes_per_user < 1)) {
      return res.status(400).json({ error: 'max_notes_per_user muss eine positive Zahl sein.' });
    }

    await sequelize.query(
      `UPDATE example_plugin_settings
       SET max_notes_per_user = ?, allow_file_uploads = ?, updated_at = NOW()
       WHERE id = 1`,
      { replacements: [max_notes_per_user ?? 50, allow_file_uploads ?? true] }
    );
    res.json({ message: 'Einstellungen gespeichert.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
