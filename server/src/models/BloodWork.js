const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BloodWork = sequelize.define('BloodWork', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  pet_id: { type: DataTypes.INTEGER, allowNull: false },
  exam_date: { type: DataTypes.DATEONLY, allowNull: false },
  rating: { type: DataTypes.TINYINT },
  description: { type: DataTypes.TEXT },
  file_path: { type: DataTypes.STRING(500), allowNull: false },
  original_filename: { type: DataTypes.STRING(255) }
}, {
  tableName: 'blood_work',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = BloodWork;
