const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const VetVisit = sequelize.define('VetVisit', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  pet_id: { type: DataTypes.INTEGER, allowNull: false },
  visit_date: { type: DataTypes.DATE, allowNull: false },
  is_future: { type: DataTypes.BOOLEAN, defaultValue: false },
  reason: { type: DataTypes.TEXT, allowNull: false },
  diagnosis: { type: DataTypes.TEXT },
  treatment: { type: DataTypes.TEXT },
  vet_name: { type: DataTypes.STRING(255) },
  vet_clinic: { type: DataTypes.STRING(255) },
  notes: { type: DataTypes.TEXT },
  cost: { type: DataTypes.DECIMAL(10, 2) },
  reminder_enabled: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'vet_visits',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = VetVisit;
