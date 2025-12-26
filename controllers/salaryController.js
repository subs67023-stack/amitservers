const { Employee, Salary } = require('../models');
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
      description
    } = req.body;

    console.log('Received description:', description); // Debug log

    // Create salary record - FIXED: Added description field
    const salary = await Salary.create({
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
      description: description || null  // ← THIS WAS MISSING
    }, { transaction: t });

    // Update employee baki amount if bakiReturn > 0
    if (bakiReturn > 0) {
      const employee = await Employee.findByPk(employeeId, { transaction: t });
      
      if (employee) {
        await employee.update({
          bakiAmount: parseFloat(employee.bakiAmount) - parseFloat(bakiReturn)
        }, { transaction: t });
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
  try {
    const { id } = req.params;

    const salary = await Salary.findByPk(id);

    if (!salary) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found'
      });
    }

    await salary.destroy();

    res.json({
      success: true,
      message: 'Salary record deleted successfully'
    });
  } catch (error) {
    console.error('Delete salary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting salary record',
      error: error.message
    });
  }
};
