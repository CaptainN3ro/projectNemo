const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Quick-Action-Definitionen — erweiterbar durch Plugins
const VetVisitQuickAction = sequelize.define('VetVisitQuickAction', {
  id:                   { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name:                 { type: DataTypes.STRING(100), allowNull: false, unique: true },
  label:                { type: DataTypes.STRING(255), allowNull: false },
  attachment_type_name: { type: DataTypes.STRING(100) }, // filtert nach diesem Anlagentyp
  sort_order:           { type: DataTypes.INTEGER, defaultValue: 0 },
  plugin_name:          { type: DataTypes.STRING(100) }, // NULL = eingebaut
  active:               { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'vet_visit_quick_actions',
  timestamps: false
});

module.exports = VetVisitQuickAction;
