const router = require('express').Router();
const { Event, Pet } = require('../models');
const { authenticate } = require('../middleware/auth');
const { Op } = require('sequelize');

router.use(authenticate);

async function getPet(petId, userId) {
  return Pet.findOne({ where: { id: petId, user_id: userId, active: true } });
}

router.get('/:petId/events', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const events = await Event.findAll({ where: { pet_id: pet.id }, order: [['event_date', 'DESC']] });
    res.json(events);
  } catch (e) { next(e); }
});

router.post('/:petId/events', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const { title, event_date, end_date, description, category, reminder_enabled, reminder_at } = req.body;
    if (!title || !event_date) return res.status(400).json({ error: 'title and event_date required' });
    const event = await Event.create({ pet_id: pet.id, title, event_date, end_date, description, category, reminder_enabled, reminder_at });
    if (reminder_enabled && reminder_at) {
      const { createReminder } = require('../services/reminderService');
      await createReminder({ userId: req.user.id, petId: pet.id, refType: 'event', refId: event.id, message: `Erinnerung für ${pet.name}: ${title}`, remindAt: new Date(reminder_at) });
    }
    res.status(201).json(event);
  } catch (e) { next(e); }
});

router.put('/:petId/events/:id', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const event = await Event.findOne({ where: { id: req.params.id, pet_id: pet.id } });
    if (!event) return res.status(404).json({ error: 'Not found' });
    await event.update(req.body);
    res.json(event);
  } catch (e) { next(e); }
});

router.delete('/:petId/events/:id', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const event = await Event.findOne({ where: { id: req.params.id, pet_id: pet.id } });
    if (!event) return res.status(404).json({ error: 'Not found' });
    await event.destroy();
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

module.exports = router;
