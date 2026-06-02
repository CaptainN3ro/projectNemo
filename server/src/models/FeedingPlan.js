const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FeedingPlan = sequelize.define('FeedingPlan', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  pet_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(255), allowNull: false },
  active: { type: DataTypes.BOOLEAN, defaultValue: true },
  notes: { type: DataTypes.TEXT }
}, {
  tableName: 'feeding_plans',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = FeedingPlan;
