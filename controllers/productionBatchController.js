const { ProductionBatch, ProductionBatchItem, sequelize } = require('../models');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');

// Helper to calculate totals from batch data and items
const calculateBatchMetrics = (body) => {
  const rawMaterialWeight = parseFloat(body.rawMaterialWeight) || 0;
  const rawMaterialUnit = body.rawMaterialUnit === 'gm' ? 'gm' : 'kg';
  const rawMaterialCost = parseFloat(body.rawMaterialCost) || 0;
  const otherExpenses = parseFloat(body.otherExpenses) || 0;
  const wastageWeight = parseFloat(body.wastageWeight) || 0;

  // Convert raw material to grams for weight comparison
  const rawMaterialGrams = rawMaterialUnit === 'kg' ? rawMaterialWeight * 1000 : rawMaterialWeight;

  // Calculate rate if not provided
  let rawMaterialRate = parseFloat(body.rawMaterialRate);
  if (!rawMaterialRate && rawMaterialWeight > 0) {
    rawMaterialRate = rawMaterialCost / rawMaterialWeight;
  }

  const items = Array.isArray(body.items) ? body.items : [];
  let totalPieces = 0;
  let totalFinishedWeight = 0;
  let totalRevenue = 0;

  const processedItems = items.map((item) => {
    const pieces = parseInt(item.pieces, 10) || 0;
    const weightPerPiece = parseFloat(item.weightPerPiece) || 0;
    const totalWeight = parseFloat(item.totalWeight) || (pieces * weightPerPiece);
    const salePricePerPiece = parseFloat(item.salePricePerPiece) || 0;
    const totalSaleAmount = parseFloat(item.totalSaleAmount) || (pieces * salePricePerPiece);
    
    // Default piecesSold to pieces if not explicitly set
    const piecesSold = item.piecesSold !== undefined && item.piecesSold !== '' 
      ? parseInt(item.piecesSold, 10) 
      : pieces;
    const revenueEarned = parseFloat(item.revenueEarned) !== undefined && item.revenueEarned !== ''
      ? parseFloat(item.revenueEarned)
      : (piecesSold * salePricePerPiece);

    totalPieces += pieces;
    totalFinishedWeight += totalWeight;
    totalRevenue += revenueEarned;

    return {
      itemName: item.itemName || 'Jewelry Item',
      pieces,
      weightPerPiece,
      totalWeight,
      salePricePerPiece,
      totalSaleAmount,
      piecesSold,
      revenueEarned,
      notes: item.notes || null
    };
  });

  const remainingWeight = rawMaterialGrams - totalFinishedWeight - wastageWeight;
  // Core user formula: Total earned after selling pieces reduced by raw material cost (Y)
  const netRemainingProfit = totalRevenue - rawMaterialCost - otherExpenses;
  const profitMargin = rawMaterialCost > 0 ? (netRemainingProfit / rawMaterialCost) * 100 : 0;

  return {
    rawMaterialWeight,
    rawMaterialUnit,
    rawMaterialCost,
    rawMaterialRate: rawMaterialRate || 0,
    otherExpenses,
    wastageWeight,
    totalPieces,
    totalFinishedWeight,
    remainingWeight,
    totalRevenue,
    netRemainingProfit,
    profitMargin,
    processedItems
  };
};

// Generate batch number if empty
const generateBatchNumber = async () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await ProductionBatch.count();
  return `PB-${dateStr}-${String(count + 1).padStart(3, '0')}`;
};

// 1. Get All Batches with filtering & pagination
exports.getAllBatches = async (req, res) => {
  try {
    const { search, status, startDate, endDate, page = 1, limit = 50 } = req.query;
    const where = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    if (startDate && endDate) {
      where.date = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      where.date = { [Op.gte]: startDate };
    } else if (endDate) {
      where.date = { [Op.lte]: endDate };
    }

    if (search) {
      where[Op.or] = [
        { batchNumber: { [Op.like]: `%${search}%` } },
        { batchName: { [Op.like]: `%${search}%` } },
        { supplierName: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const { count, rows: batches } = await ProductionBatch.findAndCountAll({
      where,
      include: [
        {
          model: ProductionBatchItem,
          as: 'items'
        }
      ],
      order: [['date', 'DESC'], ['id', 'DESC']],
      limit: parseInt(limit, 10),
      offset
    });

    res.json({
      success: true,
      data: batches,
      pagination: {
        total: count,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(count / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('Error fetching production batches:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch production batches',
      error: error.message
    });
  }
};

// 2. Get Single Batch By ID
exports.getBatchById = async (req, res) => {
  try {
    const { id } = req.params;
    const batch = await ProductionBatch.findByPk(id, {
      include: [
        {
          model: ProductionBatchItem,
          as: 'items'
        }
      ]
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Production batch not found'
      });
    }

    res.json({
      success: true,
      data: batch
    });
  } catch (error) {
    console.error('Error fetching production batch:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch production batch',
      error: error.message
    });
  }
};

// 3. Create New Production Batch
exports.createBatch = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const metrics = calculateBatchMetrics(req.body);

    const batchNumber = req.body.batchNumber && req.body.batchNumber.trim() !== ''
      ? req.body.batchNumber.trim()
      : await generateBatchNumber();

    const batch = await ProductionBatch.create({
      batchNumber,
      batchName: req.body.batchName || `Batch ${batchNumber}`,
      date: req.body.date || new Date().toISOString().split('T')[0],
      rawMaterialWeight: metrics.rawMaterialWeight,
      rawMaterialUnit: metrics.rawMaterialUnit,
      rawMaterialCost: metrics.rawMaterialCost,
      rawMaterialRate: metrics.rawMaterialRate,
      touch: parseFloat(req.body.touch) || 100,
      supplierName: req.body.supplierName || null,
      otherExpenses: metrics.otherExpenses,
      wastageWeight: metrics.wastageWeight,
      totalPieces: metrics.totalPieces,
      totalFinishedWeight: metrics.totalFinishedWeight,
      remainingWeight: metrics.remainingWeight,
      totalRevenue: metrics.totalRevenue,
      netRemainingProfit: metrics.netRemainingProfit,
      profitMargin: metrics.profitMargin,
      status: req.body.status || 'in_production',
      notes: req.body.notes || null
    }, { transaction });

    if (metrics.processedItems.length > 0) {
      const itemsToCreate = metrics.processedItems.map(item => ({
        ...item,
        batchId: batch.id
      }));
      await ProductionBatchItem.bulkCreate(itemsToCreate, { transaction });
    }

    await transaction.commit();

    const createdBatch = await ProductionBatch.findByPk(batch.id, {
      include: [{ model: ProductionBatchItem, as: 'items' }]
    });

    res.status(201).json({
      success: true,
      message: 'Production batch created successfully',
      data: createdBatch
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating production batch:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create production batch',
      error: error.message
    });
  }
};

// 4. Update Existing Production Batch
exports.updateBatch = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const batch = await ProductionBatch.findByPk(id);

    if (!batch) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Production batch not found'
      });
    }

    const metrics = calculateBatchMetrics(req.body);

    await batch.update({
      batchNumber: req.body.batchNumber || batch.batchNumber,
      batchName: req.body.batchName !== undefined ? req.body.batchName : batch.batchName,
      date: req.body.date || batch.date,
      rawMaterialWeight: metrics.rawMaterialWeight,
      rawMaterialUnit: metrics.rawMaterialUnit,
      rawMaterialCost: metrics.rawMaterialCost,
      rawMaterialRate: metrics.rawMaterialRate,
      touch: req.body.touch !== undefined ? parseFloat(req.body.touch) : batch.touch,
      supplierName: req.body.supplierName !== undefined ? req.body.supplierName : batch.supplierName,
      otherExpenses: metrics.otherExpenses,
      wastageWeight: metrics.wastageWeight,
      totalPieces: metrics.totalPieces,
      totalFinishedWeight: metrics.totalFinishedWeight,
      remainingWeight: metrics.remainingWeight,
      totalRevenue: metrics.totalRevenue,
      netRemainingProfit: metrics.netRemainingProfit,
      profitMargin: metrics.profitMargin,
      status: req.body.status || batch.status,
      notes: req.body.notes !== undefined ? req.body.notes : batch.notes
    }, { transaction });

    // Replace items
    await ProductionBatchItem.destroy({ where: { batchId: batch.id }, transaction });

    if (metrics.processedItems.length > 0) {
      const itemsToCreate = metrics.processedItems.map(item => ({
        ...item,
        batchId: batch.id
      }));
      await ProductionBatchItem.bulkCreate(itemsToCreate, { transaction });
    }

    await transaction.commit();

    const updatedBatch = await ProductionBatch.findByPk(batch.id, {
      include: [{ model: ProductionBatchItem, as: 'items' }]
    });

    res.json({
      success: true,
      message: 'Production batch updated successfully',
      data: updatedBatch
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating production batch:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update production batch',
      error: error.message
    });
  }
};

// 5. Delete Production Batch
exports.deleteBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const batch = await ProductionBatch.findByPk(id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Production batch not found'
      });
    }

    await batch.destroy();

    res.json({
      success: true,
      message: 'Production batch deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting production batch:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete production batch',
      error: error.message
    });
  }
};

// 6. Aggregate Stats Summary
exports.getStats = async (req, res) => {
  try {
    const batches = await ProductionBatch.findAll();

    let totalBatches = batches.length;
    let totalRawMaterialKg = 0;
    let totalInvestedCost = 0;
    let totalRevenueEarned = 0;
    let totalNetRemainingProfit = 0;
    let totalPiecesProduced = 0;
    let inProductionCount = 0;
    let completedCount = 0;

    batches.forEach(b => {
      const weight = parseFloat(b.rawMaterialWeight) || 0;
      const weightInKg = b.rawMaterialUnit === 'gm' ? weight / 1000 : weight;
      totalRawMaterialKg += weightInKg;

      totalInvestedCost += parseFloat(b.rawMaterialCost) || 0;
      totalRevenueEarned += parseFloat(b.totalRevenue) || 0;
      totalNetRemainingProfit += parseFloat(b.netRemainingProfit) || 0;
      totalPiecesProduced += parseInt(b.totalPieces, 10) || 0;

      if (b.status === 'in_production') inProductionCount++;
      if (b.status === 'completed') completedCount++;
    });

    res.json({
      success: true,
      data: {
        totalBatches,
        totalRawMaterialKg: Number(totalRawMaterialKg.toFixed(3)),
        totalInvestedCost: Number(totalInvestedCost.toFixed(2)),
        totalRevenueEarned: Number(totalRevenueEarned.toFixed(2)),
        totalNetRemainingProfit: Number(totalNetRemainingProfit.toFixed(2)),
        totalPiecesProduced,
        inProductionCount,
        completedCount
      }
    });
  } catch (error) {
    console.error('Error fetching production stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch production stats',
      error: error.message
    });
  }
};

// 7. Export Batches to Excel
exports.exportExcel = async (req, res) => {
  try {
    const batches = await ProductionBatch.findAll({
      include: [{ model: ProductionBatchItem, as: 'items' }],
      order: [['date', 'DESC'], ['id', 'DESC']]
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Production Batches');

    worksheet.columns = [
      { header: 'Batch #', key: 'batchNumber', width: 16 },
      { header: 'Batch Name', key: 'batchName', width: 22 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Supplier', key: 'supplierName', width: 18 },
      { header: 'Raw Material Wt', key: 'rawMaterialWeight', width: 16 },
      { header: 'Unit', key: 'rawMaterialUnit', width: 8 },
      { header: 'Raw Cost (₹ Y)', key: 'rawMaterialCost', width: 16 },
      { header: 'Rate (₹/Unit)', key: 'rawMaterialRate', width: 14 },
      { header: 'Touch %', key: 'touch', width: 10 },
      { header: 'Total Pieces', key: 'totalPieces', width: 12 },
      { header: 'Finished Wt (g)', key: 'totalFinishedWeight', width: 16 },
      { header: 'Wastage (g)', key: 'wastageWeight', width: 14 },
      { header: 'Scrap Wt (g)', key: 'remainingWeight', width: 14 },
      { header: 'Total Earned (₹)', key: 'totalRevenue', width: 16 },
      { header: 'Net Remaining Profit (₹)', key: 'netRemainingProfit', width: 22 },
      { header: 'Profit %', key: 'profitMargin', width: 12 },
      { header: 'Status', key: 'status', width: 14 }
    ];

    batches.forEach(b => {
      worksheet.addRow({
        batchNumber: b.batchNumber,
        batchName: b.batchName || '-',
        date: b.date,
        supplierName: b.supplierName || '-',
        rawMaterialWeight: parseFloat(b.rawMaterialWeight).toFixed(3),
        rawMaterialUnit: b.rawMaterialUnit,
        rawMaterialCost: parseFloat(b.rawMaterialCost).toFixed(2),
        rawMaterialRate: parseFloat(b.rawMaterialRate || 0).toFixed(2),
        touch: parseFloat(b.touch || 100).toFixed(2),
        totalPieces: b.totalPieces,
        totalFinishedWeight: parseFloat(b.totalFinishedWeight).toFixed(3),
        wastageWeight: parseFloat(b.wastageWeight).toFixed(3),
        remainingWeight: parseFloat(b.remainingWeight).toFixed(3),
        totalRevenue: parseFloat(b.totalRevenue).toFixed(2),
        netRemainingProfit: parseFloat(b.netRemainingProfit).toFixed(2),
        profitMargin: `${parseFloat(b.profitMargin).toFixed(2)}%`,
        status: b.status
      });
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' }
    };

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=production_batches_${new Date().toISOString().split('T')[0]}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting production batches:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export production batches',
      error: error.message
    });
  }
};

