const router = require('express').Router();
const { Pet, VetVisit, Vaccination, Event, Medication, StoolEntry, BehaviorEntry } = require('../models');
const { authenticate } = require('../middleware/auth');
const { Op } = require('sequelize');

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const pets = await Pet.findAll({ where: { user_id: req.user.id, active: true } });
    const petIds = pets.map(p => p.id);
    const petMap = Object.fromEntries(pets.map(p => [p.id, p]));
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (!petIds.length) {
      return res.json({ pets: [], upcomingEvents: [], activeMedications: [], recentStoolAvg: null, recentBehaviorAvg: null });
    }

    const [upcomingVetVisits, upcomingVaccinations, upcomingEvents, activeMeds] = await Promise.all([
      VetVisit.findAll({ where: { pet_id: { [Op.in]: petIds }, is_future: true, visit_date: { [Op.between]: [now, in30Days] } }, order: [['visit_date', 'ASC']], limit: 5 }),
      Vaccination.findAll({ where: { pet_id: { [Op.in]: petIds }, next_due_date: { [Op.between]: [now, in30Days] } }, order: [['next_due_date', 'ASC']], limit: 5 }),
      Event.findAll({ where: { pet_id: { [Op.in]: petIds }, event_date: { [Op.between]: [now, in30Days] } }, order: [['event_date', 'ASC']], limit: 5 }),
      Medication.findAll({ where: { pet_id: { [Op.in]: petIds }, active: true } })
    ]);

    const upcoming = [
      ...upcomingVetVisits.map(v => ({ type: 'vet_visit', date: v.visit_date, title: v.reason, petName: petMap[v.pet_id]?.name, petId: v.pet_id })),
      ...upcomingVaccinations.map(v => ({ type: 'vaccination', date: v.next_due_date, title: v.vaccine_name, petName: petMap[v.pet_id]?.name, petId: v.pet_id })),
      ...upcomingEvents.map(e => ({ type: 'event', date: e.event_date, title: e.title, petName: petMap[e.pet_id]?.name, petId: e.pet_id }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 5);

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const [recentStool, recentBehavior] = await Promise.all([
      StoolEntry.findAll({ where: { pet_id: { [Op.in]: petIds }, entry_date: { [Op.gte]: sevenDaysAgo } } }),
      BehaviorEntry.findAll({ where: { pet_id: { [Op.in]: petIds }, entry_date: { [Op.gte]: sevenDaysAgo } } })
    ]);

    const stoolAvg = recentStool.length ? (recentStool.reduce((s, e) => s + e.rating, 0) / recentStool.length).toFixed(1) : null;
    const behaviorAvg = recentBehavior.length ? (recentBehavior.reduce((s, e) => s + e.rating, 0) / recentBehavior.length).toFixed(1) : null;

    res.json({
      pets: pets.map(p => ({ id: p.id, name: p.name, species: p.species, photo_path: p.photo_path })),
      upcomingEvents: upcoming,
      activeMedications: activeMeds.map(m => ({ id: m.id, name: m.name, dosage: m.dosage, unit: m.unit, petName: petMap[m.pet_id]?.name, petId: m.pet_id })),
      recentStoolAvg: stoolAvg,
      recentBehaviorAvg: behaviorAvg,
      stoolEntryCount7d: recentStool.length,
      behaviorEntryCount7d: recentBehavior.length
    });
  } catch (e) { next(e); }
});

module.exports = router;
