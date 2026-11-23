const express = require('express');
const router = express.Router();
const pitalKaamController = require('../controllers/pitalKaamController');

// Autocomplete party names
router.get('/names', pitalKaamController.getNames);

// Kharedi
router.get('/kharedi', pitalKaamController.getKharedi);
router.post('/kharedi', pitalKaamController.createKharedi);

// Veekhari
router.get('/veekhari', pitalKaamController.getVeekhari);
router.post('/veekhari', pitalKaamController.createVeekhari);

// Analysis
router.get('/analysis', pitalKaamController.getAnalysis);

// Customers & Customer Ledger
router.get('/customers', pitalKaamController.getCustomers);
router.get('/customers/:name/ledger', pitalKaamController.getCustomerLedger);

// Update & Delete
router.put('/:id', pitalKaamController.updateEntry);
router.delete('/:id', pitalKaamController.deleteEntry);

module.exports = router;

