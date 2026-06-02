const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Vaccination = sequelize.define('Vaccination', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  pet_id: { type: DataTypes.INTEGER, allowNull: false },
  vaccine_name: { type: DataTypes.STRING(255), allowNull: false },
  vaccination_date: { type: DataTypes.DATEONLY, allowNull: false },
  next_due_date: { type: DataTypes.DATEONLY },
  batch_number: { type: DataTypes.STRING(100) },
  vet_name: { type: DataTypes.STRING(255) },
  notes: { type: DataTypes.TEXT },
  reminder_enabled: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'vaccinations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Vaccination;
