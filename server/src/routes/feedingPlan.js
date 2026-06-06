const router = require('express').Router();
const { FeedingPlan, FeedingEntry, Pet } = require('../models');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

const sanitizeEntry = e => ({ ...e, amount: e.amount === '' ? null : e.amount });

async function getPet(petId, userId) {
  return Pet.findOne({ where: { id: petId, user_id: userId, active: true } });
}

router.get('/:petId/feeding', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const plans = await FeedingPlan.findAll({ where: { pet_id: pet.id }, include: [FeedingEntry], order: [['active', 'DESC'], ['created_at', 'DESC']] });
    res.json(plans);
  } catch (e) { next(e); }
});

router.post('/:petId/feeding', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const { name, active, notes, entries } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const plan = await FeedingPlan.create({ pet_id: pet.id, name, active, notes });
    if (entries?.length) {
      await FeedingEntry.bulkCreate(entries.map(e => ({ ...sanitizeEntry(e), feeding_plan_id: plan.id })));
    }
    const full = await FeedingPlan.findByPk(plan.id, { include: [FeedingEntry] });
    res.status(201).json(full);
  } catch (e) { next(e); }
});

router.put('/:petId/feeding/:id', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const plan = await FeedingPlan.findOne({ where: { id: req.params.id, pet_id: pet.id } });
    if (!plan) return res.status(404).json({ error: 'Not found' });
    const { name, active, notes, entries } = req.body;
    await plan.update({ name, active, notes });
    if (entries !== undefined) {
      await FeedingEntry.destroy({ where: { feeding_plan_id: plan.id } });
      if (entries.length) await FeedingEntry.bulkCreate(entries.map(e => ({ ...sanitizeEntry(e), feeding_plan_id: plan.id })));
    }
    const full = await FeedingPlan.findByPk(plan.id, { include: [FeedingEntry] });
    res.json(full);
  } catch (e) { next(e); }
});

router.delete('/:petId/feeding/:id', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const plan = await FeedingPlan.findOne({ where: { id: req.params.id, pet_id: pet.id } });
    if (!plan) return res.status(404).json({ error: 'Not found' });
    await plan.destroy();
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

module.exports = router;
