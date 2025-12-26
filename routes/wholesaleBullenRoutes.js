const express = require('express');
const router = express.Router();
const wholesaleBullenController = require('../controllers/wholesaleBullenController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Get all unique bullen names
router.get('/names', authenticate, requireAdmin, wholesaleBullenController.getBullenNames);

// Get ledger for specific bullen
router.get('/ledger/:bullenName', authenticate, requireAdmin, wholesaleBullenController.getBullenLedger);

// Existing routes
router.post('/', authenticate, requireAdmin, wholesaleBullenController.createBullen);
router.get('/', authenticate, requireAdmin, wholesaleBullenController.getAllBullen);
router.delete('/:id', authenticate, requireAdmin, wholesaleBullenController.deleteBullen);
router.get('/export', authenticate, requireAdmin, wholesaleBullenController.exportToExcel);

module.exports = router;
