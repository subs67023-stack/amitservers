const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Salary = sequelize.define('Salary', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  employeeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'employees',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  fromDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Start date of salary period'
  },
  toDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'End date of salary period'
  },
  daysWorked: {
    type: DataTypes.DECIMAL(5, 2),      // ← CHANGED: Now supports decimals (25.50)
    allowNull: false,
    comment: 'Number of days worked (supports half days: 0.5, 1.5, etc.)'
  },
  pagar: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Daily wage rate'
  },
  totalPagar: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Total = daysWorked × pagar'
  },
  advance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Advance money given to employee'
  },
  finalPagar: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Final amount = totalPagar - advance'
  },
  bakiReturn: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Money returned by employee (reduces their baki)'
  },
  givenPagar: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Final amount paid to employee'
  },
  description: {                        // ← NEW FIELD
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Optional notes about this salary record'
  }
}, {
  tableName: 'salaries',
  timestamps: true
});

module.exports = Salary;
