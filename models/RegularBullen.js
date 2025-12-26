const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RegularBullen = sequelize.define('RegularBullen', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  transactionType: {
    type: DataTypes.ENUM('sale', 'purchase', 'badal'),
    allowNull: false,
    defaultValue: 'sale',
    comment: 'Type 1: sale, Type 2: purchase, Type 3: badal'
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  saleType: {
    type: DataTypes.ENUM('gut', 'kach'),
    allowNull: true,
    comment: 'For Type 1, 2 & 3'
  },
  formNo: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'For kach sale/purchase/badal'
  },
  bullenName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  weight: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: true,
    comment: 'Weight in grams (All types)'
  },
  touch: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Touch percentage (Type 2 kach & Type 3)'
  },
  fine: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: true,
    comment: 'Auto calculated: (weight * touch) / 100'
  },
  bhav: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Rate per gram (Type 1 & 2)'
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Gut: weight * bhav, Kach: fine * bhav'
  },
  // Type 3 specific fields
  badal: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: true,
    comment: 'Badal in grams (Type 3 only)'
  },
  rawSilver: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: true,
    comment: 'Raw silver in grams (Type 3 Gut Badal only)'
  },
  totalSilver: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: true,
    comment: 'Total Silver = Raw Silver * Touch / 100 (Type 3 Gut Badal only)'
  },
  gutReturn: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: true,
    comment: 'Gut Return in grams (Type 3 Kachi Badal only)'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description for all types'
  }
}, {
  tableName: 'regular_bullen',
  timestamps: true
});

module.exports = RegularBullen;
