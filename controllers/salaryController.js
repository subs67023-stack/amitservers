const { Employee, Salary, BakiTransaction } = require('../models');
const { sequelize } = require('../config/database');

// Get all salaries with employee names
exports.getAllSalaries = async (req, res) => {
  try {
    const salaries = await Salary.findAll({
      include: [{
        model: Employee,
        as: 'Employee',
        attributes: ['name']
      }],
      order: [['fromDate', 'DESC']]
    });

    // Format data to include employeeName
    const formattedSalaries = salaries.map(salary => {
      const salaryData = salary.toJSON();
      return {
        ...salaryData,
        employeeName: salaryData.Employee ? salaryData.Employee.name : 'Unknown'
      };
    });

    res.json({
      success: true,
      data: formattedSalaries
    });
  } catch (error) {
    console.error('Get salaries error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching salaries',
      error: error.message
    });
  }
};

// Get salary by ID
exports.getSalaryById = async (req, res) => {
  try {
    const { id } = req.params;

    const salary = await Salary.findByPk(id, {
      include: [{
        model: Employee,
        as: 'Employee',
        attributes: ['name']
      }]
    });

    if (!salary) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found'
      });
    }

    res.json({
      success: true,
      data: salary
    });
  } catch (error) {
    console.error('Get salary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching salary',
      error: error.message
    });
  }
};

// Create salary record (with transaction to update employee baki)
exports.createSalary = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const {
      employeeId,
      fromDate,
      toDate,
      daysWorked,
      pagar,
      totalPagar,
      advance,
      finalPagar,
      bakiReturn,
      givenPagar,
      description,
      addToBaki
    } = req.body;

    const shouldAddToBaki = Boolean(addToBaki);
    const advanceNum = parseFloat(advance) || 0;
    const bakiReturnNum = parseFloat(bakiReturn) || 0;

    // Create salary record
    const salary = await Salary.create({
      employeeId,
      fromDate,
      toDate,
      daysWorked,
      pagar,
      totalPagar,
      advance: advanceNum,
      finalPagar,
      bakiReturn: bakiReturnNum,
      givenPagar,
      description: description || null,
      addToBaki: shouldAddToBaki
    }, { transaction: t });

    // Handle Baki adjustments for employee
    const employee = await Employee.findByPk(employeeId, { transaction: t });
    if (employee) {
      let bakiDelta = 0;

      // If advance is added to baki, increase employee baki and log transaction
      if (shouldAddToBaki && advanceNum > 0) {
        bakiDelta += advanceNum;
        if (BakiTransaction) {
          await BakiTransaction.create({
            employeeId,
            date: toDate || new Date().toISOString().split('T')[0],
            type: 'given',
            amount: advanceNum,
            description: `Salary Advance (${fromDate} to ${toDate}) added to Baki`
          }, { transaction: t });
        }
      }

      // If bakiReturn > 0, decrease employee baki and log transaction
      if (bakiReturnNum > 0) {
        bakiDelta -= bakiReturnNum;
        if (BakiTransaction) {
          await BakiTransaction.create({
            employeeId,
            date: toDate || new Date().toISOString().split('T')[0],
            type: 'returned',
            amount: bakiReturnNum,
            description: `Baki return deducted from salary (${fromDate} to ${toDate})`
          }, { transaction: t });
        }
      }

      if (bakiDelta !== 0) {
        const currentBaki = parseFloat(employee.bakiAmount) || 0;
        const newBaki = Math.max(0, currentBaki + bakiDelta);
        await employee.update({ bakiAmount: newBaki }, { transaction: t });
      }
    }

    await t.commit();

    res.json({
      success: true,
      data: salary,
      message: 'Salary record created successfully'
    });
  } catch (error) {
    await t.rollback();
    console.error('Create salary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating salary record',
      error: error.message
    });
  }
};

// Delete salary
exports.deleteSalary = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const salary = await Salary.findByPk(id, { transaction: t });

    if (!salary) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Salary record not found'
      });
    }

    // Revert baki changes if any
    const employee = await Employee.findByPk(salary.employeeId, { transaction: t });
    if (employee) {
      let revertDelta = 0;
      const adv = parseFloat(salary.advance) || 0;
      const ret = parseFloat(salary.bakiReturn) || 0;

      if (salary.addToBaki && adv > 0) {
        revertDelta -= adv; // remove advance from baki
      }
      if (ret > 0) {
        revertDelta += ret; // add back returned baki
      }

      if (revertDelta !== 0) {
        const currentBaki = parseFloat(employee.bakiAmount) || 0;
        const newBaki = Math.max(0, currentBaki + revertDelta);
        await employee.update({ bakiAmount: newBaki }, { transaction: t });
      }
    }

    await salary.destroy({ transaction: t });
    await t.commit();

    res.json({
      success: true,
      message: 'Salary record deleted successfully'
    });
  } catch (error) {
    await t.rollback();
    console.error('Delete salary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting salary record',
      error: error.message
    });
  }
};
