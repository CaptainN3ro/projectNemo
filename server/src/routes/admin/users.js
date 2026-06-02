const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User } = require('../../models');
const { authenticate } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/roleCheck');

router.use(authenticate, requireAdmin);

router.get('/', async (req, res, next) => {
  try {
    const users = await User.findAll({ attributes: ['id', 'email', 'name', 'role', 'active', 'created_at'] });
    res.json(users);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { email, name, password, role } = req.body;
    if (!email || !name || !password) return res.status(400).json({ error: 'email, name, password required' });
    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(409).json({ error: 'Email already in use' });
    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, name, password_hash: hash, role: role || 'user' });
    res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { email, name, role, active, password } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (role !== undefined) updates.role = role;
    if (active !== undefined) updates.active = active;
    if (password) updates.password_hash = await bcrypt.hash(password, 12);
    if (email !== undefined && email !== user.email) {
      const taken = await User.findOne({ where: { email, id: { [Op.ne]: user.id } } });
      if (taken) return res.status(409).json({ error: 'Diese E-Mail-Adresse wird bereits verwendet.' });
      updates.email = email;
    }
    await user.update(updates);
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role, active: user.active });
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await user.update({ active: false });
    res.json({ message: 'User deactivated' });
  } catch (e) { next(e); }
});

router.delete('/:id/permanent', async (req, res, next) => {
  try {
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.active) return res.status(400).json({ error: 'Nutzer muss zuerst deaktiviert werden.' });
    await user.destroy();
    res.json({ message: 'User permanently deleted' });
  } catch (e) { next(e); }
});

module.exports = router;
