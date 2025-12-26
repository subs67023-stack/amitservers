const express = require('express');
const router = express.Router();
const regularBullenController = require('../controllers/regularBullenController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Get all unique bullen names
router.get('/names', authenticate, requireAdmin, regularBullenController.getBullenNames);

// Get ledger for specific bullen
router.get('/ledger/:bullenName', authenticate, requireAdmin, regularBullenController.getBullenLedger);

// Existing routes
router.post('/', authenticate, requireAdmin, regularBullenController.createBullen);
router.get('/', authenticate, requireAdmin, regularBullenController.getAllBullen);
router.delete('/:id', authenticate, requireAdmin, regularBullenController.deleteBullen);
router.get('/export', authenticate, requireAdmin, regularBullenController.exportToExcel);

module.exports = router;
