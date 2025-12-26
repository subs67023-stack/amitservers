const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RegularCustomer = sequelize.define('RegularCustomer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  balanceSilver: {
    type: DataTypes.DECIMAL(10, 3),
    defaultValue: 0,
    comment: 'Current silver balance in grams'
  },
  balanceLabor: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: 'Current labor balance in rupees'
  }
}, {
  tableName: 'regular_customers',
  timestamps: true
});

RegularCustomer.associate = (models) => {
  RegularCustomer.hasMany(models.RegularSale, {
    foreignKey: 'regularCustomerId',
    as: 'sales'
  });
  RegularCustomer.hasMany(models.RegularTransaction, {
    foreignKey: 'regularCustomerId',
    as: 'transactions'
  });
};

module.exports = RegularCustomer;
