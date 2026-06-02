const router = require('express').Router();
const { Plugin } = require('../../models');
const { authenticate } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/roleCheck');
const { uploadZip } = require('../../middleware/upload');
const { installPlugin, uninstallPlugin, getActivePlugins } = require('../../services/pluginService');

router.use(authenticate, requireAdmin);

router.get('/', async (req, res, next) => {
  try {
    const plugins = await Plugin.findAll({ order: [['installed_at', 'DESC']] });
    res.json(plugins);
  } catch (e) { next(e); }
});

router.post('/install', uploadZip.single('plugin'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'ZIP file required' });
    const plugin = await installPlugin(req.file.path, req.app);
    res.status(201).json(plugin);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/:id/toggle', async (req, res, next) => {
  try {
    const plugin = await Plugin.findByPk(req.params.id);
    if (!plugin) return res.status(404).json({ error: 'Plugin not found' });
    await plugin.update({ active: !plugin.active });
    res.json({ active: plugin.active });
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const plugin = await Plugin.findByPk(req.params.id);
    if (!plugin) return res.status(404).json({ error: 'Plugin not found' });
    await uninstallPlugin(plugin);
    res.json({ message: 'Plugin uninstalled' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Public endpoint to get active plugins with menu info
router.get('/active', async (req, res, next) => {
  try {
    const plugins = await Plugin.findAll({ where: { active: true } });
    res.json(plugins.map(p => ({
      name: p.name,
      shortName: p.short_name,
      iconPath: p.icon_path
    })));
  } catch (e) { next(e); }
});

module.exports = router;
