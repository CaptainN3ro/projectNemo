const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UrineEntry = sequelize.define('UrineEntry', {
  id:         { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  pet_id:     { type: DataTypes.INTEGER, allowNull: false },
  entry_date: { type: DataTypes.DATEONLY, allowNull: false },
  entry_time: { type: DataTypes.TIME },
  rating:     { type: DataTypes.TINYINT, allowNull: false },
  color:      { type: DataTypes.STRING(100) },
  turbidity:  { type: DataTypes.STRING(100) },
  blood:      { type: DataTypes.BOOLEAN, defaultValue: false },
  sediment:   { type: DataTypes.BOOLEAN, defaultValue: false },
  notes:      { type: DataTypes.TEXT },
  image_paths: { type: DataTypes.JSON }
}, {
  tableName: 'urine_entries',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = UrineEntry;
