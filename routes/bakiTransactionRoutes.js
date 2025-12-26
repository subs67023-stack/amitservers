const express = require('express');
const router = express.Router();
const bakiTransactionController = require('../controllers/bakiTransactionController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Get all baki transactions for an employee
router.get('/employee/:employeeId', authenticate, requireAdmin, bakiTransactionController.getEmployeeBakiTransactions);

// Add baki transaction
router.post('/', authenticate, requireAdmin, bakiTransactionController.addBakiTransaction);

// Delete baki transaction
router.delete('/:id', authenticate, requireAdmin, bakiTransactionController.deleteBakiTransaction);

module.exports = router;
