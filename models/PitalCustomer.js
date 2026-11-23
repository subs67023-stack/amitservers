const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PitalCustomer = sequelize.define('PitalCustomer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  customerType: {
    type: DataTypes.ENUM('kharedi', 'veekhari'),
    allowNull: false,
    defaultValue: 'kharedi',
    comment: 'Separate kharedi party from veekhari customer'
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  address: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'pital_customers',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['name', 'customerType']
    }
  ]
});

module.exports = PitalCustomer;
