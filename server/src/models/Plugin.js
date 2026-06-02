const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Plugin = sequelize.define('Plugin', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  short_name: { type: DataTypes.STRING(50), allowNull: false },
  long_name: { type: DataTypes.STRING(255), allowNull: false },
  version: { type: DataTypes.STRING(20) },
  author: { type: DataTypes.STRING(255) },
  author_link: { type: DataTypes.STRING(500) },
  description: { type: DataTypes.TEXT },
  icon_path: { type: DataTypes.STRING(500) },
  active: { type: DataTypes.BOOLEAN, defaultValue: true },
  install_path: { type: DataTypes.STRING(500) },
  menu_placement: { type: DataTypes.ENUM('top', 'pet'), defaultValue: 'top' }
}, {
  tableName: 'plugins',
  timestamps: true,
  createdAt: 'installed_at',
  updatedAt: false
});

module.exports = Plugin;
