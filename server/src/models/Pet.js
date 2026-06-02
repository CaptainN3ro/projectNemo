const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Pet = sequelize.define('Pet', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(255), allowNull: false },
  species: { type: DataTypes.STRING(100) },
  breed: { type: DataTypes.STRING(100) },
  birth_date: { type: DataTypes.DATEONLY },
  gender: { type: DataTypes.ENUM('male', 'female', 'unknown'), defaultValue: 'unknown' },
  weight: { type: DataTypes.DECIMAL(6, 2) },
  color: { type: DataTypes.STRING(100) },
  microchip_id: { type: DataTypes.STRING(100) },
  photo_path: { type: DataTypes.STRING(500) },
  notes: { type: DataTypes.TEXT },
  active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'pets',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Pet;
