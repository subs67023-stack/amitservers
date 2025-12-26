const { Employee, BakiTransaction } = require('../models');
const { sequelize } = require('../config/database');

// Get all baki transactions for an employee
exports.getEmployeeBakiTransactions = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const transactions = await BakiTransaction.findAll({
      where: { employeeId },
      order: [['date', 'DESC']]
    });

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Get baki transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching baki transactions',
      error: error.message
    });
  }
};

// Add baki transaction (employee takes or returns money)
exports.addBakiTransaction = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { employeeId, date, type, amount, description } = req.body;

    // Create transaction record
    const transaction = await BakiTransaction.create({
      employeeId,
      date,
      type,
      amount,
      description
    }, { transaction: t });

    // Update employee baki amount
    const employee = await Employee.findByPk(employeeId, { transaction: t });

    if (!employee) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    if (type === 'given') {
      // Employee took baki - INCREASE baki amount
      await employee.update({
        bakiAmount: parseFloat(employee.bakiAmount) + parseFloat(amount)
      }, { transaction: t });
    } else if (type === 'returned') {
      // Employee returned baki - DECREASE baki amount
      await employee.update({
        bakiAmount: parseFloat(employee.bakiAmount) - parseFloat(amount)
      }, { transaction: t });
    }

    await t.commit();

    res.json({
      success: true,
      data: transaction,
      message: `Baki ${type === 'given' ? 'added' : 'returned'} successfully`
    });
  } catch (error) {
    await t.rollback();
    console.error('Add baki transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding baki transaction',
      error: error.message
    });
  }
};

// Delete baki transaction
exports.deleteBakiTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await BakiTransaction.findByPk(id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    await transaction.destroy();

    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Delete baki transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting transaction',
      error: error.message
    });
  }
};
