const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const { SiteSettings } = require('../../models');
const { authenticate } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/roleCheck');
const { uploadImage, UPLOAD_DIR } = require('../../middleware/upload');

router.use(authenticate, requireAdmin);

router.get('/', async (req, res, next) => {
  try {
    let s = await SiteSettings.findByPk(1);
    if (!s) s = await SiteSettings.create({ id: 1 });
    res.json(s);
  } catch (e) { next(e); }
});

router.put('/', async (req, res, next) => {
  try {
    let s = await SiteSettings.findByPk(1);
    if (!s) s = await SiteSettings.create({ id: 1 });
    const { app_name, seo_title, seo_description, robots_index } = req.body;
    await s.update({ app_name, seo_title, seo_description, robots_index });
    res.json({ message: 'Gespeichert' });
  } catch (e) { next(e); }
});

function brandingUpload(field) {
  return uploadImage.single(field);
}

router.post('/logo', brandingUpload('logo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Datei fehlt' });
    let s = await SiteSettings.findByPk(1);
    if (!s) s = await SiteSettings.create({ id: 1 });
    if (s.logo_path) {
      const old = path.join(UPLOAD_DIR, 'images', path.basename(s.logo_path));
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
    const logo_path = `/uploads/images/${req.file.filename}`;
    await s.update({ logo_path });
    res.json({ logo_path });
  } catch (e) { next(e); }
});

router.post('/favicon', brandingUpload('favicon'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Datei fehlt' });
    let s = await SiteSettings.findByPk(1);
    if (!s) s = await SiteSettings.create({ id: 1 });
    if (s.favicon_path) {
      const old = path.join(UPLOAD_DIR, 'images', path.basename(s.favicon_path));
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
    const favicon_path = `/uploads/images/${req.file.filename}`;
    await s.update({ favicon_path });
    res.json({ favicon_path });
  } catch (e) { next(e); }
});

router.delete('/logo', async (req, res, next) => {
  try {
    const s = await SiteSettings.findByPk(1);
    if (s?.logo_path) {
      const old = path.join(UPLOAD_DIR, 'images', path.basename(s.logo_path));
      if (fs.existsSync(old)) fs.unlinkSync(old);
      await s.update({ logo_path: null });
    }
    res.json({ message: 'Logo entfernt' });
  } catch (e) { next(e); }
});

router.delete('/favicon', async (req, res, next) => {
  try {
    const s = await SiteSettings.findByPk(1);
    if (s?.favicon_path) {
      const old = path.join(UPLOAD_DIR, 'images', path.basename(s.favicon_path));
      if (fs.existsSync(old)) fs.unlinkSync(old);
      await s.update({ favicon_path: null });
    }
    res.json({ message: 'Favicon entfernt' });
  } catch (e) { next(e); }
});

module.exports = router;
