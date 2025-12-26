const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GSTCustomer = sequelize.define('GSTCustomer', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    panNumber: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    gstNumber: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: true,
        validate: {
            isEmail: true
        }
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: true
    }
}, {
    tableName: 'gst_customers',
    timestamps: true
});

module.exports = GSTCustomer;
