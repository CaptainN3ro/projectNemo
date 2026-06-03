const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'project_nemo',
  process.env.DB_USER || 'nemo',
  process.env.DB_PASSWORD || 'nemopassword',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      underscored: false,
      freezeTableName: false
    }
  }
);

async function initDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    require('../models');

    await sequelize.sync({ alter: true });
    console.log('Database synced.');

    await seedAdminUser();
    await seedAppSettings();
    await seedSiteSettings();
    await seedAttachmentData();
  } catch (err) {
    console.error('Database init failed:', err);
    process.exit(1);
  }
}

async function seedAdminUser() {
  const { User } = require('../models');
  const bcrypt = require('bcryptjs');

  const adminExists = await User.findOne({ where: { role: 'admin' } });
  if (!adminExists) {
    const hash = await bcrypt.hash('admin123', 12);
    await User.create({
      email: 'admin@example.com',
      password_hash: hash,
      name: 'Administrator',
      role: 'admin'
    });
    console.log('Default admin created: admin@example.com / admin123 — CHANGE THIS PASSWORD!');
  }
}

async function seedAppSettings() {
  const { AppSettings } = require('../models');
  const exists = await AppSettings.findByPk(1);
  if (!exists) {
    await AppSettings.create({ id: 1 });
    console.log('App settings initialized.');
  }
}

async function seedSiteSettings() {
  const { SiteSettings } = require('../models');
  const exists = await SiteSettings.findByPk(1);
  if (!exists) {
    await SiteSettings.create({ id: 1 });
    console.log('Site settings initialized.');
  }
}

async function seedAttachmentData() {
  const { AttachmentType, VetVisitQuickAction } = require('../models');

  const types = [
    { name: 'blood_work',      label: 'Blutbild',            sort_order: 1 },
    { name: 'urine_analysis',  label: 'Urinauswertung',      sort_order: 2 },
    { name: 'ultrasound',      label: 'Ultraschallauswertung', sort_order: 3 },
    { name: 'xray',            label: 'Röntgenbild',         sort_order: 4 },
    { name: 'ecg',             label: 'EKG-Auswertung',      sort_order: 5 },
    { name: 'invoice',         label: 'Rechnung',            sort_order: 6 },
    { name: 'prescription',    label: 'Rezept',              sort_order: 7 },
    { name: 'vaccination_cert',label: 'Impfzertifikat',      sort_order: 8 },
    { name: 'other',           label: 'Sonstiges',           sort_order: 9 }
  ];
  for (const t of types) {
    await AttachmentType.findOrCreate({ where: { name: t.name }, defaults: t });
  }

  const actions = [
    { name: 'last_blood_work',  label: 'Letztes Blutbild',          attachment_type_name: 'blood_work',     sort_order: 1 },
    { name: 'last_urine',       label: 'Letzte Urinauswertung',      attachment_type_name: 'urine_analysis', sort_order: 2 },
    { name: 'last_ultrasound',  label: 'Letzter Ultraschall',        attachment_type_name: 'ultrasound',     sort_order: 3 },
    { name: 'last_xray',        label: 'Letzte Röntgenaufnahme',     attachment_type_name: 'xray',           sort_order: 4 },
    { name: 'last_invoice',     label: 'Letzte Rechnung',            attachment_type_name: 'invoice',        sort_order: 5 }
  ];
  for (const a of actions) {
    await VetVisitQuickAction.findOrCreate({ where: { name: a.name }, defaults: a });
  }
}

module.exports = { sequelize, initDatabase };
