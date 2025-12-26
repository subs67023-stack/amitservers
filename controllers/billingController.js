const { Customer, SilverRate, Sale, SaleItem, Transaction, WholesaleProduct, Producer, sequelize } = require('../models');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
// const { Sequelize, sequelize } = require('../config/database');

// Get or create customer
exports.getOrCreateCustomer = async (req, res) => {
  try {
    const { name, phone, email, address, gstNumber } = req.body;

    let customer = await Customer.findOne({ where: { phone } });

    if (!customer) {
      customer = await Customer.create({
        name,
        phone,
        email,
        address,
        gstNumber
      });
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Get/Create customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error managing customer',
      error: error.message
    });
  }
};

// Get all customers
exports.getAllCustomers = async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { isActive: true };
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Customer.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customers',
      error: error.message
    });
  }
};

// Get customer details with ledger
exports.getCustomerLedger = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { startDate, endDate } = req.query;

    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const whereClause = { customerId };
    if (startDate && endDate) {
      whereClause.transactionDate = {
        [Op.between]: [startDate, endDate]
      };
    }

    const transactions = await Transaction.findAll({
      where: whereClause,
      include: [
        {
          model: Sale,
          as: 'sale',
          attributes: ['voucherNumber', 'saleDate', 'totalAmount', 'billingType']
        }
      ],
      order: [['transactionDate', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        customer,
        transactions
      }
    });
  } catch (error) {
    console.error('Get customer ledger error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer ledger',
      error: error.message
    });
  }
};

// Get current silver rate
exports.getCurrentSilverRate = async (req, res) => {
  try {
    const rate = await SilverRate.getCurrentRate();

    if (!rate) {
      return res.status(404).json({
        success: false,
        message: 'No silver rate available'
      });
    }

    res.json({
      success: true,
      data: rate
    });
  } catch (error) {
    console.error('Get silver rate error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching silver rate',
      error: error.message
    });
  }
};

// Set silver rate
exports.setSilverRate = async (req, res) => {
  try {
    const { date, ratePerGram } = req.body;

    const [rate, created] = await SilverRate.findOrCreate({
      where: { date },
      defaults: { ratePerGram }
    });

    if (!created) {
      rate.ratePerGram = ratePerGram;
      await rate.save();
    }

    res.json({
      success: true,
      message: created ? 'Silver rate added' : 'Silver rate updated',
      data: rate
    });
  } catch (error) {
    console.error('Set silver rate error:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting silver rate',
      error: error.message
    });
  }
};

// Get silver rates history
exports.getSilverRatesHistory = async (req, res) => {
  try {
    const { limit = 30 } = req.query;

    const rates = await SilverRate.findAll({
      where: { isActive: true },
      limit: parseInt(limit),
      order: [['date', 'DESC']]
    });

    res.json({
      success: true,
      data: rates
    });
  } catch (error) {
    console.error('Get silver rates error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching silver rates',
      error: error.message
    });
  }
};

// ==========================================
// WHOLESALE PRODUCT MANAGEMENT
// ==========================================

exports.getAllProducers = async (req, res) => {
  try {
    const producers = await Producer.findAll({ order: [['name', 'ASC']] });
    res.json({ success: true, data: producers });
  } catch (error) {
    console.error('Error fetching producers:', error);
    res.status(500).json({ success: false, message: 'Error fetching producers' });
  }
};

exports.getAllWholesaleProducts = async (req, res) => {
  try {
    const products = await WholesaleProduct.findAll({
      order: [['createdAt', 'DESC']],
      include: [
        { model: Producer, as: 'producer' }
      ]
    });
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, message: 'Error fetching products' });
  }
};

exports.addWholesaleProduct = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      name,
      pieces,
      grossWeight,
      perPieceWeight,
      netWeight,
      touch,
      producerId, // Changed from customerId
      newProducerName, // Changed from newCustomerName
      newProducerPhone // Changed from newCustomerPhone
    } = req.body;

    // Create new producer if provided
    let finalProducerId = producerId;
    if ((!finalProducerId || finalProducerId === 'new') && newProducerName) {
      const newProd = await Producer.create({
        name: newProducerName,
        phone: newProducerPhone || ''
      }, { transaction: t });
      finalProducerId = newProd.id;
    }

    const product = await WholesaleProduct.create({
      name,
      pieces: parseInt(pieces || 0),
      grossWeight: parseFloat(grossWeight || 0),
      perPieceWeight: parseFloat(perPieceWeight || 0),
      netWeight: parseFloat(netWeight || 0),
      touch: parseFloat(touch || 0),
      producerId: finalProducerId
    }, { transaction: t });

    await t.commit();

    // Fetch with producer for immediate display
    const createdProduct = await WholesaleProduct.findByPk(product.id, {
      include: [{ model: Producer, as: 'producer' }]
    });

    res.json({ success: true, message: 'Product added', data: createdProduct });
  } catch (error) {
    await t.rollback();
    console.error('Add product error:', error);
    res.status(500).json({ success: false, message: 'Error adding product', error: error.message });
  }
};

exports.updateWholesaleProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, pieces, grossWeight, perPieceWeight, netWeight, touch, producerId } = req.body;
    const product = await WholesaleProduct.findByPk(id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    await product.update({
      name: name || product.name,
      pieces: pieces !== undefined ? parseInt(pieces) : product.pieces,
      grossWeight: grossWeight !== undefined ? parseFloat(grossWeight) : product.grossWeight,
      perPieceWeight: perPieceWeight !== undefined ? parseFloat(perPieceWeight) : product.perPieceWeight,
      netWeight: netWeight !== undefined ? parseFloat(netWeight) : product.netWeight,
      touch: touch !== undefined ? parseFloat(touch) : product.touch,
      producerId: producerId || product.producerId
    });

    res.json({ success: true, message: 'Product updated', data: product });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, message: 'Error updating product', error: error.message });
  }
};

exports.deleteWholesaleProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await WholesaleProduct.findByPk(id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    await product.destroy();
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: 'Error deleting product', error: error.message });
  }
};

// ============ UPDATED: Create sale with NEW FORMULAS & PAID SILVER ============
exports.createSale = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const {
      customerId,
      billingType,
      items,
      silverRate,
      paidAmount = 0,
      paidSilver = 0,
      gstApplicable = false,
      cgstPercent = 1.5,
      sgstPercent = 1.5,
      notes
    } = req.body;

    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Generate voucher number
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const lastSale = await Sale.findOne({
      where: { voucherNumber: { [Op.like]: `${dateStr}%` } },
      order: [['voucherNumber', 'DESC']],
      transaction: t
    });

    let voucherNumber;
    if (lastSale) {
      const lastNum = parseInt(lastSale.voucherNumber.slice(-4));
      voucherNumber = `${dateStr}${String(lastNum + 1).padStart(4, '0')}`;
    } else {
      voucherNumber = `${dateStr}0001`;
    }

    // ============ NEW CALCULATION ============
    let totalNetWeight = 0;
    let totalWastage = 0;
    let totalSilverWeight = 0;
    let totalLaborCharges = 0;
    let subtotal = 0;

    const itemsData = items.map(item => {
      const grossWeight = parseFloat(item.grossWeight);
      const netWeight = parseFloat(item.netWeight);
      const wastage = parseFloat(item.wastage || 0);
      const touch = parseFloat(item.touch || 0);
      const laborRatePerKg = parseFloat(item.laborRatePerKg || 0);

      // NEW FORMULA: Silver = (touch + wastage) × netWeight / 100
      const silverWeight = ((touch + wastage) * netWeight) / 100;

      // NEW FORMULA: Labor = grossWeight × laborRatePerKg / 1000
      const laborCharges = (grossWeight / 1000) * laborRatePerKg;

      // NEW FORMULA: Amount = silverWeight × silverRate + laborCharges
      const itemAmount = (silverWeight * parseFloat(silverRate)) + laborCharges;

      totalNetWeight += netWeight;
      totalWastage += wastage;
      totalSilverWeight += silverWeight;
      totalLaborCharges += laborCharges;
      subtotal += itemAmount;

      return {
        ...item,
        grossWeight,
        netWeight,
        wastage,
        touch,
        silverWeight,
        laborRatePerKg,
        laborCharges,
        itemAmount
      };
    });

    const cgst = gstApplicable ? (subtotal * cgstPercent) / 100 : 0;
    const sgst = gstApplicable ? (subtotal * sgstPercent) / 100 : 0;
    const totalAmount = subtotal + cgst + sgst;

    // 2. Calculate Credits (Payments)
    const paymentDetails = req.body.paymentDetails || {};
    const cashPaid = parseFloat(paymentDetails.cashPayment || paidAmount || 0);
    const silverPaid = parseFloat(paidSilver || 0);
    const c4s = paymentDetails.cashForSilver || {};
    const c4sWeight = parseFloat(c4s.weight || 0);
    const c4sRate = parseFloat(c4s.rate || 0);
    const c4sValue = c4sWeight * c4sRate;

    // 3. Update Split Balances
    // 3. Update Split Balances
    const laborBalanceBefore = parseFloat(customer.balanceLabor || 0);
    // FIX: c4sValue NOT deducted from Labor Balance
    const laborBalanceAfter = laborBalanceBefore + totalAmount - cashPaid;

    const silverBalanceBefore = parseFloat(customer.balanceSilver || 0);
    // FIX: c4sWeight deducted from Silver Balance
    const silverBalanceAfter = silverBalanceBefore + totalSilverWeight - silverPaid - c4sWeight;

    customer.balanceLabor = laborBalanceAfter;
    customer.balanceSilver = silverBalanceAfter;
    await customer.save({ transaction: t });

    const closingBalance = laborBalanceAfter; // For sale record legacy field or reuse
    const silverToReturn = billingType === 'wholesale' ? totalSilverWeight : 0;
    const silverReturnStatus = billingType === 'wholesale' ? 'pending' : 'na';

    // Legacy fields definition (fix for ReferenceError)
    const previousBalance = laborBalanceBefore;
    const balanceAmount = laborBalanceAfter;


    // Determine Status
    let status = 'pending';
    if (laborBalanceAfter <= 1 && silverBalanceAfter <= 0.005) status = 'paid';
    else if ((cashPaid > 0) || (silverPaid + c4sWeight > 0)) status = 'partial';

    const sale = await Sale.create({
      voucherNumber,
      customerId,
      billingType,
      silverRate,
      totalNetWeight,
      totalWastage,
      totalSilverWeight,
      totalLaborCharges,
      subtotal,
      gstApplicable,
      cgst,
      sgst,
      totalAmount,
      // paidAmount is Labor/Cash Paid. Exclude c4sValue.
      paidAmount: cashPaid,
      paidSilver: silverPaid + c4sWeight, // Include c4sWeight in Silver Paid/Returned tracking

      // Legacy fields
      balanceAmount,
      previousBalance,
      closingBalance,

      // NEW Split Balance Fields
      balanceSilver: silverBalanceAfter,
      balanceLabor: laborBalanceAfter,
      previousBalanceSilver: silverBalanceBefore,
      previousBalanceLabor: laborBalanceBefore,

      silverToReturn,
      silverReturned: silverPaid, // + c4sWeight REMOVED
      silverReturnStatus,
      notes,
      status,
      createdBy: req.user.id
    }, { transaction: t });

    // Update Inventory (Wholesale Products)
    for (const item of items) {
      if (item.productId) {
        const product = await WholesaleProduct.findByPk(item.productId, { transaction: t });
        if (product) {
          const soldPieces = parseInt(item.pieces || 0);
          const soldGross = parseFloat(item.grossWeight || 0);
          const soldNet = parseFloat(item.netWeight || 0);
          // soldStoneWeight logic is handled in soldNet subtraction effectively if net = gross - stone

          const currentPieces = parseInt(product.pieces || 0);
          const currentGross = parseFloat(product.grossWeight || 0);
          const currentNet = parseFloat(product.netWeight || 0);

          await product.update({
            pieces: Math.max(0, currentPieces - soldPieces),
            grossWeight: Math.max(0, currentGross - soldGross),
            netWeight: Math.max(0, currentNet - soldNet)
          }, { transaction: t });
        }
      }
    }

    const saleItems = itemsData.map(item => ({
      saleId: sale.id,
      productId: item.productId || null,
      description: item.description,
      pieces: item.pieces || 1,
      grossWeight: item.grossWeight,
      stoneWeight: item.stoneWeight || 0,
      netWeight: item.netWeight,
      wastage: item.wastage,
      touch: item.touch,
      silverWeight: item.silverWeight,
      laborRatePerKg: item.laborRatePerKg,
      laborCharges: item.laborCharges,
      itemAmount: item.itemAmount
    }));

    await SaleItem.bulkCreate(saleItems, { transaction: t });

    // 5. Create Transactions

    // A. Sale Transaction (The Bill - Debits)
    await Transaction.create({
      customerId,
      saleId: sale.id,
      type: 'sale',
      amount: totalAmount, // Debit Labor
      silverWeight: totalSilverWeight, // Debit Silver

      balanceLaborBefore: laborBalanceBefore,
      balanceLaborAfter: laborBalanceBefore + totalAmount,
      balanceSilverBefore: silverBalanceBefore,
      balanceSilverAfter: silverBalanceBefore + totalSilverWeight,

      // Legacy
      balanceBefore: laborBalanceBefore,
      balanceAfter: laborBalanceBefore + totalAmount,
      createdBy: req.user.id
    }, { transaction: t });

    let currentLaborBal = laborBalanceBefore + totalAmount;
    let currentSilverBal = silverBalanceBefore + totalSilverWeight;

    // B. Payments (Credits)
    if (cashPaid > 0) {
      currentLaborBal -= cashPaid;
      await Transaction.create({
        customerId,
        saleId: sale.id,
        type: 'payment',
        amount: -cashPaid,
        paymentMode: 'cash',

        balanceLaborBefore: currentLaborBal + cashPaid,
        balanceLaborAfter: currentLaborBal,
        balanceSilverBefore: currentSilverBal,
        balanceSilverAfter: currentSilverBal,

        balanceBefore: currentLaborBal + cashPaid,
        balanceAfter: currentLaborBal,
        notes: 'Cash Payment',
        createdBy: req.user.id
      }, { transaction: t });
    }

    if (silverPaid > 0) {
      currentSilverBal -= silverPaid;
      await Transaction.create({
        customerId,
        saleId: sale.id,
        type: 'silver_return', // Treat as Silver Return
        amount: 0,
        silverWeight: -silverPaid, // Credit Silver
        paymentMode: null,

        balanceLaborBefore: currentLaborBal,
        balanceLaborAfter: currentLaborBal,
        balanceSilverBefore: currentSilverBal + silverPaid,
        balanceSilverAfter: currentSilverBal,

        balanceBefore: currentLaborBal,
        balanceAfter: currentLaborBal,
        notes: 'Silver Payment',
        createdBy: req.user.id
      }, { transaction: t });
    }

    if (c4sValue > 0) {
      // currentLaborBal -= c4sValue; // REMOVED: Do not reduce labor balance (Cash doesn't offset due)
      currentSilverBal -= c4sWeight; // RESTORED: Reduces silver balance (Silver sold/returned)

      await Transaction.create({
        customerId,
        saleId: sale.id,
        type: 'cash_for_silver',
        amount: 0, // No impact on Labor Ledger
        cashAmount: c4sValue, // Store cash value for reference
        silverRate: c4sRate,
        silverWeight: -c4sWeight, // Credit Silver (Reduces Balance)
        paymentMode: 'cash',

        balanceLaborBefore: currentLaborBal, // No change
        balanceLaborAfter: currentLaborBal,
        balanceSilverBefore: currentSilverBal + c4sWeight,
        balanceSilverAfter: currentSilverBal,

        balanceBefore: currentLaborBal,
        balanceAfter: currentLaborBal,
        notes: `Cash for Silver: ${c4sWeight}g @ ${c4sRate}`,
        createdBy: req.user.id
      }, { transaction: t });
    }

    customer.balance = closingBalance;
    await customer.save({ transaction: t });

    await t.commit();

    const completeSale = await Sale.findByPk(sale.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: SaleItem, as: 'items' },
        { model: Transaction, as: 'transactions' } // Include transactions for PDF
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Sale created successfully',
      data: completeSale
    });

  } catch (error) {
    await t.rollback();
    console.error('Create sale error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating sale',
      error: error.message
    });
  }
};

// Get all sales
exports.getAllSales = async (req, res) => {
  try {
    const { customerId, billingType, startDate, endDate, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (customerId) whereClause.customerId = customerId;
    if (billingType) whereClause.billingType = billingType;
    if (status) whereClause.status = status;
    if (startDate && endDate) {
      whereClause.saleDate = { [Op.between]: [startDate, endDate] };
    }

    const { count, rows } = await Sale.findAndCountAll({
      where: whereClause,
      include: [{
        model: Customer,
        as: 'customer',
        attributes: ['id', 'name', 'phone']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['saleDate', 'DESC']]
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sales',
      error: error.message
    });
  }
};

// Get sale details
exports.getSaleDetails = async (req, res) => {
  try {
    const { saleId } = req.params;

    const sale = await Sale.findByPk(saleId, {
      include: [
        { model: Customer, as: 'customer' },
        { model: SaleItem, as: 'items' },
        {
          model: Transaction,
          as: 'transactions',
          order: [['transactionDate', 'ASC']]
        }
      ]
    });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.json({
      success: true,
      data: sale
    });
  } catch (error) {
    console.error('Get sale details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sale details',
      error: error.message
    });
  }
};

exports.addPayment = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { saleId } = req.params;
    const { amount, paymentMode = 'cash', referenceNumber = '', notes = '' } = req.body;

    // Validate amount
    if (!amount || parseFloat(amount) <= 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    // Find sale
    const sale = await Sale.findByPk(saleId, { transaction: t });
    if (!sale) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Find customer
    const customer = await Customer.findByPk(sale.customerId, { transaction: t });
    if (!customer) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const balanceLaborBefore = parseFloat(customer.balanceLabor || 0);
    const balanceLaborAfter = balanceLaborBefore - parseFloat(amount);
    const balanceAfter = balanceLaborAfter; // Alias for legacy or simple balance usage

    // Create transaction
    await Transaction.create({
      customerId: sale.customerId,
      saleId: sale.id,
      type: 'payment',
      amount: -parseFloat(amount),
      paymentMode,
      referenceNumber,
      balanceBefore: balanceLaborBefore, // Using labor balance as primary for 'payment'
      balanceAfter: balanceAfter,
      balanceLaborBefore: balanceLaborBefore,
      balanceLaborAfter: balanceLaborAfter,
      balanceSilverBefore: parseFloat(customer.balanceSilver || 0),
      balanceSilverAfter: parseFloat(customer.balanceSilver || 0),
      notes,
      createdBy: req.user?.id || 1
    }, { transaction: t });

    // Update customer balance (Split)
    customer.balanceLabor = balanceLaborAfter;
    await customer.save({ transaction: t });

    // Update sale
    const newPaidAmount = parseFloat(sale.paidAmount || 0) + parseFloat(amount);
    const newBalanceAmount = parseFloat(sale.balanceAmount || 0) - parseFloat(amount);

    sale.paidAmount = newPaidAmount;
    // Actually balanceAmount is usually sale.totalAmount - paidAmount. 
    // But here we just subtract payment. Assuming logic is correct.
    sale.balanceAmount = Math.max(0, newBalanceAmount);
    sale.balanceLabor = Math.max(0, parseFloat(sale.balanceLabor || 0) - parseFloat(amount)); // Update sale labor balance too
    sale.closingBalance = balanceAfter; // Snapshot of customer balance

    if (sale.balanceLabor <= 1 && sale.balanceSilver <= 0.005) {
      sale.status = 'paid';
    } else if (parseFloat(sale.paidAmount) > 0 || parseFloat(sale.paidSilver || 0) > 0) {
      sale.status = 'partial';
    }

    await sale.save({ transaction: t });
    await t.commit();

    res.json({
      success: true,
      message: 'Payment added successfully',
      data: sale
    });

  } catch (error) {
    await t.rollback();
    console.error('Add payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding payment',
      error: error.message
    });
  }
};



// Add silver return
exports.addSilverReturn = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { saleId } = req.params;
    const { silverWeight, notes } = req.body;

    const sale = await Sale.findByPk(saleId, { transaction: t });
    if (!sale) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    if (sale.billingType !== 'wholesale') {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Silver return only applicable for wholesale billing'
      });
    }

    const remainingSilver = parseFloat(sale.silverToReturn) - parseFloat(sale.silverReturned);
    if (silverWeight > remainingSilver) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Silver return amount exceeds pending amount'
      });
    }

    const customer = await Customer.findByPk(sale.customerId, { transaction: t });

    // MOVED TRANSACTION CREATION AFTER BALANCE CALCULATION
    /*
    await Transaction.create({
      customerId: sale.customerId,
      saleId: sale.id,
      type: 'silver_return',
      amount: 0,
      silverWeight: silverWeight,
      balanceBefore: customer.balance,
      balanceAfter: customer.balance,
      notes,
      createdBy: req.user.id
    }, { transaction: t });
    */

    sale.silverReturned = parseFloat(sale.silverReturned) + silverWeight;

    if (sale.silverReturned >= sale.silverToReturn) {
      sale.silverReturnStatus = 'completed';
    } else {
      sale.silverReturnStatus = 'partial';
    }

    // Update Customer Silver Balance
    const balanceSilverBefore = parseFloat(customer.balanceSilver || 0);
    customer.balanceSilver = balanceSilverBefore - parseFloat(silverWeight);

    await customer.save({ transaction: t });

    await Transaction.create({
      customerId: sale.customerId,
      saleId: sale.id,
      type: 'silver_return',
      amount: 0,
      silverWeight: -parseFloat(silverWeight), // Negative for return
      balanceBefore: balanceSilverBefore,
      balanceAfter: customer.balanceSilver,
      balanceSilverBefore: balanceSilverBefore,
      balanceSilverAfter: customer.balanceSilver,
      balanceLaborBefore: parseFloat(customer.balanceLabor || 0),
      balanceLaborAfter: parseFloat(customer.balanceLabor || 0), // Unchanged
      notes,
      createdBy: req.user.id
    }, { transaction: t });

    // Check for Status Update
    // Need to re-evaluate overall status (Silver Return affects Silver Balance)
    const currentLaborBal = parseFloat(sale.balanceLabor || 0); // Assuming this is up to date or unchanged
    const currentSilverBal = parseFloat(customer.balanceSilver || 0); // Wait, this is CUSTOMER balance.
    // We need SALE balance. 
    // Wait, sale.balanceSilver was NOT updated in this function in the original code!
    // The original code only updated customer.balanceSilver.
    // We must update sale.balanceSilver too.

    // Calculate new sale silver balance
    const saleSilverBalBefore = parseFloat(sale.balanceSilver || 0);
    const saleSilverBalAfter = saleSilverBalBefore - parseFloat(silverWeight);
    sale.balanceSilver = saleSilverBalAfter;

    if (currentLaborBal <= 1 && saleSilverBalAfter <= 0.005) {
      sale.status = 'paid';
    } else {
      sale.status = 'partial';
    }

    await sale.save({ transaction: t });

    await t.commit();

    res.json({
      success: true,
      message: 'Silver return recorded successfully',
      data: sale
    });

  } catch (error) {
    await t.rollback();
    console.error('Add silver return error:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording silver return',
      error: error.message
    });
  }
};

// Dashboard stats
exports.getBillingStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const whereClause = {};

    if (startDate && endDate) {
      whereClause.saleDate = { [Op.between]: [startDate, endDate] };
    }

    const totalSales = await Sale.count({ where: whereClause });
    const salesSum = await Sale.sum('totalAmount', { where: whereClause });
    const silverSum = await Sale.sum('totalSilverWeight', { where: whereClause });
    const paymentsSum = await Sale.sum('paidAmount', { where: whereClause });
    const pendingBalance = await Customer.sum('balance', {
      where: { balance: { [Op.gt]: 0 } }
    });
    const totalCustomers = await Customer.count({ where: { isActive: true } });
    const wholesaleSales = await Sale.count({
      where: { ...whereClause, billingType: 'wholesale' }
    });
    const pendingSilverReturn = await Sale.sum('silverToReturn', {
      where: {
        billingType: 'wholesale',
        silverReturnStatus: { [Op.in]: ['pending', 'partial'] }
      }
    }) || 0;
    const returnedSilver = await Sale.sum('silverReturned', {
      where: { billingType: 'wholesale' }
    }) || 0;

    res.json({
      success: true,
      data: {
        totalSales,
        totalSalesAmount: salesSum || 0,
        totalSilverWeight: silverSum || 0,
        totalPaymentsReceived: paymentsSum || 0,
        pendingBalance: pendingBalance || 0,
        totalCustomers,
        wholesaleSales,
        pendingSilverReturn,
        returnedSilver
      }
    });

  } catch (error) {
    console.error('Get billing stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stats',
      error: error.message
    });
  }
};

// Export sales to Excel
exports.exportSalesToExcel = async (req, res) => {
  try {
    const { customerId, billingType, startDate, endDate, status } = req.query;

    const whereClause = {};
    if (customerId) whereClause.customerId = customerId;
    if (billingType) whereClause.billingType = billingType;
    if (status) whereClause.status = status;
    if (startDate && endDate) {
      whereClause.saleDate = { [Op.between]: [startDate, endDate] };
    }

    const sales = await Sale.findAll({
      where: whereClause,
      include: [{
        model: Customer,
        as: 'customer',
        attributes: ['name', 'phone']
      }],
      order: [['saleDate', 'DESC']]
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales');

    worksheet.columns = [
      { header: 'Voucher No', key: 'voucherNumber', width: 15 },
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Customer', key: 'customer', width: 20 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Net Weight (g)', key: 'netWeight', width: 15 },
      { header: 'Silver Weight (g)', key: 'silverWeight', width: 18 },
      { header: 'Total Amount', key: 'totalAmount', width: 15 },
      { header: 'Paid', key: 'paid', width: 12 },
      { header: 'Paid Silver (g)', key: 'paidSilver', width: 15 },
      { header: 'Balance', key: 'balance', width: 12 },
      { header: 'Status', key: 'status', width: 12 }
    ];

    sales.forEach(sale => {
      worksheet.addRow({
        voucherNumber: sale.voucherNumber,
        date: new Date(sale.saleDate).toLocaleDateString('en-GB'),
        customer: sale.customer.name,
        phone: sale.customer.phone,
        type: sale.billingType,
        netWeight: parseFloat(sale.totalNetWeight).toFixed(3),
        silverWeight: parseFloat(sale.totalSilverWeight).toFixed(3),
        totalAmount: parseFloat(sale.totalAmount).toFixed(2),
        paid: parseFloat(sale.paidAmount).toFixed(2),
        paidSilver: parseFloat(sale.paidSilver).toFixed(3),
        balance: parseFloat(sale.balanceAmount).toFixed(2),
        status: sale.status.toUpperCase()
      });
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=sales-${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Export sales error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting sales',
      error: error.message
    });
  }
};

// Export customers to Excel
exports.exportCustomersToExcel = async (req, res) => {
  try {
    const { search } = req.query;

    const whereClause = { isActive: true };
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } }
      ];
    }

    const customers = await Customer.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Customers');

    worksheet.columns = [
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'GST Number', key: 'gstNumber', width: 18 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'Balance', key: 'balance', width: 15 }
    ];

    customers.forEach(customer => {
      worksheet.addRow({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || '-',
        gstNumber: customer.gstNumber || '-',
        address: customer.address || '-',
        balance: parseFloat(customer.balance).toFixed(2)
      });
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=customers-${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Export customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting customers',
      error: error.message
    });
  }
};

// Daily Analysis
exports.getDailyAnalysis = async (req, res) => {
  try {
    const { date } = req.query;
    const selectedDate = date || new Date().toISOString().split('T')[0];

    const sales = await Sale.findAll({
      where: {
        saleDate: {
          [Op.gte]: `${selectedDate} 00:00:00`,
          [Op.lte]: `${selectedDate} 23:59:59`
        }
      },
      include: [{
        model: Customer,
        as: 'customer',
        attributes: ['id', 'name', 'phone']
      }],
      order: [['createdAt', 'DESC']]
    });

    const totalSales = sales.length;
    const totalSilver = sales.reduce((sum, sale) => sum + parseFloat(sale.totalSilverWeight || 0), 0);
    const totalAmount = sales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount || 0), 0);
    const totalPaid = sales.reduce((sum, sale) => sum + parseFloat(sale.paidAmount || 0), 0);

    const withoutGST = sales.filter(s => s.billingType === 'regular');
    const withGST = sales.filter(s => s.billingType === 'wholesale');

    res.json({
      success: true,
      data: {
        date: selectedDate,
        totalSales,
        totalSilver,
        totalAmount,
        totalPaid,
        withoutGST: {
          count: withoutGST.length,
          silver: withoutGST.reduce((sum, s) => sum + parseFloat(s.totalSilverWeight || 0), 0),
          amount: withoutGST.reduce((sum, s) => sum + parseFloat(s.totalAmount || 0), 0),
          paid: withoutGST.reduce((sum, s) => sum + parseFloat(s.paidAmount || 0), 0)
        },
        withGST: {
          count: withGST.length,
          silver: withGST.reduce((sum, s) => sum + parseFloat(s.totalSilverWeight || 0), 0),
          amount: withGST.reduce((sum, s) => sum + parseFloat(s.totalAmount || 0), 0),
          paid: withGST.reduce((sum, s) => sum + parseFloat(s.paidAmount || 0), 0)
        },
        sales: sales.map(s => ({
          id: s.id,
          voucherNumber: s.voucherNumber,
          customer: s.customer,
          billingType: s.billingType,
          totalSilverWeight: s.totalSilverWeight,
          totalAmount: s.totalAmount,
          paidAmount: s.paidAmount,
          balanceAmount: s.balanceAmount
        }))
      }
    });
  } catch (error) {
    console.error('Daily analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching daily analysis',
      error: error.message
    });
  }
};

// Add silver payment separately
const addSilverPayment = async (req, res) => {
  const { id } = req.params;
  const { silverWeight, silverRate, notes } = req.body;

  try {
    // Get sale without includes first
    const sale = await Sale.findByPk(id);

    if (!sale) {
      return res.status(404).json({
        status: 'error',
        message: 'Sale not found'
      });
    }

    // Calculate silver value
    const silverValue = parseFloat(silverWeight) * parseFloat(silverRate);

    // Update paid silver and paid amount
    const newPaidSilver = parseFloat(sale.paidSilver || 0) + parseFloat(silverWeight);
    const newPaidAmount = parseFloat(sale.paidAmount) + silverValue;
    const newBalanceAmount = parseFloat(sale.totalAmount) - newPaidAmount;

    // Calculate new silver balance (sale)
    const currentSilverBal = parseFloat(sale.balanceSilver || 0);
    const newSilverBal = currentSilverBal - parseFloat(silverWeight);

    // Determine payment status
    let paymentStatus = 'pending';
    // Check BOTH Labor Balance (newBalanceAmount) and Silver Balance (newSilverBal)
    if (newBalanceAmount <= 1 && newSilverBal <= 0.005) {
      paymentStatus = 'paid';
    } else {
      paymentStatus = 'partial';
    }

    // Update sale
    await sale.update({
      paidSilver: newPaidSilver,
      paidAmount: newPaidAmount,
      balanceAmount: newBalanceAmount,
      balanceLabor: newBalanceAmount, // Ensure balanceLabor is synced
      balanceSilver: newSilverBal,    // Store updated Silver Balance
      status: paymentStatus
    });

    // Create transaction record
    await Transaction.create({
      customerId: sale.customerId,
      saleId: sale.id,
      type: 'silver_payment',
      silverWeight: parseFloat(silverWeight),
      amount: silverValue,
      paymentMode: 'silver',
      balanceBefore: parseFloat(sale.balanceAmount),
      balanceAfter: newBalanceAmount,
      notes: notes || `Silver payment: ${silverWeight}g @ ₹${silverRate}/g`,
      transactionDate: new Date()
    });

    // Update customer balance separately
    const customer = await Customer.findByPk(sale.customerId);
    if (customer) {
      const newCustomerBalance = parseFloat(customer.balance) - silverValue;
      await customer.update({ balance: newCustomerBalance });
    }

    // Fetch updated sale with all details (use correct aliases)
    const updatedSale = await Sale.findByPk(id, {
      include: [
        {
          model: Customer,
          as: 'customer'  // Try with lowercase 'customer'
        },
        {
          model: SaleItem,
          as: 'items'  // Common alias for items
        },
        {
          model: Transaction,
          as: 'transactions',  // Common alias for transactions
          separate: true,
          order: [['transactionDate', 'DESC']]
        }
      ]
    });

    res.json({
      status: 'success',
      message: 'Silver payment added successfully',
      data: updatedSale
    });

  } catch (error) {
    console.error('Error adding silver payment:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add silver payment',
      error: error.message
    });
  }
};


// Add to exports (find the exports object and add this line)
// Delete sale
exports.deleteSale = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;

    const sale = await Sale.findByPk(id, {
      include: [{ model: SaleItem, as: 'items' }]
    });

    if (!sale) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    // 1. Restore Inventory (Wholesale Products)
    for (const item of sale.items) {
      if (item.productId) {
        const product = await WholesaleProduct.findByPk(item.productId, { transaction: t });
        if (product) {
          await product.increment('netWeight', { by: parseFloat(item.netWeight), transaction: t });
        }
      }
    }

    // 2. Adjust Customer Balance
    const customer = await Customer.findByPk(sale.customerId, { transaction: t });
    if (customer) {
      // Remove the balance impact of this sale
      // If sale.balanceAmount was positive (debt), we decrease customer balance.
      // If sale.balanceAmount was negative (overpaid), we increase customer balance (remove credit).
      const balanceImpact = parseFloat(sale.balanceAmount);
      await customer.decrement('balance', { by: balanceImpact, transaction: t });
    }

    // 3. Delete Transactions linked to this sale
    await Transaction.destroy({
      where: { saleId: id },
      transaction: t
    });

    // 4. Delete Sale Items
    await SaleItem.destroy({
      where: { saleId: id },
      transaction: t
    });

    // 5. Delete Sale
    await sale.destroy({ transaction: t });

    await t.commit();

    res.json({ success: true, message: 'Sale deleted successfully' });

  } catch (error) {
    await t.rollback();
    console.error('Delete sale error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting sale',
      error: error.message
    });
  }
};

exports.addSilverPayment = addSilverPayment;

// Add cash for silver payment
exports.addCashForSilver = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { saleId } = req.params;
    const { silverRate, silverWeight, notes } = req.body;

    if (!silverRate || parseFloat(silverRate) <= 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Valid silver rate is required'
      });
    }

    if (!silverWeight || parseFloat(silverWeight) <= 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Valid silver weight is required'
      });
    }

    const sale = await Sale.findByPk(saleId, {
      include: [
        { model: Customer, as: 'customer' }
      ],
      transaction: t
    });

    if (!sale) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    const customer = await Customer.findByPk(sale.customerId, { transaction: t });
    const rate = parseFloat(silverRate);
    const weight = parseFloat(silverWeight);
    const cashAmount = rate * weight;

    // Calculate new balances
    const previousBalanceSilver = parseFloat(sale.balanceSilver || 0);
    const newBalanceSilver = previousBalanceSilver - weight;

    // Update Sale
    sale.balanceSilver = newBalanceSilver;

    if (newBalanceSilver <= 0.005 && sale.balanceLabor <= 1) {
      sale.status = 'paid';
    } else {
      sale.status = 'partial';
    }

    await sale.save({ transaction: t });

    // Update Customer
    const customerBalanceSilver = parseFloat(customer.balanceSilver || 0);
    customer.balanceSilver = customerBalanceSilver - weight;
    await customer.save({ transaction: t });

    // Create Transaction
    await Transaction.create({
      customerId: sale.customerId,
      saleId: sale.id,
      type: 'cash_for_silver',
      amount: 0,
      silverWeight: -weight,
      balanceBefore: parseFloat(customer.balanceLabor || 0),
      balanceAfter: parseFloat(customer.balanceLabor || 0),
      balanceSilverBefore: customerBalanceSilver,
      balanceSilverAfter: customer.balanceSilver,
      balanceLaborBefore: parseFloat(customer.balanceLabor || 0),
      balanceLaborAfter: parseFloat(customer.balanceLabor || 0),
      notes: notes || `Cash for Silver: ${weight.toFixed(3)}g @ ${rate.toFixed(2)}`,
      createdBy: req.user?.id || 1
    }, { transaction: t });

    await t.commit();

    res.json({
      success: true,
      message: 'Cash for silver recorded successfully',
      data: sale
    });

  } catch (error) {
    await t.rollback();
    console.error('Add cash for silver error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding cash for silver',
      error: error.message
    });
  }
};

module.exports = exports;
