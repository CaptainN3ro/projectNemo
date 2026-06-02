const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const { BloodWork, Pet } = require('../models');
const { authenticate } = require('../middleware/auth');
const { uploadPdf, UPLOAD_DIR } = require('../middleware/upload');

router.use(authenticate);

async function getPet(petId, userId) {
  return Pet.findOne({ where: { id: petId, user_id: userId, active: true } });
}

router.get('/:petId/blood-work', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const records = await BloodWork.findAll({ where: { pet_id: pet.id }, order: [['exam_date', 'DESC']] });
    res.json(records);
  } catch (e) { next(e); }
});

router.post('/:petId/blood-work', uploadPdf.single('file'), async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    if (!req.file) return res.status(400).json({ error: 'PDF file required' });
    const { exam_date, description, rating } = req.body;
    if (!exam_date) return res.status(400).json({ error: 'exam_date required' });
    if (rating && (isNaN(rating) || rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Rating must be 1-5' });
    }
    const record = await BloodWork.create({
      pet_id: pet.id,
      exam_date,
      rating: rating ? parseInt(rating) : null,
      description,
      file_path: `/uploads/bloodwork/${req.file.filename}`,
      original_filename: req.file.originalname
    });
    res.status(201).json(record);
  } catch (e) { next(e); }
});

router.get('/:petId/blood-work/:id/download', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const record = await BloodWork.findOne({ where: { id: req.params.id, pet_id: pet.id } });
    if (!record) return res.status(404).json({ error: 'Not found' });
    const filePath = path.join(UPLOAD_DIR, 'bloodwork', path.basename(record.file_path));
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    res.download(filePath, record.original_filename || 'bloodwork.pdf');
  } catch (e) { next(e); }
});

router.delete('/:petId/blood-work/:id', async (req, res, next) => {
  try {
    const pet = await getPet(req.params.petId, req.user.id);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    const record = await BloodWork.findOne({ where: { id: req.params.id, pet_id: pet.id } });
    if (!record) return res.status(404).json({ error: 'Not found' });
    const filePath = path.join(UPLOAD_DIR, 'bloodwork', path.basename(record.file_path));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await record.destroy();
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

module.exports = router;
