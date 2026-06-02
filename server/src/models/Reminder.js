const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Reminder = sequelize.define('Reminder', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  pet_id: { type: DataTypes.INTEGER, allowNull: false },
  ref_type: { type: DataTypes.ENUM('vet_visit', 'vaccination', 'event', 'medication'), allowNull: false },
  ref_id: { type: DataTypes.INTEGER, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  remind_at: { type: DataTypes.DATE, allowNull: false },
  sent: { type: DataTypes.BOOLEAN, defaultValue: false },
  sent_at: { type: DataTypes.DATE }
}, {
  tableName: 'reminders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = Reminder;
