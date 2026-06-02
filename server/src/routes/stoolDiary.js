const router = require('express').Router();
const { StoolEntry, Pet } = require('../models');
const { authenticate } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');
const { Op } = require('sequelize');

router.use(authenticate);

async function getPet(petId, userId) {
  return Pet.findOne({ where: { id: petId, user_id: userId, active: true } });
}

router.get('/:petId/stool', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const { from, to, limit = 50, offset = 0 } = req.query;
    const where = { pet_id: pet.id };
    if (from || to) {
      where.entry_date = {};
      if (from) where.entry_date[Op.gte] = from;
      if (to) where.entry_date[Op.lte] = to;
    }
    const entries = await StoolEntry.findAll({ where, order: [['entry_date', 'DESC'], ['entry_time', 'DESC']], limit: parseInt(limit), offset: parseInt(offset) });
    res.json(entries);
  } catch (e) { next(e); }
});

router.post('/:petId/stool', uploadImage.array('images', 5), async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const { entry_date, entry_time, rating, consistency, has_blood, has_mucus, notes } = req.body;
    if (!entry_date || !rating) return res.status(400).json({ error: 'entry_date and rating required' });
    if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });
    const image_paths = req.files?.map(f => `/uploads/images/${f.filename}`) || [];
    const entry = await StoolEntry.create({ pet_id: pet.id, entry_date, entry_time, rating, consistency, has_blood: has_blood === 'true' || has_blood === true, has_mucus: has_mucus === 'true' || has_mucus === true, notes, image_paths });
    res.status(201).json(entry);
  } catch (e) { next(e); }
});

router.put('/:petId/stool/:id', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const entry = await StoolEntry.findOne({ where: { id: req.params.id, pet_id: pet.id } });
    if (!entry) return res.status(404).json({ error: 'Not found' });
    await entry.update(req.body);
    res.json(entry);
  } catch (e) { next(e); }
});

router.delete('/:petId/stool/:id', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const entry = await StoolEntry.findOne({ where: { id: req.params.id, pet_id: pet.id } });
    if (!entry) return res.status(404).json({ error: 'Not found' });
    await entry.destroy();
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

module.exports = router;
