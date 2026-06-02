const nodemailer = require('nodemailer');
const { SmtpSettings } = require('../models');
const { decrypt } = require('../config/encryption');

async function getTransporter() {
  const settings = await SmtpSettings.findByPk(1);
  if (!settings || !settings.active || !settings.host) {
    throw new Error('SMTP not configured or inactive');
  }
  return nodemailer.createTransport({
    host: settings.host,
    port: settings.port || 587,
    secure: settings.port === 465,
    auth: {
      user: settings.username,
      pass: decrypt(settings.password_encrypted)
    },
    tls: settings.use_tls ? { rejectUnauthorized: false } : undefined
  });
}

async function sendEmail({ to, subject, html, text }) {
  const transporter = await getTransporter();
  const settings = await SmtpSettings.findByPk(1);
  return transporter.sendMail({
    from: `"${settings.from_name || 'Project Nemo'}" <${settings.from_email}>`,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, '')
  });
}

async function sendReminderEmail({ to, petName, message, date }) {
  const dateStr = new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  return sendEmail({
    to,
    subject: `Erinnerung: ${message}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #10b981;">Project Nemo — Erinnerung</h2>
        <p><strong>Tier:</strong> ${petName}</p>
        <p><strong>Termin:</strong> ${dateStr}</p>
        <p><strong>Hinweis:</strong> ${message}</p>
        <hr style="border: 1px solid #e5e7eb;" />
        <p style="color: #9ca3af; font-size: 12px;">Project Nemo — Tier-Dokumentationssystem</p>
      </div>
    `
  });
}

async function sendTestEmail(to) {
  return sendEmail({
    to,
    subject: 'Project Nemo — SMTP Test',
    html: '<p>SMTP-Konfiguration erfolgreich. E-Mail-Versand funktioniert.</p>'
  });
}

module.exports = { sendEmail, sendReminderEmail, sendTestEmail };
