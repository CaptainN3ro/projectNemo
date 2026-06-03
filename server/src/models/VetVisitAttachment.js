const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const VetVisitAttachment = sequelize.define('VetVisitAttachment', {
  id:                { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  vet_visit_id:      { type: DataTypes.INTEGER, allowNull: false },
  type_id:           { type: DataTypes.INTEGER, allowNull: false },
  file_path:         { type: DataTypes.STRING(500), allowNull: false },
  original_filename: { type: DataTypes.STRING(255) },
  file_size:         { type: DataTypes.INTEGER },
  description:       { type: DataTypes.TEXT }
}, {
  tableName: 'vet_visit_attachments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = VetVisitAttachment;
