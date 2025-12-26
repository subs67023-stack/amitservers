const express = require('express');
const router = express.Router();
const salaryController = require('../controllers/salaryController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Get all salaries
router.get('/', authenticate, requireAdmin, salaryController.getAllSalaries);

// Get salary by ID
router.get('/:id', authenticate, requireAdmin, salaryController.getSalaryById);

// Create salary record
router.post('/', authenticate, requireAdmin, salaryController.createSalary);

// Delete salary
router.delete('/:id', authenticate, requireAdmin, salaryController.deleteSalary);

module.exports = router;
