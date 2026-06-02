const router = require('express').Router();
const { WeightEntry, Pet } = require('../models');
const { authenticate } = require('../middleware/auth');
const { Op } = require('sequelize');

router.use(authenticate);

async function getPet(petId, userId) {
  return Pet.findOne({ where: { id: petId, user_id: userId, active: true } });
}

// After any write, sync pet.weight to the most recent entry's weight
async function syncPetWeight(petId) {
  const latest = await WeightEntry.findOne({
    where: { pet_id: petId },
    order: [['entry_date', 'DESC'], ['created_at', 'DESC']]
  });
  await Pet.update(
    { weight: latest ? latest.weight : null },
    { where: { id: petId } }
  );
  return latest?.weight ?? null;
}

router.get('/:petId/weight', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const entries = await WeightEntry.findAll({
      where: { pet_id: pet.id },
      order: [['entry_date', 'DESC'], ['created_at', 'DESC']]
    });
    res.json(entries);
  } catch (e) { next(e); }
});

router.post('/:petId/weight', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const { entry_date, weight, notes } = req.body;
    if (!entry_date || weight == null) return res.status(400).json({ error: 'entry_date und weight erforderlich' });
    if (isNaN(parseFloat(weight)) || parseFloat(weight) <= 0) return res.status(400).json({ error: 'Ungültiges Gewicht' });

    const entry = await WeightEntry.create({ pet_id: pet.id, entry_date, weight: parseFloat(weight), notes });
    await syncPetWeight(pet.id);
    res.status(201).json(entry);
  } catch (e) { next(e); }
});

router.put('/:petId/weight/:id', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const entry = await WeightEntry.findOne({ where: { id: req.params.id, pet_id: pet.id } });
    if (!entry) return res.status(404).json({ error: 'Not found' });
    const { entry_date, weight, notes } = req.body;
    if (weight != null && (isNaN(parseFloat(weight)) || parseFloat(weight) <= 0)) {
      return res.status(400).json({ error: 'Ungültiges Gewicht' });
    }
    await entry.update({ entry_date, weight: weight != null ? parseFloat(weight) : entry.weight, notes });
    await syncPetWeight(pet.id);
    res.json(entry);
  } catch (e) { next(e); }
});

router.delete('/:petId/weight/:id', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const entry = await WeightEntry.findOne({ where: { id: req.params.id, pet_id: pet.id } });
    if (!entry) return res.status(404).json({ error: 'Not found' });
    await entry.destroy();
    await syncPetWeight(pet.id);
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

module.exports = router;
