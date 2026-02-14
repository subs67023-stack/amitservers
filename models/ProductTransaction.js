const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProductTransaction = sequelize.define('ProductTransaction', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    customerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'product_customers',
            key: 'id'
        }
    },
    saleId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'product_sales',
            key: 'id'
        }
    },
    transactionDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    type: {
        type: DataTypes.ENUM('sale', 'payment', 'adjustment', 'silver_return', 'cash_for_silver'),
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Generic amount, usually Labor Ledger impact'
    },
    cashAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
    },
    silverRate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0
    },
    silverWeight: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: true,
        defaultValue: 0
    },
    paymentMode: {
        type: DataTypes.ENUM('cash', 'card', 'upi', 'bank_transfer', 'cheque'),
        allowNull: true
    },
    referenceNumber: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    balanceBefore: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    balanceAfter: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
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
        allowNull: true
    }
}, {
    tableName: 'product_transactions',
    timestamps: true
});

module.exports = ProductTransaction;
