const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StoolEntry = sequelize.define('StoolEntry', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  pet_id: { type: DataTypes.INTEGER, allowNull: false },
  entry_date: { type: DataTypes.DATEONLY, allowNull: false },
  entry_time: { type: DataTypes.TIME },
  rating: { type: DataTypes.TINYINT, allowNull: false },
  consistency: { type: DataTypes.STRING(100) },
  has_blood: { type: DataTypes.BOOLEAN, defaultValue: false },
  has_mucus: { type: DataTypes.BOOLEAN, defaultValue: false },
  notes: { type: DataTypes.TEXT },
  image_paths: { type: DataTypes.JSON }
}, {
  tableName: 'stool_entries',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = StoolEntry;
