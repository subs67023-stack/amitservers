const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RegularTransaction = sequelize.define(
  'RegularTransaction',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    regularCustomerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'regular_customers',
        key: 'id'
      }
    },
    regularSaleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'regular_sales',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM(
        'sale',
        'silver_payment',
        'cash_for_silver',
        'labor_payment',
        'return_silver'
      ),
      allowNull: false,
      comment: 'Type of transaction'
    },
    silverWeight: {
      type: DataTypes.DECIMAL(10, 3),
      defaultValue: 0,
      comment: 'Silver weight in grams (+ for sale, - for payment/return)'
    },
    laborAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Labor amount in rupees (+ for sale, - for payment)'
    },
    cashAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Cash amount for silver payment'
    },
    silverRate: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Silver rate used for cash_for_silver transactions'
    },
    balanceSilverBefore: {
      type: DataTypes.DECIMAL(10, 3),
      defaultValue: 0
    },
    balanceSilverAfter: {
      type: DataTypes.DECIMAL(10, 3),
      defaultValue: 0
    },
    balanceLaborBefore: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    balanceLaborAfter: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    transactionDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  },
  {
    tableName: 'regular_transactions',
    timestamps: true
  }
);

RegularTransaction.associate = models => {
  RegularTransaction.belongsTo(models.RegularCustomer, {
    foreignKey: 'regularCustomerId',
    as: 'customer'
  });
  RegularTransaction.belongsTo(models.RegularSale, {
    foreignKey: 'regularSaleId',
    as: 'sale'
  });
};

module.exports = RegularTransaction;
