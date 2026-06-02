const router = require('express').Router();
const { StoolEntry, BehaviorEntry, Pet } = require('../models');
const { authenticate } = require('../middleware/auth');
const { Op, fn, col, literal } = require('sequelize');

router.use(authenticate);

async function getPet(petId, userId) {
  return Pet.findOne({ where: { id: petId, user_id: userId, active: true } });
}

router.get('/:petId/stats', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });

    const { period = 'month', type = 'stool' } = req.query;
    const Model = type === 'behavior' ? BehaviorEntry : StoolEntry;

    const now = new Date();
    let from;
    if (period === 'week') from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (period === 'month') from = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    else from = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());

    const entries = await Model.findAll({
      where: { pet_id: pet.id, entry_date: { [Op.gte]: from } },
      order: [['entry_date', 'ASC'], ['entry_time', 'ASC']]
    });

    const byDay = {};
    for (const e of entries) {
      const day = e.entry_date;
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(e.rating);
    }

    const dailyAverages = Object.entries(byDay).map(([date, ratings]) => ({
      date,
      avg: parseFloat((ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(2)),
      count: ratings.length
    }));

    const byHour = Array(24).fill(null).map((_, h) => ({ hour: h, ratings: [] }));
    for (const e of entries) {
      if (e.entry_time) {
        const hour = parseInt(e.entry_time.split(':')[0]);
        if (!isNaN(hour)) byHour[hour].ratings.push(e.rating);
      }
    }
    const hourlyPattern = byHour.map(h => ({
      hour: h.hour,
      avg: h.ratings.length ? parseFloat((h.ratings.reduce((s, r) => s + r, 0) / h.ratings.length).toFixed(2)) : null,
      count: h.ratings.length
    })).filter(h => h.count > 0);

    const overallAvg = entries.length ? parseFloat((entries.reduce((s, e) => s + e.rating, 0) / entries.length).toFixed(2)) : null;
    const trend = dailyAverages.length >= 3
      ? (dailyAverages[dailyAverages.length - 1].avg - dailyAverages[0].avg > 0 ? 'improving' : dailyAverages[dailyAverages.length - 1].avg - dailyAverages[0].avg < 0 ? 'declining' : 'stable')
      : 'insufficient_data';

    res.json({ type, period, overallAvg, trend, totalEntries: entries.length, dailyAverages, hourlyPattern });
  } catch (e) { next(e); }
});

module.exports = router;
