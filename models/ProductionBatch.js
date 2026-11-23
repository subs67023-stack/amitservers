const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProductionBatch = sequelize.define('ProductionBatch', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  batchNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Unique identifier for the production batch e.g. PB-2026-001'
  },
  batchName: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Friendly name or description e.g. 5kg Payal Production'
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  rawMaterialWeight: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    comment: 'Quantity of raw material purchased (X)'
  },
  rawMaterialUnit: {
    type: DataTypes.ENUM('kg', 'gm'),
    allowNull: false,
    defaultValue: 'kg',
    comment: 'Unit of raw material weight (kg or gm)'
  },
  rawMaterialCost: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: 'Total purchase amount paid for raw material (Y)'
  },
  rawMaterialRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Rate per unit (Bhav) = Y / weight'
  },
  touch: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 100,
    comment: 'Purity/Touch percentage of raw material'
  },
  supplierName: {
    type: DataTypes.STRING(150),
    allowNull: true,
    comment: 'Supplier or Bullen dealer name'
  },
  otherExpenses: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Additional labor, making, melting, or overhead charges'
  },
  wastageWeight: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    defaultValue: 0,
    comment: 'Melting or manufacturing loss in grams'
  },
  totalPieces: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Total jewelry pieces produced in this batch'
  },
  totalFinishedWeight: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    defaultValue: 0,
    comment: 'Total weight of all finished jewelry pieces in grams'
  },
  remainingWeight: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    defaultValue: 0,
    comment: 'Remaining raw material / scrap weight in grams'
  },
  totalRevenue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Total amount earned after making and selling pieces'
  },
  netRemainingProfit: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Total Earned reduced by raw material cost Y (Total Revenue - Y - otherExpenses)'
  },
  profitMargin: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Net Profit percentage ((netRemainingProfit / Y) * 100)'
  },
  status: {
    type: DataTypes.ENUM('in_production', 'partially_sold', 'completed'),
    allowNull: false,
    defaultValue: 'in_production',
    comment: 'Production lifecycle status'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'production_batches',
  timestamps: true
});

module.exports = ProductionBatch;

