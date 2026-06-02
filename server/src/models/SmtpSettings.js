const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SmtpSettings = sequelize.define('SmtpSettings', {
  id: { type: DataTypes.INTEGER, primaryKey: true, defaultValue: 1 },
  host: { type: DataTypes.STRING(255) },
  port: { type: DataTypes.INTEGER, defaultValue: 587 },
  username: { type: DataTypes.STRING(255) },
  password_encrypted: { type: DataTypes.TEXT },
  from_email: { type: DataTypes.STRING(255) },
  from_name: { type: DataTypes.STRING(255), defaultValue: 'Project Nemo' },
  use_tls: { type: DataTypes.BOOLEAN, defaultValue: true },
  active: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'smtp_settings',
  timestamps: true,
  createdAt: false,
  updatedAt: 'updated_at'
});

module.exports = SmtpSettings;
