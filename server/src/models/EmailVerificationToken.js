const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EmailVerificationToken = sequelize.define('EmailVerificationToken', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  token: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  used: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'email_verification_tokens',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = EmailVerificationToken;
