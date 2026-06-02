require('dotenv').config();
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { User, AppSettings, PasswordResetToken, EmailVerificationToken, SmtpSettings } = require('../models');
const { authenticate } = require('../middleware/auth');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost';

function signTokens(user) {
  const payload = { userId: user.id, role: user.role };
  const access = jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '15m' });
  const refresh = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'fallback_refresh', { expiresIn: '7d' });
  return { access, refresh };
}

async function isSmtpActive() {
  const smtp = await SmtpSettings.findByPk(1);
  return smtp?.active && smtp?.host;
}

// Public: get what features are enabled
router.get('/public-settings', async (req, res) => {
  try {
    const settings = await AppSettings.findByPk(1);
    const smtpActive = await isSmtpActive();
    res.json({
      allowRegistration: settings?.allow_registration || false,
      requireEmailVerification: settings?.require_email_verification && smtpActive,
      allowPasswordReset: settings?.allow_password_reset && smtpActive
    });
  } catch {
    res.json({ allowRegistration: false, requireEmailVerification: false, allowPasswordReset: false });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Ungültige Eingabe' });

  const { email, password } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
  if (!user.active) return res.status(401).json({ error: 'Konto nicht aktiv. Bitte E-Mail bestätigen.' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Ungültige Anmeldedaten' });

  const { access, refresh } = signTokens(user);
  res.json({
    token: access,
    refreshToken: refresh,
    user: { id: user.id, email: user.email, name: user.name, role: user.role }
  });
});

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('name').trim().notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Ungültige Eingabe. Passwort mind. 8 Zeichen.' });

  try {
    const settings = await AppSettings.findByPk(1);
    if (!settings?.allow_registration) {
      return res.status(403).json({ error: 'Registrierung ist deaktiviert.' });
    }

    const { email, password, name } = req.body;
    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(409).json({ error: 'E-Mail bereits registriert.' });

    const smtpActive = await isSmtpActive();
    const requireVerification = settings.require_email_verification && smtpActive;

    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email,
      password_hash: hash,
      name,
      role: 'user',
      active: !requireVerification
    });

    if (requireVerification) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
      await EmailVerificationToken.create({ user_id: user.id, token, expires_at: expiresAt });

      const { sendEmail } = require('../services/emailService');
      await sendEmail({
        to: email,
        subject: 'Project Nemo — E-Mail bestätigen',
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #10b981;">Willkommen bei Project Nemo!</h2>
            <p>Hallo ${name},</p>
            <p>bitte bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren:</p>
            <a href="${FRONTEND_URL}/verify-email?token=${token}" style="display:inline-block;background:#10b981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0;">
              E-Mail bestätigen
            </a>
            <p style="color:#9ca3af;font-size:12px;">Der Link ist 24 Stunden gültig.</p>
          </div>
        `
      });
      return res.status(201).json({ message: 'Konto erstellt. Bitte prüfe deine E-Mails zur Bestätigung.' });
    }

    const { access, refresh } = signTokens(user);
    res.status(201).json({
      token: access,
      refreshToken: refresh,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Registrierung fehlgeschlagen.' });
  }
});

// Verify email
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token fehlt.' });

  try {
    const record = await EmailVerificationToken.findOne({ where: { token, used: false } });
    if (!record) return res.status(400).json({ error: 'Ungültiger oder bereits verwendeter Token.' });
    if (new Date() > record.expires_at) return res.status(400).json({ error: 'Token abgelaufen. Bitte neu registrieren.' });

    await User.update({ active: true }, { where: { id: record.user_id } });
    await record.update({ used: true });

    res.json({ message: 'E-Mail erfolgreich bestätigt. Du kannst dich jetzt anmelden.' });
  } catch {
    res.status(500).json({ error: 'Verifizierung fehlgeschlagen.' });
  }
});

// Forgot password
router.post('/forgot-password', [body('email').isEmail().normalizeEmail()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Ungültige E-Mail.' });

  try {
    const settings = await AppSettings.findByPk(1);
    const smtpActive = await isSmtpActive();
    if (!settings?.allow_password_reset || !smtpActive) {
      return res.status(403).json({ error: 'Passwort-Zurücksetzen ist deaktiviert.' });
    }

    const { email } = req.body;
    const user = await User.findOne({ where: { email } });
    // Always return success to avoid user enumeration
    if (!user || !user.active) return res.json({ message: 'Falls die E-Mail existiert, wurde ein Link gesendet.' });

    // Invalidate old tokens
    await PasswordResetToken.update({ used: true }, { where: { user_id: user.id, used: false } });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await PasswordResetToken.create({ user_id: user.id, token, expires_at: expiresAt });

    const { sendEmail } = require('../services/emailService');
    await sendEmail({
      to: email,
      subject: 'Project Nemo — Passwort zurücksetzen',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #10b981;">Passwort zurücksetzen</h2>
          <p>Hallo ${user.name},</p>
          <p>du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt. Klicke auf den Button:</p>
          <a href="${FRONTEND_URL}/reset-password?token=${token}" style="display:inline-block;background:#10b981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0;">
            Passwort zurücksetzen
          </a>
          <p style="color:#9ca3af;font-size:12px;">Der Link ist 1 Stunde gültig. Falls du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail.</p>
        </div>
      `
    });

    res.json({ message: 'Falls die E-Mail existiert, wurde ein Link gesendet.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Fehler beim Senden der E-Mail.' });
  }
});

// Reset password
router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 8 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Passwort mind. 8 Zeichen.' });

  const { token, password } = req.body;
  try {
    const record = await PasswordResetToken.findOne({ where: { token, used: false } });
    if (!record) return res.status(400).json({ error: 'Ungültiger oder bereits verwendeter Link.' });
    if (new Date() > record.expires_at) return res.status(400).json({ error: 'Link abgelaufen. Bitte erneut anfordern.' });

    const hash = await bcrypt.hash(password, 12);
    await User.update({ password_hash: hash }, { where: { id: record.user_id } });
    await record.update({ used: true });

    res.json({ message: 'Passwort erfolgreich geändert. Du kannst dich jetzt anmelden.' });
  } catch {
    res.status(500).json({ error: 'Passwort zurücksetzen fehlgeschlagen.' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ error: 'Refresh token benötigt' });
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'fallback_refresh');
    const user = await User.findOne({ where: { id: payload.userId, active: true } });
    if (!user) return res.status(401).json({ error: 'Nutzer nicht gefunden' });
    const { access, refresh } = signTokens(user);
    res.json({ token: access, refreshToken: refresh });
  } catch {
    res.status(401).json({ error: 'Ungültiger Refresh-Token' });
  }
});

// Me
router.get('/me', authenticate, (req, res) => {
  const { id, email, name, role } = req.user;
  res.json({ id, email, name, role });
});

// Change password
router.put('/password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Neues Passwort mind. 8 Zeichen.' });

  const { currentPassword, newPassword } = req.body;
  const valid = await bcrypt.compare(currentPassword, req.user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Aktuelles Passwort falsch.' });

  const hash = await bcrypt.hash(newPassword, 12);
  await req.user.update({ password_hash: hash });
  res.json({ message: 'Passwort aktualisiert.' });
});

// Change own email
router.put('/email', authenticate, [
  body('email').isEmail().normalizeEmail(),
  body('currentPassword').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Ungültige E-Mail-Adresse.' });

  const { email, currentPassword } = req.body;
  const valid = await bcrypt.compare(currentPassword, req.user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Aktuelles Passwort falsch.' });

  const { Op } = require('sequelize');
  const taken = await User.findOne({ where: { email, id: { [Op.ne]: req.user.id } } });
  if (taken) return res.status(409).json({ error: 'Diese E-Mail-Adresse wird bereits verwendet.' });

  await req.user.update({ email });
  res.json({ message: 'E-Mail-Adresse aktualisiert.', email });
});

// Delete own account
router.delete('/account', authenticate, [
  body('currentPassword').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Passwort zur Bestätigung erforderlich.' });

  const { currentPassword } = req.body;
  const valid = await bcrypt.compare(currentPassword, req.user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Passwort falsch.' });

  if (req.user.role === 'admin') {
    const adminCount = await User.count({ where: { role: 'admin', active: true } });
    if (adminCount <= 1) {
      return res.status(400).json({ error: 'Du bist der einzige Administrator. Konto kann nicht gelöscht werden.' });
    }
  }

  await req.user.destroy();
  res.json({ message: 'Konto wurde gelöscht.' });
});

module.exports = router;
