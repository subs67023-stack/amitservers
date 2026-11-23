const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProductionBatchItem = sequelize.define('ProductionBatchItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  batchId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'production_batches',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  itemName: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: 'Name or description of jewelry piece e.g. Payal, Chain, Ring, etc.'
  },
  pieces: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Quantity of pieces produced'
  },
  weightPerPiece: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    defaultValue: 0,
    comment: 'Weight in grams per piece'
  },
  totalWeight: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    defaultValue: 0,
    comment: 'Total weight of this item in grams (pieces * weightPerPiece)'
  },
  salePricePerPiece: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Selling price per piece in ₹'
  },
  totalSaleAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Total expected sales value (pieces * salePricePerPiece)'
  },
  piecesSold: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of pieces sold so far'
  },
  revenueEarned: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Actual amount earned (piecesSold * salePricePerPiece)'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'production_batch_items',
  timestamps: true
});

module.exports = ProductionBatchItem;

