const router = require('express').Router();
const crypto = require('crypto');
const { Pet, VetVisit, Vaccination, Event, User } = require('../models');
const { authenticate } = require('../middleware/auth');
const { Op } = require('sequelize');

// ── Helper: build calendar event array ──────────────────────────────────────

async function buildCalendarEvents(userId, dateFilter = {}) {
  const pets = await Pet.findAll({ where: { user_id: userId, active: true } });
  const petIds = pets.map(p => p.id);
  const petMap = Object.fromEntries(pets.map(p => [p.id, p]));

  if (!petIds.length) return [];

  const [vetVisits, vaccinations, events] = await Promise.all([
    VetVisit.findAll({ where: { pet_id: { [Op.in]: petIds }, ...(dateFilter.visit_date ? { visit_date: dateFilter.visit_date } : {}) }, order: [['visit_date', 'ASC']] }),
    Vaccination.findAll({ where: { pet_id: { [Op.in]: petIds }, ...(dateFilter.next_due_date ? { next_due_date: dateFilter.next_due_date } : {}) } }),
    Event.findAll({ where: { pet_id: { [Op.in]: petIds }, ...(dateFilter.event_date ? { event_date: dateFilter.event_date } : {}) }, order: [['event_date', 'ASC']] })
  ]);

  return [
    ...vetVisits.map(v => ({
      id: `vet-${v.id}`, type: 'vet_visit', petId: v.pet_id, petName: petMap[v.pet_id]?.name,
      title: `${petMap[v.pet_id]?.name}: ${v.reason}`, start: v.visit_date, isFuture: v.is_future,
      color: v.is_future ? '#3b82f6' : '#6b7280', data: v
    })),
    ...vaccinations.filter(v => v.next_due_date).map(v => ({
      id: `vac-${v.id}`, type: 'vaccination', petId: v.pet_id, petName: petMap[v.pet_id]?.name,
      title: `${petMap[v.pet_id]?.name}: Impfung ${v.vaccine_name}`, start: v.next_due_date, color: '#f59e0b', data: v
    })),
    ...events.map(e => ({
      id: `evt-${e.id}`, type: 'event', petId: e.pet_id, petName: petMap[e.pet_id]?.name,
      title: `${petMap[e.pet_id]?.name}: ${e.title}`, start: e.event_date, end: e.end_date,
      color: '#10b981', category: e.category, data: e
    }))
  ];
}

// ── ICS generator ────────────────────────────────────────────────────────────

function toICSDate(val) {
  if (!val) return null;
  const d = new Date(val);
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeICS(str) {
  if (!str) return '';
  return String(str).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function generateICS(calEvents, calName = 'Meine Tiere') {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Project Nemo//Pet Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICS(calName)}`,
    'X-WR-TIMEZONE:UTC'
  ];

  const typeLabels = { vet_visit: 'Tierarzt', vaccination: 'Impfung', event: 'Ereignis' };

  for (const evt of calEvents) {
    const uid = `${evt.id}@project-nemo`;
    const dtStart = toICSDate(evt.start);
    if (!dtStart) continue;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${toICSDate(new Date())}`);
    lines.push(`DTSTART:${dtStart}`);
    if (evt.end) lines.push(`DTEND:${toICSDate(evt.end)}`);
    lines.push(`SUMMARY:${escapeICS(evt.title)}`);

    const descParts = [`Typ: ${typeLabels[evt.type] || evt.type}`];
    if (evt.data?.reason) descParts.push(`Grund: ${evt.data.reason}`);
    if (evt.data?.diagnosis) descParts.push(`Diagnose: ${evt.data.diagnosis}`);
    if (evt.data?.description) descParts.push(evt.data.description);
    if (evt.data?.notes) descParts.push(`Notiz: ${evt.data.notes}`);
    lines.push(`DESCRIPTION:${escapeICS(descParts.join('\\n'))}`);
    lines.push(`CATEGORIES:${escapeICS(typeLabels[evt.type] || 'Ereignis')}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

// ── Routes ───────────────────────────────────────────────────────────────────

// Calendar events for frontend
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { year, month } = req.query;
    let dateFilter = {};
    if (year && month) {
      const from = new Date(parseInt(year), parseInt(month) - 1, 1);
      const to = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      const range = { [Op.between]: [from, to] };
      dateFilter = { visit_date: range, next_due_date: range, event_date: range };
    }
    const events = await buildCalendarEvents(req.user.id, dateFilter);
    res.json(events);
  } catch (e) { next(e); }
});

// Get or create ICS sync token
router.get('/ics-token', authenticate, async (req, res, next) => {
  try {
    let token = req.user.calendar_token;
    if (!token) {
      token = crypto.randomBytes(32).toString('hex');
      await req.user.update({ calendar_token: token });
    }
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost';
    const icsPath = `/api/calendar/ics/${req.user.id}/${token}`;
    res.json({
      token,
      icsUrl: `${baseUrl}${icsPath}`,
      webcalUrl: `${baseUrl}${icsPath}`.replace(/^https?:\/\//, 'webcal://')
    });
  } catch (e) { next(e); }
});

// Refresh ICS token
router.post('/ics-token/refresh', authenticate, async (req, res, next) => {
  try {
    const token = crypto.randomBytes(32).toString('hex');
    await req.user.update({ calendar_token: token });
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost';
    const icsPath = `/api/calendar/ics/${req.user.id}/${token}`;
    res.json({
      token,
      icsUrl: `${baseUrl}${icsPath}`,
      webcalUrl: `${baseUrl}${icsPath}`.replace(/^https?:\/\//, 'webcal://')
    });
  } catch (e) { next(e); }
});

// Public ICS feed (authenticated by token in URL)
router.get('/ics/:userId/:token', async (req, res, next) => {
  try {
    const user = await User.findOne({
      where: { id: req.params.userId, calendar_token: req.params.token, active: true }
    });
    if (!user) return res.status(404).send('Not found');

    // Include last 6 months + all future
    const since = new Date();
    since.setMonth(since.getMonth() - 6);
    const dateFilter = {
      visit_date: { [Op.gte]: since },
      next_due_date: { [Op.gte]: since },
      event_date: { [Op.gte]: since }
    };

    const events = await buildCalendarEvents(user.id, dateFilter);
    const ics = generateICS(events, `${user.name} – Meine Tiere`);

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="pet-calendar.ics"');
    res.send(ics);
  } catch (e) { next(e); }
});

module.exports = router;
