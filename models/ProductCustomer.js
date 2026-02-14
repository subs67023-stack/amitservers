const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const ProductCustomer = sequelize.define('ProductCustomer', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    phone: {
        type: DataTypes.STRING(15),
        allowNull: false
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: true,
        validate: {
            isEmail: true
        }
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    gstNumber: {
        type: DataTypes.STRING(15),
        allowNull: true
    },
    balance: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
        comment: 'Legacy balance field'
    },
    balanceSilver: {
        type: DataTypes.DECIMAL(10, 3),
        defaultValue: 0.000,
        comment: 'Current silver balance in grams'
    },
    balanceLabor: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
        comment: 'Current labor balance in rupees'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'product_customers',
    timestamps: true
});

module.exports = ProductCustomer;
