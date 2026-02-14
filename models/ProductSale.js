const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProductSale = sequelize.define('ProductSale', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    voucherNumber: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    customerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'product_customers',
            key: 'id'
        }
    },
    saleDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    billingType: {
        type: DataTypes.ENUM('regular', 'wholesale', 'production'),
        allowNull: false,
        defaultValue: 'wholesale'
    },
    totalNetWeight: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false,
        defaultValue: 0
    },
    totalWastage: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false,
        defaultValue: 0
    },
    totalSilverWeight: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false,
        defaultValue: 0
    },
    totalLaborCharges: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    silverRate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    gstApplicable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    cgst: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    sgst: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    paidAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    paidSilver: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false,
        defaultValue: 0
    },
    balanceSilver: {
        type: DataTypes.DECIMAL(10, 3),
        defaultValue: 0
    },
    balanceLabor: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    previousBalanceSilver: {
        type: DataTypes.DECIMAL(10, 3),
        defaultValue: 0
    },
    previousBalanceLabor: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    silverToReturn: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false,
        defaultValue: 0
    },
    silverReturned: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false,
        defaultValue: 0
    },
    silverReturnStatus: {
        type: DataTypes.ENUM('pending', 'partial', 'completed', 'na'),
        defaultValue: 'na'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('pending', 'partial', 'paid', 'cancelled'),
        defaultValue: 'pending'
    },
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'product_sales',
    timestamps: true
});

module.exports = ProductSale;
