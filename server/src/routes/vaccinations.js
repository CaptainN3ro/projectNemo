const router = require('express').Router();
const { Vaccination, Pet } = require('../models');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

async function getPet(petId, userId) {
  return Pet.findOne({ where: { id: petId, user_id: userId, active: true } });
}

router.get('/:petId/vaccinations', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const records = await Vaccination.findAll({ where: { pet_id: pet.id }, order: [['vaccination_date', 'DESC']] });
    res.json(records);
  } catch (e) { next(e); }
});

router.post('/:petId/vaccinations', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const { vaccine_name, vaccination_date, next_due_date, batch_number, vet_name, notes, reminder_enabled } = req.body;
    if (!vaccine_name || !vaccination_date) return res.status(400).json({ error: 'vaccine_name and vaccination_date required' });
    const record = await Vaccination.create({ pet_id: pet.id, vaccine_name, vaccination_date, next_due_date, batch_number, vet_name, notes, reminder_enabled });
    if (reminder_enabled && next_due_date) {
      const { createReminder } = require('../services/reminderService');
      await createReminder({ userId: req.user.id, petId: pet.id, refType: 'vaccination', refId: record.id, message: `Impfung fällig für ${pet.name}: ${vaccine_name}`, remindAt: new Date(next_due_date) });
    }
    res.status(201).json(record);
  } catch (e) { next(e); }
});

router.put('/:petId/vaccinations/:id', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const record = await Vaccination.findOne({ where: { id: req.params.id, pet_id: pet.id } });
    if (!record) return res.status(404).json({ error: 'Not found' });
    await record.update(req.body);
    res.json(record);
  } catch (e) { next(e); }
});

router.delete('/:petId/vaccinations/:id', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const record = await Vaccination.findOne({ where: { id: req.params.id, pet_id: pet.id } });
    if (!record) return res.status(404).json({ error: 'Not found' });
    await record.destroy();
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

module.exports = router;
