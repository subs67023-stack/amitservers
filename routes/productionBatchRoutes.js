const express = require('express');
const router = express.Router();
const productionBatchController = require('../controllers/productionBatchController');

// Export Excel (place before /:id)
router.get('/export-excel', productionBatchController.exportExcel);

// Aggregated Stats Summary (place before /:id)
router.get('/stats', productionBatchController.getStats);

// Batch CRUD
router.get('/', productionBatchController.getAllBatches);
router.get('/:id', productionBatchController.getBatchById);
router.post('/', productionBatchController.createBatch);
router.put('/:id', productionBatchController.updateBatch);
router.delete('/:id', productionBatchController.deleteBatch);

module.exports = router;

