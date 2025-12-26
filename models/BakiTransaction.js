const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BakiTransaction = sequelize.define('BakiTransaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  employeeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'employees',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('given', 'returned'),
    allowNull: false,
    comment: 'given: Employee took baki, returned: Employee returned baki'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'baki_transactions',
  timestamps: true
});

module.exports = BakiTransaction;
