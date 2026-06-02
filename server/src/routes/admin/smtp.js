const router = require('express').Router();
const { SmtpSettings } = require('../../models');
const { authenticate } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/roleCheck');
const { encrypt, decrypt } = require('../../config/encryption');

router.use(authenticate, requireAdmin);

router.get('/', async (req, res, next) => {
  try {
    let settings = await SmtpSettings.findByPk(1);
    if (!settings) {
      settings = await SmtpSettings.create({ id: 1 });
    }
    res.json({
      host: settings.host,
      port: settings.port,
      username: settings.username,
      hasPassword: !!settings.password_encrypted,
      from_email: settings.from_email,
      from_name: settings.from_name,
      use_tls: settings.use_tls,
      active: settings.active
    });
  } catch (e) { next(e); }
});

router.put('/', async (req, res, next) => {
  try {
    const { host, port, username, password, from_email, from_name, use_tls, active } = req.body;
    let settings = await SmtpSettings.findByPk(1);
    if (!settings) settings = await SmtpSettings.create({ id: 1 });

    const updates = { host, port, username, from_email, from_name, use_tls, active };
    if (password) updates.password_encrypted = encrypt(password);

    await settings.update(updates);
    res.json({ message: 'SMTP settings updated' });
  } catch (e) { next(e); }
});

router.post('/test', async (req, res, next) => {
  try {
    const { sendTestEmail } = require('../../services/emailService');
    await sendTestEmail(req.user.email);
    res.json({ message: `Test email sent to ${req.user.email}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
