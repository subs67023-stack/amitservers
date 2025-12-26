const { RegularBullen } = require('../models');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');

// Get all unique bullen names
exports.getBullenNames = async (req, res) => {
  try {
    const bullenNames = await RegularBullen.findAll({
      attributes: ['bullenName'],
      group: ['bullenName'],
      order: [['bullenName', 'ASC']]
    });

    const names = bullenNames.map(b => b.bullenName);

    res.json({
      success: true,
      data: names
    });
  } catch (error) {
    console.error('Get bullen names error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bullen names',
      error: error.message
    });
  }
};

// Get ledger for specific bullen (all transactions)
exports.getBullenLedger = async (req, res) => {
  try {
    const { bullenName } = req.params;

    const entries = await RegularBullen.findAll({
      where: { bullenName },
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: entries
    });
  } catch (error) {
    console.error('Get bullen ledger error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bullen ledger',
      error: error.message
    });
  }
};

// Create bullen entry
exports.createBullen = async (req, res) => {
  try {
    const { 
      date, 
      transactionType, 
      saleType, 
      formNo, 
      bullenName, 
      weight, 
      touch, 
      bhav, 
      badal, 
      rawSilver, 
      gutReturn,
      description 
    } = req.body;

    let fine = null;
    let totalAmount = null;
    let totalSilver = null;

    if (transactionType === 'badal') {
      // Type 3: Badal
      if (saleType === 'gut') {
        // Gut Badal: Total Silver = Raw Silver * Touch / 100
        if (rawSilver && touch) {
          totalSilver = (parseFloat(rawSilver) * parseFloat(touch)) / 100;
        }
      } else if (saleType === 'kach') {
        // Kachi Badal: Fine = Weight * Touch / 100
        if (weight && touch) {
          fine = (parseFloat(weight) * parseFloat(touch)) / 100;
        }
      }
    } else {
      // Type 1 & 2
      if (saleType === 'gut') {
        // Gut Sale/Purchase: Total = Weight × Bhav
        totalAmount = parseFloat(weight) * parseFloat(bhav);
      } else if (saleType === 'kach') {
        // Kach Sale/Purchase: Fine = (Weight × Touch) / 100
        fine = (parseFloat(weight) * parseFloat(touch)) / 100;
        // Total = Fine × Bhav
        totalAmount = fine * parseFloat(bhav);
      }
    }

    const bullen = await RegularBullen.create({
      date,
      transactionType: transactionType || 'sale',
      saleType,
      formNo: saleType === 'kach' ? formNo : null,
      bullenName,
      weight,
      touch: (saleType === 'kach' || transactionType === 'badal') ? touch : null,
      fine: fine ? fine.toFixed(3) : null,
      bhav: transactionType === 'badal' ? null : bhav,
      totalAmount: totalAmount ? totalAmount.toFixed(2) : null,
      badal: transactionType === 'badal' ? badal : null,
      rawSilver: (transactionType === 'badal' && saleType === 'gut') ? rawSilver : null,
      totalSilver: totalSilver ? totalSilver.toFixed(3) : null,
      gutReturn: (transactionType === 'badal' && saleType === 'kach') ? gutReturn : null,
      description
    });

    res.json({
      success: true,
      data: bullen,
      message: 'Bullen entry created successfully'
    });
  } catch (error) {
    console.error('Create bullen error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating bullen entry',
      error: error.message
    });
  }
};

// Get all bullen entries
exports.getAllBullen = async (req, res) => {
  try {
    const { transactionType, saleType, search } = req.query;

    let whereClause = {};

    if (transactionType) {
      whereClause.transactionType = transactionType;
    }

    if (saleType) {
      whereClause.saleType = saleType;
    }

    if (search) {
      whereClause[Op.or] = [
        { bullenName: { [Op.like]: `%${search}%` } },
        { formNo: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const entries = await RegularBullen.findAll({
      where: whereClause,
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: entries
    });
  } catch (error) {
    console.error('Get bullen error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bullen entries',
      error: error.message
    });
  }
};

// Delete bullen entry
exports.deleteBullen = async (req, res) => {
  try {
    const { id } = req.params;

    await RegularBullen.destroy({ where: { id } });

    res.json({
      success: true,
      message: 'Bullen entry deleted successfully'
    });
  } catch (error) {
    console.error('Delete bullen error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting bullen entry',
      error: error.message
    });
  }
};

// Export to Excel
exports.exportToExcel = async (req, res) => {
  try {
    const { transactionType, saleType } = req.query;

    let whereClause = {};
    if (transactionType) {
      whereClause.transactionType = transactionType;
    }
    if (saleType) {
      whereClause.saleType = saleType;
    }

    const entries = await RegularBullen.findAll({
      where: whereClause,
      order: [['date', 'DESC']]
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Regular Bullen');

    // Headers - Dynamic based on type
    if (transactionType === 'badal') {
      if (saleType === 'gut') {
        // Gut Badal columns
        worksheet.columns = [
          { header: 'Date', key: 'date', width: 12 },
          { header: 'Bullen Name', key: 'bullenName', width: 20 },
          { header: 'Weight (g)', key: 'weight', width: 12 },
          { header: 'Badal (g)', key: 'badal', width: 12 },
          { header: 'Raw Silver (g)', key: 'rawSilver', width: 15 },
          { header: 'Touch', key: 'touch', width: 10 },
          { header: 'Total Silver (g)', key: 'totalSilver', width: 15 },
          { header: 'Description', key: 'description', width: 30 }
        ];
      } else {
        // Kachi Badal columns
        worksheet.columns = [
          { header: 'Date', key: 'date', width: 12 },
          { header: 'Form No', key: 'formNo', width: 15 },
          { header: 'Bullen Name', key: 'bullenName', width: 20 },
          { header: 'Weight (g)', key: 'weight', width: 12 },
          { header: 'Touch', key: 'touch', width: 10 },
          { header: 'Fine (g)', key: 'fine', width: 12 },
          { header: 'Badal (g)', key: 'badal', width: 12 },
          { header: 'Gut Return (g)', key: 'gutReturn', width: 15 },
          { header: 'Description', key: 'description', width: 30 }
        ];
      }
    } else {
      worksheet.columns = [
        { header: 'Date', key: 'date', width: 12 },
        { header: 'Transaction Type', key: 'transactionType', width: 15 },
        { header: 'Type', key: 'saleType', width: 10 },
        { header: 'Form No', key: 'formNo', width: 15 },
        { header: 'Bullen Name', key: 'bullenName', width: 20 },
        { header: 'Weight (g)', key: 'weight', width: 12 },
        { header: 'Touch', key: 'touch', width: 10 },
        { header: 'Fine (g)', key: 'fine', width: 12 },
        { header: 'Bhav', key: 'bhav', width: 12 },
        { header: 'Total Amount', key: 'totalAmount', width: 15 },
        { header: 'Description', key: 'description', width: 30 }
      ];
    }

    // Add data
    entries.forEach(entry => {
      if (entry.transactionType === 'badal') {
        if (entry.saleType === 'gut') {
          worksheet.addRow({
            date: entry.date,
            bullenName: entry.bullenName,
            weight: entry.weight ? parseFloat(entry.weight).toFixed(3) : '-',
            badal: entry.badal ? parseFloat(entry.badal).toFixed(3) : '-',
            rawSilver: entry.rawSilver ? parseFloat(entry.rawSilver).toFixed(3) : '-',
            touch: entry.touch ? parseFloat(entry.touch).toFixed(2) : '-',
            totalSilver: entry.totalSilver ? parseFloat(entry.totalSilver).toFixed(3) : '-',
            description: entry.description || '-'
          });
        } else {
          worksheet.addRow({
            date: entry.date,
            formNo: entry.formNo || '-',
            bullenName: entry.bullenName,
            weight: entry.weight ? parseFloat(entry.weight).toFixed(3) : '-',
            touch: entry.touch ? parseFloat(entry.touch).toFixed(2) : '-',
            fine: entry.fine ? parseFloat(entry.fine).toFixed(3) : '-',
            badal: entry.badal ? parseFloat(entry.badal).toFixed(3) : '-',
            gutReturn: entry.gutReturn ? parseFloat(entry.gutReturn).toFixed(3) : '-',
            description: entry.description || '-'
          });
        }
      } else {
        worksheet.addRow({
          date: entry.date,
          transactionType: entry.transactionType === 'sale' ? 'Sale' : 'Purchase',
          saleType: entry.saleType === 'gut' ? 'Gut' : 'Kach',
          formNo: entry.formNo || '-',
          bullenName: entry.bullenName,
          weight: parseFloat(entry.weight).toFixed(3),
          touch: entry.touch ? parseFloat(entry.touch).toFixed(2) : '-',
          fine: entry.fine ? parseFloat(entry.fine).toFixed(3) : '-',
          bhav: parseFloat(entry.bhav).toFixed(2),
          totalAmount: parseFloat(entry.totalAmount).toFixed(2),
          description: entry.description || '-'
        });
      }
    });

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=regular_bullen_${new Date().toISOString().split('T')[0]}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export bullen error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting bullen entries',
      error: error.message
    });
  }
};
