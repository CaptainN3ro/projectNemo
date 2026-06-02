const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FeedingEntry = sequelize.define('FeedingEntry', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  feeding_plan_id: { type: DataTypes.INTEGER, allowNull: false },
  time_of_day: { type: DataTypes.TIME },
  food_type: { type: DataTypes.STRING(255), allowNull: false },
  amount: { type: DataTypes.DECIMAL(8, 2) },
  unit: { type: DataTypes.STRING(50) },
  notes: { type: DataTypes.TEXT }
}, {
  tableName: 'feeding_entries',
  timestamps: false
});

module.exports = FeedingEntry;
