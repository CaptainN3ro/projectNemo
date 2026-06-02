const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Medication = sequelize.define('Medication', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  pet_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(255), allowNull: false },
  dosage: { type: DataTypes.STRING(100) },
  unit: { type: DataTypes.STRING(50) },
  frequency: { type: DataTypes.STRING(100) },
  times_per_day: { type: DataTypes.INTEGER },
  start_date: { type: DataTypes.DATEONLY },
  end_date: { type: DataTypes.DATEONLY },
  notes: { type: DataTypes.TEXT },
  active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'medications',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Medication;
