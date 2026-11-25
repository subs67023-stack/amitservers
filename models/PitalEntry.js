const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PitalEntry = sequelize.define('PitalEntry', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  entryType: {
    type: DataTypes.ENUM('kharedi', 'veekhari'),
    allowNull: false,
    comment: 'kharedi = purchase, veekhari = sale'
  },
  billNo: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: 'Customer / Party name'
  },
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'pital_customers',
      key: 'id'
    }
  },
  kg: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    defaultValue: 0,
    comment: 'Weight in kg'
  },
  ratePerKg: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Rate per kg in Rs'
  },
  total: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Total = kg * ratePerKg'
  },
  takenRatePerKg: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: null,
    comment: 'Cost rate per kg for veekhari (NOT shown on customer PDF)'
  },
  costAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: null,
    comment: 'Cost = kg * takenRatePerKg'
  },
  profit: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: null,
    comment: 'Profit = total - costAmount'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  items: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null,
    comment: 'List of products for this entry [{ productName, kg, ratePerKg, total }]'
  }
}, {
  tableName: 'pital_entries',
  timestamps: true
});

module.exports = PitalEntry;

