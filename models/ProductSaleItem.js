const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProductSaleItem = sequelize.define('ProductSaleItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    saleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'product_sales',
            key: 'id'
        }
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    description: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    pieces: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    grossWeight: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false
    },
    stoneWeight: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false,
        defaultValue: 0
    },
    netWeight: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false
    },
    wastage: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false,
        defaultValue: 0
    },
    touch: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    silverWeight: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false,
        defaultValue: 0
    },
    laborRatePerKg: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    laborCharges: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    itemAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    }
}, {
    tableName: 'product_sale_items',
    timestamps: true
});

module.exports = ProductSaleItem;
