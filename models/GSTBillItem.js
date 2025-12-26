const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const GSTBillItem = sequelize.define('GSTBillItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    billId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'gst_bills',
            key: 'id'
        }
    },
    srNo: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    description: {
        type: DataTypes.STRING,
        allowNull: false
    },
    hsn: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    quantity: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false
    },
    ratePerGm: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false
    }
}, {
    tableName: 'gst_bill_items',
    timestamps: true
});

module.exports = GSTBillItem;
