const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const { Pet } = require('../models');
const { authenticate } = require('../middleware/auth');
const { uploadImage, uploadZip, UPLOAD_DIR } = require('../middleware/upload');

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const pets = await Pet.findAll({ where: { user_id: req.user.id, active: true } });
    res.json(pets);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, species, breed, birth_date, gender, weight, color, microchip_id, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const pet = await Pet.create({ user_id: req.user.id, name, species, breed, birth_date, gender, weight, color, microchip_id, notes });
    res.status(201).json(pet);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const pet = await Pet.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    res.json(pet);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const pet = await Pet.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const { name, species, breed, birth_date, gender, weight, color, microchip_id, notes } = req.body;
    await pet.update({ name, species, breed, birth_date, gender, weight, color, microchip_id, notes });
    res.json(pet);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const pet = await Pet.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    await pet.update({ active: false });
    res.json({ message: 'Pet removed' });
  } catch (e) { next(e); }
});

router.post('/:id/photo', uploadImage.single('photo'), async (req, res, next) => {
  try {
    const pet = await Pet.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    if (pet.photo_path) {
      const old = path.join(UPLOAD_DIR, 'images', path.basename(pet.photo_path));
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }

    const photoPath = `/uploads/images/${req.file.filename}`;
    await pet.update({ photo_path: photoPath });
    res.json({ photo_path: photoPath });
  } catch (e) { next(e); }
});

// ── Export ────────────────────────────────────────────────────────────────
router.get('/:id/export', async (req, res, next) => {
  try {
    const { exportPet } = require('../services/exportService');
    const { buffer, filename } = await exportPet(req.params.id, req.user.id);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (e) { next(e); }
});

// ── Import ────────────────────────────────────────────────────────────────
router.post('/import', uploadZip.single('backup'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'ZIP-Datei erforderlich.' });
    const { importPet } = require('../services/importService');
    const zipBuffer = fs.readFileSync(req.file.path);
    fs.unlinkSync(req.file.path);
    const pet = await importPet(zipBuffer, req.user.id);
    res.status(201).json(pet);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
