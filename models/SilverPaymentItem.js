const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SilverPaymentItem = sequelize.define('SilverPaymentItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  regularSaleId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'regular_sales',
      key: 'id'
    }
  },
  regularTransactionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'regular_transactions',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Name of person giving silver'
  },
  formNo: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Form/Reference number'
  },
  weight: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    comment: 'Silver weight in grams'
  },
  tounch: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Purity percentage'
  },
  fine: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    comment: 'Calculated fine = weight × tounch / 100'
  }
}, {
  tableName: 'silver_payment_items',
  timestamps: true
});

module.exports = SilverPaymentItem;
