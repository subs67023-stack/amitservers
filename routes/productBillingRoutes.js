const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const productBillingController = require('../controllers/productBillingController');

// Helper to wrap async routes
const asyncHandler = fn => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// Customer Routes
router.post('/customers', authenticate, asyncHandler(productBillingController.getOrCreateCustomer));
router.get('/customers', authenticate, asyncHandler(productBillingController.getAllCustomers));
router.get('/customers/:customerId/ledger', authenticate, asyncHandler(productBillingController.getCustomerLedger));

// Sale Routes
router.post('/sales', authenticate, asyncHandler(productBillingController.createSale));
router.get('/sales', authenticate, asyncHandler(productBillingController.getAllSales));
router.get('/sales/:id', authenticate, asyncHandler(productBillingController.getSaleById)); // Fixed param name to :id

// Payment Routes
router.post('/sales/:saleId/payment', authenticate, asyncHandler(productBillingController.addPayment));

module.exports = router;
