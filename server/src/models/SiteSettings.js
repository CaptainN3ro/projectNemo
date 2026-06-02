const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SiteSettings = sequelize.define('SiteSettings', {
  id: { type: DataTypes.INTEGER, primaryKey: true, defaultValue: 1 },
  app_name: { type: DataTypes.STRING(100), defaultValue: 'Project Nemo' },
  logo_path: { type: DataTypes.STRING(500) },
  favicon_path: { type: DataTypes.STRING(500) },
  seo_title: { type: DataTypes.STRING(200) },
  seo_description: { type: DataTypes.TEXT },
  robots_index: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'site_settings',
  timestamps: true,
  createdAt: false,
  updatedAt: 'updated_at'
});

module.exports = SiteSettings;
