const express = require('express');
const router = express.Router();
const regularBillingController = require('../controllers/regularBillingController');

// Customer routes
router.get('/customers', regularBillingController.getAllCustomers);
router.post('/customers', regularBillingController.createCustomer);
router.put('/customers/:customerId', regularBillingController.updateCustomer);
router.delete('/customers/:customerId', regularBillingController.deleteCustomer);
router.get('/customers/:customerId/ledger', regularBillingController.getCustomerLedger);

// Sales routes
router.get('/sales', regularBillingController.getAllRegularSales);
router.post('/sales', regularBillingController.createRegularSale);
router.get('/sales/:saleId', regularBillingController.getRegularSaleDetails);
router.put('/sales/:saleId', regularBillingController.updateSale);
router.delete('/sales/:saleId', regularBillingController.deleteSale);

// Payment routes
router.post('/sales/:saleId/silver-payment', regularBillingController.addSilverPayment);
router.post('/sales/:saleId/cash-for-silver', regularBillingController.addCashForSilver);
router.post('/sales/:saleId/labor-payment', regularBillingController.addLaborPayment);

// Return silver route (NEW)
router.post('/sales/:saleId/return-silver', regularBillingController.returnSilver);

// Silver taken routes (uses SilverTakenRecord)
router.get('/silver-taken', regularBillingController.getSilverTakenHistory);
router.post('/silver-taken', regularBillingController.createSilverTaken);

// Daily analysis
router.get('/daily-analysis', regularBillingController.getDailyAnalysis);

// Stats route
router.get('/stats', regularBillingController.getRegularBillingStats);

// Export routes
router.get('/export/sales', regularBillingController.exportSalesToExcel);
router.get('/export/customers', regularBillingController.exportCustomersToExcel);

module.exports = router;
