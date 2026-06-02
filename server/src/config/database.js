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

module.exports = { sequelize, initDatabase };
