const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AttachmentType = sequelize.define('AttachmentType', {
  id:          { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name:        { type: DataTypes.STRING(100), allowNull: false, unique: true },
  label:       { type: DataTypes.STRING(255), allowNull: false },
  sort_order:  { type: DataTypes.INTEGER, defaultValue: 0 },
  plugin_name: { type: DataTypes.STRING(100) }, // NULL = eingebaut
  active:      { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'attachment_types',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = AttachmentType;
