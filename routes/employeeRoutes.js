const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Get all employees
router.get('/', authenticate, requireAdmin, employeeController.getAllEmployees);

// Get employee by ID
router.get('/:id', authenticate, requireAdmin, employeeController.getEmployeeById);

// Create employee
router.post('/', authenticate, requireAdmin, employeeController.createEmployee);

// Update employee
router.put('/:id', authenticate, requireAdmin, employeeController.updateEmployee);

// Delete employee
router.delete('/:id', authenticate, requireAdmin, employeeController.deleteEmployee);

// Get employee ledger (all salary transactions)
router.get('/:id/ledger', authenticate, requireAdmin, employeeController.getEmployeeLedger);

module.exports = router;
