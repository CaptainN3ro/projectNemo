// Public endpoints — no auth required
const router = require('express').Router();
const { SiteSettings } = require('../models');

router.get('/branding', async (req, res) => {
  try {
    let s = await SiteSettings.findByPk(1);
    if (!s) s = { app_name: 'Project Nemo', logo_path: null, favicon_path: null, seo_title: null, seo_description: null, robots_index: true };
    res.json({
      app_name: s.app_name || 'Project Nemo',
      logo_path: s.logo_path || null,
      favicon_path: s.favicon_path || null,
      seo_title: s.seo_title || s.app_name || 'Project Nemo',
      seo_description: s.seo_description || '',
      robots_index: s.robots_index !== false
    });
  } catch {
    res.json({ app_name: 'Project Nemo', logo_path: null, favicon_path: null, seo_title: 'Project Nemo', seo_description: '', robots_index: true });
  }
});

module.exports = router;
