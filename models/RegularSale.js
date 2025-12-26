const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RegularSale = sequelize.define(
  'RegularSale',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    voucherNumber: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false
    },
    regularCustomerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'regular_customers',
        key: 'id'
      }
    },
    saleDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    totalNetWeight: {
      type: DataTypes.DECIMAL(10, 3),
      defaultValue: 0,
      comment: 'Total net weight of items'
    },
    totalWastage: {
      type: DataTypes.DECIMAL(10, 3),
      defaultValue: 0,
      comment: 'Total wastage in grams'
    },
    totalSilverWeight: {
      type: DataTypes.DECIMAL(10, 3),
      defaultValue: 0,
      comment: 'Total silver weight customer owes (grams)'
    },
    totalLaborCharges: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Total labor charges customer owes (₹)'
    },
    paidSilver: {
      type: DataTypes.DECIMAL(10, 3),
      defaultValue: 0,
      comment: 'Total physical silver returned by customer (grams)'
    },
    paidLabor: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Total labor paid in cash (₹)'
    },
    balanceSilver: {
      type: DataTypes.DECIMAL(10, 3),
      defaultValue: 0,
      comment: 'Remaining silver balance (grams)'
    },
    balanceLabor: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Remaining labor balance (₹)'
    },
    previousBalanceSilver: {
      type: DataTypes.DECIMAL(10, 3),
      defaultValue: 0,
      comment: 'Previous silver balance'
    },
    previousBalanceLabor: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Previous labor balance'
    },
    includePreviousDue: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether to include previous due in this bill'
    },
    laborStatus: {
      type: DataTypes.ENUM('PAID', 'UNPAID'),
      defaultValue: 'UNPAID',
      comment: 'Whether labor is fully paid'
    },
    silverStatus: {
      type: DataTypes.ENUM('PAID', 'UNPAID'),
      defaultValue: 'UNPAID',
      comment: 'Whether silver is fully paid'
    },
    status: {
      type: DataTypes.ENUM('pending', 'partial', 'paid'),
      defaultValue: 'pending',
      comment: 'Overall payment status'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  },
  {
    tableName: 'regular_sales',
    timestamps: true
  }
);

RegularSale.associate = models => {
  RegularSale.belongsTo(models.RegularCustomer, {
    foreignKey: 'regularCustomerId',
    as: 'customer'
  });
  RegularSale.hasMany(models.RegularSaleItem, {
    foreignKey: 'regularSaleId',
    as: 'items'
  });
  RegularSale.hasMany(models.RegularTransaction, {
    foreignKey: 'regularSaleId',
    as: 'transactions'
  });
};

module.exports = RegularSale;
