const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const { VetVisit, VetVisitAttachment, AttachmentType, VetVisitQuickAction, Pet } = require('../models');
const { authenticate } = require('../middleware/auth');
const { uploadAttachment, UPLOAD_DIR } = require('../middleware/upload');

router.use(authenticate);

const e2n = v => v === '' ? null : v;

async function getPet(petId, userId) {
  return Pet.findOne({ where: { id: petId, user_id: userId, active: true } });
}
async function getVisit(petId, visitId) {
  return VetVisit.findOne({ where: { id: visitId, pet_id: petId } });
}

// ── Anlagentypen (ohne Pet-Kontext, einmalig laden) ───────────────────────
router.get('/attachment-types', async (req, res, next) => {
  try {
    const types = await AttachmentType.findAll({ where: { active: true }, order: [['sort_order', 'ASC']] });
    res.json(types);
  } catch (e) { next(e); }
});

// ── Quick-Actions mit letztem passendem Besuch ────────────────────────────
router.get('/:petId/vet-visits/quick-actions', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });

    const actions = await VetVisitQuickAction.findAll({ where: { active: true }, order: [['sort_order', 'ASC']] });

    const result = await Promise.all(actions.map(async action => {
      let lastVisitId = null;
      if (action.attachment_type_name) {
        const type = await AttachmentType.findOne({ where: { name: action.attachment_type_name } });
        if (type) {
          const att = await VetVisitAttachment.findOne({
            include: [{ model: VetVisit, where: { pet_id: pet.id }, required: true }],
            where: { type_id: type.id },
            order: [[VetVisit, 'visit_date', 'DESC'], [VetVisit, 'created_at', 'DESC']]
          });
          if (att) lastVisitId = att.vet_visit_id;
        }
      }
      return { ...action.toJSON(), lastVisitId };
    }));

    res.json(result);
  } catch (e) { next(e); }
});

// ── Tierarztbesuche CRUD ──────────────────────────────────────────────────
router.get('/:petId/vet-visits', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const visits = await VetVisit.findAll({
      where: { pet_id: pet.id },
      include: [{ model: VetVisitAttachment, include: [AttachmentType] }],
      order: [['visit_date', 'DESC']]
    });
    res.json(visits);
  } catch (e) { next(e); }
});

router.post('/:petId/vet-visits', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const { visit_date, is_future, reason, diagnosis, treatment, vet_name, vet_clinic, notes, cost, reminder_enabled } = req.body;
    if (!visit_date || !reason) return res.status(400).json({ error: 'visit_date und reason erforderlich' });
    const visit = await VetVisit.create({ pet_id: pet.id, visit_date, is_future, reason, diagnosis, treatment, vet_name, vet_clinic, notes, cost: e2n(cost), reminder_enabled });
    if (reminder_enabled && is_future) {
      const { createReminder } = require('../services/reminderService');
      await createReminder({ userId: req.user.id, petId: pet.id, refType: 'vet_visit', refId: visit.id, message: `Tierarzttermin fuer ${pet.name}: ${reason}`, remindAt: new Date(visit_date) });
    }
    const full = await VetVisit.findByPk(visit.id, { include: [{ model: VetVisitAttachment, include: [AttachmentType] }] });
    res.status(201).json(full);
  } catch (e) { next(e); }
});

router.put('/:petId/vet-visits/:id', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const visit = await getVisit(pet.id, req.params.id);
    if (!visit) return res.status(404).json({ error: 'Not found' });
    const body = { ...req.body };
    if (body.cost === '') body.cost = null;
    await visit.update(body);
    const full = await VetVisit.findByPk(visit.id, { include: [{ model: VetVisitAttachment, include: [AttachmentType] }] });
    res.json(full);
  } catch (e) { next(e); }
});

router.delete('/:petId/vet-visits/:id', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const visit = await getVisit(pet.id, req.params.id);
    if (!visit) return res.status(404).json({ error: 'Not found' });
    const attachments = await VetVisitAttachment.findAll({ where: { vet_visit_id: visit.id } });
    for (const att of attachments) {
      const abs = path.join(UPLOAD_DIR, 'attachments', path.basename(att.file_path));
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
    }
    await visit.destroy();
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

// ── Anlagen pro Besuch ────────────────────────────────────────────────────
router.post('/:petId/vet-visits/:visitId/attachments', uploadAttachment.single('file'), async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const visit = await getVisit(pet.id, req.params.visitId);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    if (!req.file) return res.status(400).json({ error: 'Datei erforderlich' });
    const { type_id, description } = req.body;
    if (!type_id) return res.status(400).json({ error: 'type_id erforderlich' });
    const type = await AttachmentType.findByPk(type_id);
    if (!type) return res.status(400).json({ error: 'Unbekannter Anlagentyp' });
    const att = await VetVisitAttachment.create({
      vet_visit_id: visit.id, type_id,
      file_path: `/uploads/attachments/${req.file.filename}`,
      original_filename: req.file.originalname,
      file_size: req.file.size,
      description: description || null
    });
    const full = await VetVisitAttachment.findByPk(att.id, { include: [AttachmentType] });
    res.status(201).json(full);
  } catch (e) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    next(e);
  }
});

router.put('/:petId/vet-visits/:visitId/attachments/:attId', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const visit = await getVisit(pet.id, req.params.visitId);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    const att = await VetVisitAttachment.findOne({ where: { id: req.params.attId, vet_visit_id: visit.id } });
    if (!att) return res.status(404).json({ error: 'Not found' });
    const { type_id, description } = req.body;
    await att.update({ ...(type_id !== undefined ? { type_id } : {}), ...(description !== undefined ? { description } : {}) });
    const full = await VetVisitAttachment.findByPk(att.id, { include: [AttachmentType] });
    res.json(full);
  } catch (e) { next(e); }
});

router.delete('/:petId/vet-visits/:visitId/attachments/:attId', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const visit = await getVisit(pet.id, req.params.visitId);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    const att = await VetVisitAttachment.findOne({ where: { id: req.params.attId, vet_visit_id: visit.id } });
    if (!att) return res.status(404).json({ error: 'Not found' });
    const abs = path.join(UPLOAD_DIR, 'attachments', path.basename(att.file_path));
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
    await att.destroy();
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

router.get('/:petId/vet-visits/:visitId/attachments/:attId/download', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const visit = await getVisit(pet.id, req.params.visitId);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    const att = await VetVisitAttachment.findOne({ where: { id: req.params.attId, vet_visit_id: visit.id } });
    if (!att) return res.status(404).json({ error: 'Not found' });
    const abs = path.join(UPLOAD_DIR, 'attachments', path.basename(att.file_path));
    if (!fs.existsSync(abs)) return res.status(404).json({ error: 'Datei fehlt' });
    res.download(abs, att.original_filename || 'anlage');
  } catch (e) { next(e); }
});

// Vorschau — Content-Disposition: inline, damit Browser PDF/Bild direkt anzeigt
router.get('/:petId/vet-visits/:visitId/attachments/:attId/view', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const visit = await getVisit(pet.id, req.params.visitId);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    const att = await VetVisitAttachment.findOne({ where: { id: req.params.attId, vet_visit_id: visit.id } });
    if (!att) return res.status(404).json({ error: 'Not found' });
    const abs = path.join(UPLOAD_DIR, 'attachments', path.basename(att.file_path));
    if (!fs.existsSync(abs)) return res.status(404).json({ error: 'Datei fehlt' });

    const ext = path.extname(att.file_path).toLowerCase();
    const mimeTypes = {
      '.pdf':  'application/pdf',
      '.jpg':  'image/jpeg', '.jpeg': 'image/jpeg',
      '.png':  'image/png',
      '.gif':  'image/gif',
      '.webp': 'image/webp',
      '.heic': 'image/heic'
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const safeName = (att.original_filename || 'datei').replace(/"/g, '');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    res.sendFile(abs);
  } catch (e) { next(e); }
});

module.exports = router;
