const router = require('express').Router();
const { Medication, Pet } = require('../models');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

async function getPet(petId, userId) {
  return Pet.findOne({ where: { id: petId, user_id: userId, active: true } });
}

router.get('/:petId/medications', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const meds = await Medication.findAll({ where: { pet_id: pet.id }, order: [['active', 'DESC'], ['created_at', 'DESC']] });
    res.json(meds);
  } catch (e) { next(e); }
});

router.post('/:petId/medications', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const { name, dosage, unit, frequency, times_per_day, start_date, end_date, notes, active } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const med = await Medication.create({ pet_id: pet.id, name, dosage, unit, frequency, times_per_day, start_date, end_date, notes, active });
    res.status(201).json(med);
  } catch (e) { next(e); }
});

router.put('/:petId/medications/:id', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const med = await Medication.findOne({ where: { id: req.params.id, pet_id: pet.id } });
    if (!med) return res.status(404).json({ error: 'Not found' });
    await med.update(req.body);
    res.json(med);
  } catch (e) { next(e); }
});

router.delete('/:petId/medications/:id', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const med = await Medication.findOne({ where: { id: req.params.id, pet_id: pet.id } });
    if (!med) return res.status(404).json({ error: 'Not found' });
    await med.destroy();
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

module.exports = router;
