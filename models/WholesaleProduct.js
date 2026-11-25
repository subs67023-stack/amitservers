const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WholesaleProduct = sequelize.define('WholesaleProduct', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    // Link to the Producer (Supplier/Karigar)
    producerId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'producers',
            key: 'id'
        }
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
        // Removed unique: true to allow multiple batches
    },
    pieces: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    grossWeight: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false,
        defaultValue: 0
    },
    stoneWeight: { // Total stone weight (deduction taken once)
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false,
        defaultValue: 0
    },
    perPieceWeight: { // Deduction weight per piece (stoneWeight / pieces)
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false,
        defaultValue: 0
    },
    netWeight: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false,
        defaultValue: 0
    },
    touch: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0
    },
    stamp: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: '-'
    }
}, {
    tableName: 'wholesale_products',
    timestamps: true
});

module.exports = WholesaleProduct;
