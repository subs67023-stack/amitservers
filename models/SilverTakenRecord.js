const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SilverTakenRecord = sequelize.define(
  'SilverTakenRecord',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    regularCustomerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'regular_customers',
        key: 'id'
      }
    },
    fromNo: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Reference/Voucher number'
    },
    weight: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false,
      comment: 'Weight in grams'
    },
    touch: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Touch/Purity percentage'
    },
    fine: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false,
      comment: 'Fine = Weight × Touch ÷ 100'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  },
  {
    tableName: 'silver_taken_records',
    timestamps: true
  }
);

SilverTakenRecord.associate = models => {
  SilverTakenRecord.belongsTo(models.RegularCustomer, {
    foreignKey: 'regularCustomerId',
    as: 'customer'
  });
};

module.exports = SilverTakenRecord;
