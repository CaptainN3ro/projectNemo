const router = require('express').Router();
const { AppSettings, SmtpSettings } = require('../../models');
const { authenticate } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/roleCheck');

router.use(authenticate, requireAdmin);

router.get('/', async (req, res, next) => {
  try {
    let settings = await AppSettings.findByPk(1);
    if (!settings) settings = await AppSettings.create({ id: 1 });

    const smtp = await SmtpSettings.findByPk(1);
    const smtpActive = !!(smtp?.active && smtp?.host);

    res.json({
      allow_registration: settings.allow_registration,
      require_email_verification: settings.require_email_verification,
      allow_password_reset: settings.allow_password_reset,
      smtpActive
    });
  } catch (e) { next(e); }
});

router.put('/', async (req, res, next) => {
  try {
    let settings = await AppSettings.findByPk(1);
    if (!settings) settings = await AppSettings.create({ id: 1 });

    const smtp = await SmtpSettings.findByPk(1);
    const smtpActive = !!(smtp?.active && smtp?.host);

    const { allow_registration, require_email_verification, allow_password_reset } = req.body;

    const updates = { allow_registration };

    // Email-dependent features require active SMTP
    if (require_email_verification && !smtpActive) {
      return res.status(400).json({ error: 'E-Mail-Verifikation benötigt aktives SMTP.' });
    }
    if (allow_password_reset && !smtpActive) {
      return res.status(400).json({ error: 'Passwort-Zurücksetzen benötigt aktives SMTP.' });
    }

    updates.require_email_verification = require_email_verification;
    updates.allow_password_reset = allow_password_reset;

    await settings.update(updates);
    res.json({ message: 'Einstellungen gespeichert.' });
  } catch (e) { next(e); }
});

module.exports = router;
