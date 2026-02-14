const RegularJamaKharchSilver = require('../models/RegularJamaKharchSilver');
const RegularJamaKharchCash = require('../models/RegularJamaKharchCash');
const { generateLedgerPDF } = require('../utils/pdfGenerator');

// Silver Transactions
exports.createSilverTransaction = async (req, res) => {
  try {
    const transaction = await RegularJamaKharchSilver.create({
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
    if (type) where.type = type;
    if (startDate && endDate) {
      where.date = {
        [Op.between]: [startDate, endDate]
      };
    }

    const transactions = await RegularJamaKharchSilver.findAll({
      where,
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
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

exports.deleteSilverTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    await RegularJamaKharchSilver.destroy({ where: { id } });

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
    const transactions = await RegularJamaKharchSilver.findAll({
      order: [['date', 'ASC'], ['createdAt', 'ASC']]
    });

    const pdfBuffer = await generateLedgerPDF(transactions, 'Regular Silver Jama/Kharch Report', 'SILVER');

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="regular-silver-report.pdf"',
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
    const transaction = await RegularJamaKharchCash.create({
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
    if (type) where.type = type;
    if (startDate && endDate) {
      where.date = {
        [Op.between]: [startDate, endDate]
      };
    }

    const transactions = await RegularJamaKharchCash.findAll({
      where,
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
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

exports.deleteCashTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    await RegularJamaKharchCash.destroy({ where: { id } });

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
    const transactions = await RegularJamaKharchCash.findAll({
      order: [['date', 'ASC'], ['createdAt', 'ASC']]
    });

    const pdfBuffer = await generateLedgerPDF(transactions, 'Regular Cash Jama/Kharch Report', 'CASH');

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="regular-cash-report.pdf"',
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
