const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'customers',
      key: 'id'
    }
  },
  saleId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'sales',
      key: 'id'
    }
  },
  transactionDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  // UPDATED: Add silver_return and cash_for_silver types
  type: {
    type: DataTypes.ENUM('sale', 'payment', 'adjustment', 'silver_return', 'cash_for_silver'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Generic amount, usually Labor Ledger impact'
  },
  // NEW: Cash Amount specific (for display or reference when amount is 0)
  cashAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0
  },
  // NEW: Silver Rate for historical reference
  silverRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0
  },
  // NEW: Silver return weight
  silverWeight: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: true,
    defaultValue: 0,
    comment: 'Silver weight returned or sold'
  },
  paymentMode: {
    type: DataTypes.ENUM('cash', 'card', 'upi', 'bank_transfer', 'cheque'),
    allowNull: true
  },
  referenceNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Cheque number, UPI ref, etc.'
  },
  balanceBefore: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'DEPRECATED: Use balanceLabor/Silver'
  },
  balanceAfter: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'DEPRECATED: Use balanceLabor/Silver'
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
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'transactions',
  timestamps: true
});

module.exports = Transaction;