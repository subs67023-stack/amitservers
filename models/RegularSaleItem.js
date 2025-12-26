const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RegularSaleItem = sequelize.define(
  'RegularSaleItem',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    regularSaleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'regular_sales',
        key: 'id'
      }
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    stamp: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: '-'
    },
    pieces: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    grossWeight: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false
    },
    stoneWeight: {
      type: DataTypes.DECIMAL(10, 3),
      defaultValue: 0
    },
    netWeight: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false
    },
    wastage: {
      type: DataTypes.DECIMAL(10, 3),
      defaultValue: 0,
      comment: 'Wastage in grams'
    },
    touch: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Touch percentage'
    },
    silverWeight: {
      type: DataTypes.DECIMAL(10, 3),
      defaultValue: 0,
      comment: 'Calculated silver weight in grams'
    },
    laborRatePerKg: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Labor rate per kilogram'
    },
    laborCharges: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: 'Calculated labor charges'
    }
  },
  {
    tableName: 'regular_sale_items',
    timestamps: true
  }
);

RegularSaleItem.associate = models => {
  RegularSaleItem.belongsTo(models.RegularSale, {
    foreignKey: 'regularSaleId',
    as: 'sale'
  });
};

module.exports = RegularSaleItem;
