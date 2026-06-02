function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function requireOwnership(model) {
  return async (req, res, next) => {
    try {
      const record = await model.findByPk(req.params.id);
      if (!record) return res.status(404).json({ error: 'Not found' });

      const pet = record.pet_id
        ? await require('../models').Pet.findByPk(record.pet_id)
        : record;

      if (pet.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      req.record = record;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireAdmin, requireOwnership };
