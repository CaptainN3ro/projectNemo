const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AppSettings = sequelize.define('AppSettings', {
  id: { type: DataTypes.INTEGER, primaryKey: true, defaultValue: 1 },
  allow_registration: { type: DataTypes.BOOLEAN, defaultValue: false },
  require_email_verification: { type: DataTypes.BOOLEAN, defaultValue: false },
  allow_password_reset: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'app_settings',
  timestamps: true,
  createdAt: false,
  updatedAt: 'updated_at'
});

module.exports = AppSettings;
