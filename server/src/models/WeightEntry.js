const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WeightEntry = sequelize.define('WeightEntry', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  pet_id: { type: DataTypes.INTEGER, allowNull: false },
  entry_date: { type: DataTypes.DATEONLY, allowNull: false },
  weight: { type: DataTypes.DECIMAL(6, 2), allowNull: false },
  notes: { type: DataTypes.TEXT }
}, {
  tableName: 'weight_entries',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = WeightEntry;
