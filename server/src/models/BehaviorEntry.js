const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BehaviorEntry = sequelize.define('BehaviorEntry', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  pet_id: { type: DataTypes.INTEGER, allowNull: false },
  entry_date: { type: DataTypes.DATEONLY, allowNull: false },
  entry_time: { type: DataTypes.TIME },
  rating: { type: DataTypes.TINYINT, allowNull: false },
  category: { type: DataTypes.STRING(100) },
  notes: { type: DataTypes.TEXT },
  image_paths: { type: DataTypes.JSON }
}, {
  tableName: 'behavior_entries',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = BehaviorEntry;
