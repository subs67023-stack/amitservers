const { Op } = require('sequelize');
const WholesaleJamaKharchSilver = require('../models/WholesaleJamaKharchSilver');
const WholesaleJamaKharchCash = require('../models/WholesaleJamaKharchCash');
const { generateLedgerPDF } = require('../utils/pdfGenerator');

// Silver Transactions
exports.createSilverTransaction = async (req, res) => {
  try {
    const transaction = await WholesaleJamaKharchSilver.create({
      ...req.body,
      createdBy: req.user?.id || 1
    });

    res.json({
      status: 'success',
      message: 'Silver transaction created successfully',
      data: transaction
    });
  } catch (error) {
    console.error('Error creating silver transaction:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create transaction',
      error: error.message
    });
  }
};

exports.getSilverTransactions = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;

    const where = {};
    if (type && type !== 'ALL') where.type = type;
    if (startDate && endDate) {
      where.date = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      where.date = { [Op.gte]: startDate };
    } else if (endDate) {
      where.date = { [Op.lte]: endDate };
    }

    const transactions = await WholesaleJamaKharchSilver.findAll({
      where,
      order: [['date', 'DESC'], ['id', 'DESC']]
    });

    res.json({
      status: 'success',
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching silver transactions:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch transactions'
    });
  }
};

exports.getSilverAnalysis = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};
    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    } else if (startDate) {
      where.date = { [Op.gte]: startDate };
    } else if (endDate) {
      where.date = { [Op.lte]: endDate };
    }

    const transactions = await WholesaleJamaKharchSilver.findAll({
      where,
      order: [['date', 'DESC'], ['id', 'DESC']]
    });

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    let totalJama = 0;
    let totalKharcha = 0;
    let fineJama = 0;
    let rawJama = 0;
    let fineKharcha = 0;
    let rawKharcha = 0;
    let todayJama = 0;
    let todayKharcha = 0;

    const monthlyMap = {};
    const partyMap = {};

    transactions.forEach(t => {
      const weight = parseFloat(t.silverWeight) || 0;
      const isJama = t.type === 'JAMA';
      const isFine = t.silverType === 'fine';
      const tDate = t.date ? String(t.date).split('T')[0] : '';

      if (isJama) {
        totalJama += weight;
        if (isFine) fineJama += weight;
        else rawJama += weight;
      } else {
        totalKharcha += weight;
        if (isFine) fineKharcha += weight;
        else rawKharcha += weight;
      }

      if (tDate === today) {
        if (isJama) todayJama += weight;
        else todayKharcha += weight;
      }

      // Monthly breakdown
      const monthKey = tDate ? tDate.substring(0, 7) : 'Unknown';
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          month: monthKey,
          jama: 0,
          kharcha: 0,
          fineJama: 0,
          rawJama: 0,
          fineKharcha: 0,
          rawKharcha: 0,
          count: 0
        };
      }
      if (isJama) {
        monthlyMap[monthKey].jama += weight;
        if (isFine) monthlyMap[monthKey].fineJama += weight;
        else monthlyMap[monthKey].rawJama += weight;
      } else {
        monthlyMap[monthKey].kharcha += weight;
        if (isFine) monthlyMap[monthKey].fineKharcha += weight;
        else monthlyMap[monthKey].rawKharcha += weight;
      }
      monthlyMap[monthKey].count += 1;

      // Party breakdown
      const party = (t.name || 'Unknown').trim();
      if (!partyMap[party]) {
        partyMap[party] = {
          name: party,
          jama: 0,
          kharcha: 0,
          fineSilver: 0,
          rawSilver: 0,
          count: 0
        };
      }
      if (isJama) {
        partyMap[party].jama += weight;
      } else {
        partyMap[party].kharcha += weight;
      }
      if (isFine) partyMap[party].fineSilver += weight;
      else partyMap[party].rawSilver += weight;
      partyMap[party].count += 1;
    });

    const monthlyBreakdown = Object.values(monthlyMap).map(m => ({
      ...m,
      jama: Math.round(m.jama),
      kharcha: Math.round(m.kharcha),
      balance: Math.round(m.jama - m.kharcha)
    })).sort((a, b) => b.month.localeCompare(a.month));

    const partyBreakdown = Object.values(partyMap).map(p => ({
      ...p,
      jama: Math.round(p.jama),
      kharcha: Math.round(p.kharcha),
      balance: Math.round(p.jama - p.kharcha)
    })).sort((a, b) => (b.jama + b.kharcha) - (a.jama + a.kharcha));

    res.json({
      status: 'success',
      data: {
        totalJama: Math.round(totalJama),
        totalKharcha: Math.round(totalKharcha),
        netBalance: Math.round(totalJama - totalKharcha),
        fineJama: Math.round(fineJama),
        rawJama: Math.round(rawJama),
        fineKharcha: Math.round(fineKharcha),
        rawKharcha: Math.round(rawKharcha),
        todayJama: Math.round(todayJama),
        todayKharcha: Math.round(todayKharcha),
        todayNet: Math.round(todayJama - todayKharcha),
        totalTransactions: transactions.length,
        monthlyBreakdown,
        partyBreakdown
      }
    });
  } catch (error) {
    console.error('Error fetching silver analysis:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch silver analysis',
      error: error.message
    });
  }
};

exports.deleteSilverTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    await WholesaleJamaKharchSilver.destroy({ where: { id } });

    res.json({
      status: 'success',
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete transaction'
    });
  }
};

exports.downloadSilverPDF = async (req, res) => {
  try {
    const transactions = await WholesaleJamaKharchSilver.findAll({
      order: [['date', 'ASC'], ['createdAt', 'ASC']]
    });

    const pdfBuffer = await generateLedgerPDF(transactions, 'Wholesale Silver Jama/Kharch Report', 'SILVER');

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="wholesale-silver-report.pdf"',
      'Content-Length': pdfBuffer.length
    });
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate PDF'
    });
  }
};

// Cash Transactions
exports.createCashTransaction = async (req, res) => {
  try {
    const transaction = await WholesaleJamaKharchCash.create({
      ...req.body,
      createdBy: req.user?.id || 1
    });

    res.json({
      status: 'success',
      message: 'Cash transaction created successfully',
      data: transaction
    });
  } catch (error) {
    console.error('Error creating cash transaction:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create transaction',
      error: error.message
    });
  }
};

exports.getCashTransactions = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;

    const where = {};
    if (type && type !== 'ALL') where.type = type;
    if (startDate && endDate) {
      where.date = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      where.date = { [Op.gte]: startDate };
    } else if (endDate) {
      where.date = { [Op.lte]: endDate };
    }

    const transactions = await WholesaleJamaKharchCash.findAll({
      where,
      order: [['date', 'DESC'], ['id', 'DESC']]
    });

    res.json({
      status: 'success',
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching cash transactions:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch transactions'
    });
  }
};

exports.getCashAnalysis = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};
    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    } else if (startDate) {
      where.date = { [Op.gte]: startDate };
    } else if (endDate) {
      where.date = { [Op.lte]: endDate };
    }

    const transactions = await WholesaleJamaKharchCash.findAll({
      where,
      order: [['date', 'DESC'], ['id', 'DESC']]
    });

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    let totalJama = 0;
    let totalKharcha = 0;
    let todayJama = 0;
    let todayKharcha = 0;

    const monthlyMap = {};
    const partyMap = {};

    transactions.forEach(t => {
      const amt = parseFloat(t.amount) || 0;
      const isJama = t.type === 'JAMA';
      const tDate = t.date ? String(t.date).split('T')[0] : '';

      if (isJama) {
        totalJama += amt;
      } else {
        totalKharcha += amt;
      }

      if (tDate === today) {
        if (isJama) todayJama += amt;
        else todayKharcha += amt;
      }

      // Monthly breakdown
      const monthKey = tDate ? tDate.substring(0, 7) : 'Unknown';
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          month: monthKey,
          jama: 0,
          kharcha: 0,
          count: 0
        };
      }
      if (isJama) monthlyMap[monthKey].jama += amt;
      else monthlyMap[monthKey].kharcha += amt;
      monthlyMap[monthKey].count += 1;

      // Party breakdown
      const party = (t.name || 'Unknown').trim();
      if (!partyMap[party]) {
        partyMap[party] = {
          name: party,
          jama: 0,
          kharcha: 0,
          count: 0
        };
      }
      if (isJama) partyMap[party].jama += amt;
      else partyMap[party].kharcha += amt;
      partyMap[party].count += 1;
    });

    const monthlyBreakdown = Object.values(monthlyMap).map(m => ({
      ...m,
      jama: Math.round(m.jama * 100) / 100,
      kharcha: Math.round(m.kharcha * 100) / 100,
      balance: Math.round((m.jama - m.kharcha) * 100) / 100
    })).sort((a, b) => b.month.localeCompare(a.month));

    const partyBreakdown = Object.values(partyMap).map(p => ({
      ...p,
      jama: Math.round(p.jama * 100) / 100,
      kharcha: Math.round(p.kharcha * 100) / 100,
      balance: Math.round((p.jama - p.kharcha) * 100) / 100
    })).sort((a, b) => (b.jama + b.kharcha) - (a.jama + a.kharcha));

    res.json({
      status: 'success',
      data: {
        totalJama: Math.round(totalJama * 100) / 100,
        totalKharcha: Math.round(totalKharcha * 100) / 100,
        netBalance: Math.round((totalJama - totalKharcha) * 100) / 100,
        todayJama: Math.round(todayJama * 100) / 100,
        todayKharcha: Math.round(todayKharcha * 100) / 100,
        todayNet: Math.round((todayJama - todayKharcha) * 100) / 100,
        totalTransactions: transactions.length,
        monthlyBreakdown,
        partyBreakdown
      }
    });
  } catch (error) {
    console.error('Error fetching cash analysis:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch cash analysis',
      error: error.message
    });
  }
};

exports.deleteCashTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    await WholesaleJamaKharchCash.destroy({ where: { id } });

    res.json({
      status: 'success',
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete transaction'
    });
  }
};

exports.downloadCashPDF = async (req, res) => {
  try {
    const transactions = await WholesaleJamaKharchCash.findAll({
      order: [['date', 'ASC'], ['createdAt', 'ASC']]
    });

    const pdfBuffer = await generateLedgerPDF(transactions, 'Wholesale Cash Jama/Kharch Report', 'CASH');

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="wholesale-cash-report.pdf"',
      'Content-Length': pdfBuffer.length
    });
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate PDF'
    });
  }
};
