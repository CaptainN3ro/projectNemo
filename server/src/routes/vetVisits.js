const router = require('express').Router();
const { VetVisit, Pet } = require('../models');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

async function getPet(petId, userId) {
  return Pet.findOne({ where: { id: petId, user_id: userId, active: true } });
}

router.get('/:petId/vet-visits', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const visits = await VetVisit.findAll({ where: { pet_id: pet.id }, order: [['visit_date', 'DESC']] });
    res.json(visits);
  } catch (e) { next(e); }
});

router.post('/:petId/vet-visits', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const { visit_date, is_future, reason, diagnosis, treatment, vet_name, vet_clinic, notes, cost, reminder_enabled } = req.body;
    if (!visit_date || !reason) return res.status(400).json({ error: 'visit_date and reason required' });
    const visit = await VetVisit.create({ pet_id: pet.id, visit_date, is_future, reason, diagnosis, treatment, vet_name, vet_clinic, notes, cost, reminder_enabled });
    if (reminder_enabled && is_future) {
      const { createReminder } = require('../services/reminderService');
      await createReminder({ userId: req.user.id, petId: pet.id, refType: 'vet_visit', refId: visit.id, message: `Tierarzttermin für ${pet.name}: ${reason}`, remindAt: new Date(visit_date) });
    }
    res.status(201).json(visit);
  } catch (e) { next(e); }
});

router.put('/:petId/vet-visits/:id', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const visit = await VetVisit.findOne({ where: { id: req.params.id, pet_id: pet.id } });
    if (!visit) return res.status(404).json({ error: 'Not found' });
    await visit.update(req.body);
    res.json(visit);
  } catch (e) { next(e); }
});

router.delete('/:petId/vet-visits/:id', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const visit = await VetVisit.findOne({ where: { id: req.params.id, pet_id: pet.id } });
    if (!visit) return res.status(404).json({ error: 'Not found' });
    await visit.destroy();
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

module.exports = router;
