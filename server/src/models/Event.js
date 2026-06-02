const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Event = sequelize.define('Event', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  pet_id: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING(255), allowNull: false },
  event_date: { type: DataTypes.DATE, allowNull: false },
  end_date: { type: DataTypes.DATE },
  description: { type: DataTypes.TEXT },
  category: { type: DataTypes.STRING(100), defaultValue: 'misc' },
  reminder_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
  reminder_at: { type: DataTypes.DATE }
}, {
  tableName: 'events',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Event;
