const express = require('express');
const router = express.Router();
const gstBillingController = require('../controllers/gstBillingController');

// Helper to wrap async functions if using express 4 (optional, but good practice if no global error handler handles async)
// Assuming global handler exists in server.js but standard express need try-catch or wrapper.
// Controller has try-catch so it is fine.

// Customer Routes
router.post('/customers', gstBillingController.createCustomer);
router.get('/customers', gstBillingController.getCustomers);
router.get('/customers/:id/ledger', gstBillingController.getCustomerLedger);

// Bill Routes
router.post('/bills', gstBillingController.createBill);
router.get('/bills', gstBillingController.getBills);
router.get('/bills/:id', gstBillingController.getBillById);
router.put('/bills/:id', gstBillingController.updateBill);

module.exports = router;
