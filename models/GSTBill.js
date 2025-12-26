const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GSTBill = sequelize.define('GSTBill', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    billNumber: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    customerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'gst_customers',
            key: 'id'
        }
    },
    state: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    stateCode: {
        type: DataTypes.STRING(10),
        allowNull: true
    },
    transportMode: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    dispatchedThrough: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    destination: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    placeOfSupply: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    pinCode: {
        type: DataTypes.STRING(10),
        allowNull: true
    },
    totalQuantity: {
        type: DataTypes.DECIMAL(10, 3), // allowing 3 decimal places for partial grams if needed
        defaultValue: 0
    },
    totalAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0
    },
    cgstAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    sgstAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    igstAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    roundOff: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
    },
    grandTotal: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0
    },
    amountInWords: {
        type: DataTypes.STRING,
        allowNull: true
    },
    paymentMode: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    paymentDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'gst_bills',
    timestamps: true
});

module.exports = GSTBill;
