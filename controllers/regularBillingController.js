const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const ExcelJS = require('exceljs');
const {
  RegularCustomer,
  RegularSale,
  RegularSaleItem,
  RegularTransaction,
  SilverTakenRecord
} = require('../models');

// ==========================================
// CUSTOMER MANAGEMENT
// ==========================================

exports.getAllCustomers = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = search
      ? {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } }
        ]
      }
      : {};

    const { count, rows } = await RegularCustomer.findAndCountAll({
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

exports.createCustomer = async (req, res) => {
  try {
    const { name, phone, address } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required'
      });
    }

    const existingCustomer = await RegularCustomer.findOne({
      where: {
        name: name.trim(),
        ...(phone && { phone: phone.trim() })
      }
    });

    if (existingCustomer) {
      return res.status(409).json({
        success: false,
        message: 'Customer already exists',
        data: existingCustomer
      });
    }

    const customer = await RegularCustomer.create({
      name: name.trim(),
      phone: phone ? phone.trim() : null,
      address: address ? address.trim() : null,
      balanceSilver: 0,
      balanceLabor: 0
    });

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating customer',
      error: error.message
    });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { name, phone, address } = req.body;

    const customer = await RegularCustomer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    await customer.update({
      name: name ? name.trim() : customer.name,
      phone: phone ? phone.trim() : customer.phone,
      address: address ? address.trim() : customer.address
    });

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: customer
    });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating customer',
      error: error.message
    });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await RegularCustomer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const salesCount = await RegularSale.count({
      where: { regularCustomerId: customerId }
    });

    if (salesCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete customer with existing sales'
      });
    }

    await customer.destroy();

    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting customer',
      error: error.message
    });
  }
};

exports.getCustomerLedger = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { startDate, endDate } = req.query;

    const customer = await RegularCustomer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const whereClause = { regularCustomerId: customerId };
    if (startDate && endDate) {
      whereClause.transactionDate = {
        [Op.between]: [startDate, endDate]
      };
    }

    const transactions = await RegularTransaction.findAll({
      where: whereClause,
      include: [
        {
          model: RegularSale,
          as: 'sale',
          attributes: ['id', 'voucherNumber', 'saleDate']
        }
      ],
      order: [['transactionDate', 'ASC'], ['createdAt', 'ASC']]
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

// ==========================================
// SALES MANAGEMENT
// ==========================================

exports.createRegularSale = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const {
      regularCustomerId,
      items,
      includePreviousDue = false,
      notes,
      paymentMode = 'none', // 'none', 'cash', 'silver', 'multiple'
      payments = {}
    } = req.body;

    const customer = await RegularCustomer.findByPk(regularCustomerId, {
      transaction: t
    });
    if (!customer) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const lastSale = await RegularSale.findOne({
      where: {
        voucherNumber: {
          [Op.like]: `REG${dateStr}%`
        }
      },
      order: [['voucherNumber', 'DESC']],
      transaction: t
    });

    let voucherNumber;
    if (lastSale) {
      const lastNum = parseInt(lastSale.voucherNumber.slice(-4), 10);
      voucherNumber = `REG${dateStr}${String(lastNum + 1).padStart(4, '0')}`;
    } else {
      voucherNumber = `REG${dateStr}0001`;
    }

    let totalNetWeight = 0;
    let totalWastage = 0;
    let totalSilverWeight = 0;
    let totalLaborCharges = 0;

    const itemsData = items.map(item => {
      const grossWeight = parseFloat(item.grossWeight);
      const stoneWeight = parseFloat(item.stoneWeight || 0);
      const netWeight = grossWeight - stoneWeight;
      const wastage = parseFloat(item.wastage || 0);
      const touch = parseFloat(item.touch || 0);
      const laborRatePerKg = parseFloat(item.laborRatePerKg || 0);

      const silverWeight = ((touch + wastage) * netWeight) / 100;
      // FIX: Labour calculation: netWeight * labour / 1000
      const laborCharges = (netWeight * laborRatePerKg) / 1000;

      totalNetWeight += netWeight;
      totalWastage += wastage;
      totalSilverWeight += silverWeight;
      totalLaborCharges += laborCharges;

      return {
        description: item.description,
        stamp:
          item.stamp && String(item.stamp).trim()
            ? String(item.stamp).trim()
            : '-',
        pieces: item.pieces || 1,
        grossWeight,
        stoneWeight,
        netWeight,
        wastage,
        touch,
        silverWeight,
        laborRatePerKg,
        laborCharges
      };
    });

    const realPreviousBalanceSilver = parseFloat(customer.balanceSilver || 0);
    const realPreviousBalanceLabor = parseFloat(customer.balanceLabor || 0);

    // Initial balances (Accumulate from Real Previous)
    let balanceSilver = totalSilverWeight + realPreviousBalanceSilver;
    let balanceLabor = totalLaborCharges + realPreviousBalanceLabor;

    let paidSilver = 0;
    let paidLabor = 0;

    // --- PAYMENT PROCESSING ---
    const silverPaymentsList = payments.silverPayments || [];

    // Support legacy/single structure if passed
    if (payments.physicalSilver && Object.keys(payments.physicalSilver).length > 0) {
      const p = payments.physicalSilver;
      if (parseFloat(p.weight) > 0 || parseFloat(p.fine) > 0) {
        silverPaymentsList.push(p);
      }
    }

    // Calculate total silver paid from list
    silverPaymentsList.forEach(p => {
      paidSilver += parseFloat(p.fine || 0);
    });

    // Cash for Silver (reduces silver balance)
    if (
      payments.cashForSilver &&
      parseFloat(payments.cashForSilver.weight) > 0
    ) {
      paidSilver += parseFloat(payments.cashForSilver.weight);
    }

    // Labor Payment
    if (payments.labor && parseFloat(payments.labor) > 0) {
      paidLabor += parseFloat(payments.labor);
    }

    balanceSilver -= paidSilver;
    balanceLabor -= paidLabor;

    const silverStatus = balanceSilver <= 0.005 ? 'PAID' : 'UNPAID';
    const laborStatus = balanceLabor <= 1 ? 'PAID' : 'UNPAID';

    let status = 'pending';
    if (silverStatus === 'PAID' && laborStatus === 'PAID') {
      status = 'paid';
    } else if (paidSilver > 0 || paidLabor > 0) {
      status = 'partial';
    }

    const sale = await RegularSale.create(
      {
        voucherNumber,
        regularCustomerId,
        totalNetWeight,
        totalWastage,
        totalSilverWeight,
        totalLaborCharges,
        paidSilver,
        paidLabor,
        balanceSilver,
        balanceLabor,
        // For display: store 0 if unchecked, but we used real balance for 'balanceSilver' calc
        previousBalanceSilver: includePreviousDue ? realPreviousBalanceSilver : 0,
        previousBalanceLabor: includePreviousDue ? realPreviousBalanceLabor : 0,
        includePreviousDue,
        laborStatus,
        silverStatus,
        status,
        notes,
        createdBy: req.user?.id || 4
      },
      { transaction: t }
    );

    await RegularSaleItem.bulkCreate(
      itemsData.map(i => ({
        ...i,
        regularSaleId: sale.id
      })),
      { transaction: t }
    );

    // Initial Sale Transaction
    await RegularTransaction.create(
      {
        regularCustomerId,
        regularSaleId: sale.id,
        type: 'sale',
        silverWeight: totalSilverWeight,
        laborAmount: totalLaborCharges,
        cashAmount: 0,
        silverRate: 0,
        balanceSilverBefore: realPreviousBalanceSilver,
        balanceSilverAfter: realPreviousBalanceSilver + totalSilverWeight,
        balanceLaborBefore: realPreviousBalanceLabor,
        balanceLaborAfter: realPreviousBalanceLabor + totalLaborCharges,
        notes: `Sale created: ${voucherNumber}`,
        createdBy: req.user?.id || 4
      },
      { transaction: t }
    );

    // --- CREATE PAYMENT TRANSACTIONS ---
    let currentBalanceSilver = realPreviousBalanceSilver + totalSilverWeight;
    let currentBalanceLabor = realPreviousBalanceLabor + totalLaborCharges;

    // 1. Process Silver Payments
    for (const sp of silverPaymentsList) {
      const fine = parseFloat(sp.fine || 0);
      const weight = parseFloat(sp.weight || 0);
      const touch = parseFloat(sp.touch || sp.tounch || 0);
      const fromNo = sp.fromNo || '';
      const name = sp.name || '';

      if (fine > 0) {
        let txnNotes = `Silver Payment: ${fine.toFixed(3)}g`;
        if (name) txnNotes += ` by ${name}`;
        if (fromNo) txnNotes += ` (#${fromNo})`;

        await RegularTransaction.create(
          {
            regularCustomerId,
            regularSaleId: sale.id,
            type: 'silver_payment',
            silverWeight: -fine,
            laborAmount: 0,
            cashAmount: 0,
            silverRate: 0,
            balanceSilverBefore: currentBalanceSilver,
            balanceSilverAfter: currentBalanceSilver - fine,
            balanceLaborBefore: currentBalanceLabor,
            balanceLaborAfter: currentBalanceLabor,
            notes: txnNotes,
            createdBy: req.user?.id || 4
          },
          { transaction: t }
        );
        currentBalanceSilver -= fine;
      }
    }

    // 2. Process Cash For Silver
    if (
      payments.cashForSilver &&
      parseFloat(payments.cashForSilver.weight) > 0 &&
      parseFloat(payments.cashForSilver.rate) > 0
    ) {
      const weight = parseFloat(payments.cashForSilver.weight);
      const rate = parseFloat(payments.cashForSilver.rate);
      const cashAmount = rate * weight;

      await RegularTransaction.create(
        {
          regularCustomerId,
          regularSaleId: sale.id,
          type: 'cash_for_silver',
          silverWeight: -weight,
          laborAmount: 0,
          cashAmount: cashAmount,
          silverRate: rate,
          balanceSilverBefore: currentBalanceSilver,
          balanceSilverAfter: currentBalanceSilver - weight,
          balanceLaborBefore: currentBalanceLabor,
          balanceLaborAfter: currentBalanceLabor,
          notes:
            payments.cashForSilver.notes ||
            `Paid ₹${cashAmount.toFixed(
              2
            )} for ${weight.toFixed(3)}g @ ₹${rate.toFixed(
              2
            )}/g (during sale creation)`,
          createdBy: req.user?.id || 4
        },
        { transaction: t }
      );
      currentBalanceSilver -= weight;
    }

    // 3. Process Labor (Cash) Payment
    if (payments.labor && parseFloat(payments.labor) > 0) {
      const laborPayment = parseFloat(payments.labor);

      await RegularTransaction.create(
        {
          regularCustomerId,
          regularSaleId: sale.id,
          type: 'labor_payment',
          silverWeight: 0,
          laborAmount: -laborPayment,
          cashAmount: laborPayment,
          silverRate: 0,
          balanceSilverBefore: currentBalanceSilver,
          balanceSilverAfter: currentBalanceSilver,
          balanceLaborBefore: currentBalanceLabor,
          balanceLaborAfter: currentBalanceLabor - laborPayment,
          notes:
            payments.laborNotes ||
            `Labor payment: ₹${laborPayment.toFixed(
              2
            )} (during sale creation)`,
          createdBy: req.user?.id || 4
        },
        { transaction: t }
      );
      currentBalanceLabor -= laborPayment;
    }

    // Update Customer Final Balance
    await customer.update(
      {
        balanceSilver: balanceSilver,
        balanceLabor: balanceLabor
      },
      { transaction: t }
    );

    await t.commit();

    const completeSale = await RegularSale.findByPk(sale.id, {
      include: [
        {
          model: RegularCustomer,
          as: 'customer',
          attributes: [
            'id',
            'name',
            'phone',
            'address',
            'balanceSilver',
            'balanceLabor'
          ]
        },
        {
          model: RegularSaleItem,
          as: 'items'
        },
        {
          model: RegularTransaction,
          as: 'transactions'
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Sale created successfully',
      data: completeSale
    });
  } catch (error) {
    if (t) await t.rollback();
    console.error('Create regular sale error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating sale',
      error: error.message
    });
  }
};

exports.getAllRegularSales = async (req, res) => {
  try {
    const {
      search,
      page = 1,
      limit = 20,
      regularCustomerId,
      status,
      startDate,
      endDate
    } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};

    if (search) {
      // We'll handle this with Op.or combining voucher match and customer association
      // But filtering by associated model (customer name) in top-level where requires special handling or just using the include's where?
      // Simpler: Filter voucher here, and let the include handle name?
      // Actually, standard Sequelize way:
      // where: {
      //   [Op.or]: [
      //      { voucherNumber: { [Op.like]: `%${search}%` } },
      //      { '$customer.name$': { [Op.like]: `%${search}%` } }
      //   ]
      // }
      // But verify alias 'customer'.

      const searchCondition = { [Op.like]: `%${search}%` };
      whereClause[Op.or] = [
        { voucherNumber: searchCondition },
        { '$customer.name$': searchCondition },
        { '$customer.phone$': searchCondition },
        { notes: searchCondition }
      ];
    }

    if (regularCustomerId) {
      whereClause.regularCustomerId = regularCustomerId;
    }
    if (status) {
      whereClause.status = status;
    }
    if (startDate && endDate) {
      whereClause.saleDate = {
        [Op.between]: [startDate, endDate]
      };
    } else if (startDate) {
      whereClause.saleDate = { [Op.gte]: startDate };
    } else if (endDate) {
      whereClause.saleDate = { [Op.lte]: endDate };
    }

    const { count, rows } = await RegularSale.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: RegularCustomer,
          as: 'customer',
          attributes: ['id', 'name', 'phone', 'address']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['saleDate', 'DESC'], ['id', 'DESC']]
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

exports.getRegularSaleDetails = async (req, res) => {
  try {
    const { saleId } = req.params;

    const sale = await RegularSale.findByPk(saleId, {
      include: [
        {
          model: RegularCustomer,
          as: 'customer',
          attributes: [
            'id',
            'name',
            'phone',
            'address',
            'balanceSilver',
            'balanceLabor'
          ]
        },
        {
          model: RegularSaleItem,
          as: 'items'
        },
        {
          model: RegularTransaction,
          as: 'transactions',
          separate: true,
          order: [['transactionDate', 'ASC'], ['createdAt', 'ASC']]
        }
      ]
    });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Return sale data as is
    // Previous balance should come from the sale record snapshot, not current customer balance.


    return res.json({
      success: true,
      data: sale
    });
  } catch (error) {
    console.error('Get sale details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching sale details',
      error: error.message
    });
  }
};

exports.updateSale = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { saleId } = req.params;
    const { items, includePreviousDue, notes } = req.body;

    const sale = await RegularSale.findByPk(saleId, {
      include: [{ model: RegularCustomer, as: 'customer' }],
      transaction: t
    });

    if (!sale) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    await RegularSaleItem.destroy({
      where: { regularSaleId: saleId },
      transaction: t
    });

    let totalNetWeight = 0;
    let totalWastage = 0;
    let totalSilverWeight = 0;
    let totalLaborCharges = 0;

    const itemsData = items.map(item => {
      const grossWeight = parseFloat(item.grossWeight);
      const stoneWeight = parseFloat(item.stoneWeight || 0);
      const netWeight = grossWeight - stoneWeight;
      const wastage = parseFloat(item.wastage || 0);
      const touch = parseFloat(item.touch || 0);
      const laborRatePerKg = parseFloat(item.laborRatePerKg || 0);

      const silverWeight = ((touch + wastage) * netWeight) / 100;
      const laborCharges = (netWeight * laborRatePerKg) / 1000;

      totalNetWeight += netWeight;
      totalWastage += wastage;
      totalSilverWeight += silverWeight;
      totalLaborCharges += laborCharges;

      return {
        regularSaleId: saleId,
        productId: item.productId || null,
        description: item.description,
        stamp:
          item.stamp && String(item.stamp).trim()
            ? String(item.stamp).trim()
            : '-',
        pieces: item.pieces || 1,
        grossWeight,
        stoneWeight,
        netWeight,
        wastage,
        touch,
        silverWeight,
        laborRatePerKg,
        laborCharges
      };
    });

    await RegularSaleItem.bulkCreate(itemsData, { transaction: t });

    const previousBalanceSilver = parseFloat(
      sale.previousBalanceSilver || 0
    );
    const previousBalanceLabor = parseFloat(
      sale.previousBalanceLabor || 0
    );

    let balanceSilver = totalSilverWeight;
    let balanceLabor = totalLaborCharges;

    if (includePreviousDue) {
      balanceSilver += previousBalanceSilver;
      balanceLabor += previousBalanceLabor;
    }

    balanceSilver -= parseFloat(sale.paidSilver || 0);
    balanceLabor -= parseFloat(sale.paidLabor || 0);

    const silverStatus = balanceSilver <= 0 ? 'PAID' : 'UNPAID';
    const laborStatus = balanceLabor <= 0 ? 'PAID' : 'UNPAID';

    let status = 'pending';
    if (silverStatus === 'PAID' && laborStatus === 'PAID') {
      status = 'paid';
    } else if (
      parseFloat(sale.paidSilver) > 0 ||
      parseFloat(sale.paidLabor) > 0
    ) {
      status = 'partial';
    }

    await sale.update(
      {
        totalNetWeight,
        totalWastage,
        totalSilverWeight,
        totalLaborCharges,
        balanceSilver,
        balanceLabor,
        includePreviousDue,
        silverStatus,
        laborStatus,
        status,
        notes
      },
      { transaction: t }
    );

    await sale.customer.update(
      {
        balanceSilver,
        balanceLabor
      },
      { transaction: t }
    );

    await t.commit();

    const updatedSale = await RegularSale.findByPk(saleId, {
      include: [
        {
          model: RegularCustomer,
          as: 'customer',
          attributes: [
            'id',
            'name',
            'phone',
            'address',
            'balanceSilver',
            'balanceLabor'
          ]
        },
        {
          model: RegularSaleItem,
          as: 'items'
        },
        {
          model: RegularTransaction,
          as: 'transactions'
        }
      ]
    });

    res.json({
      success: true,
      message: 'Sale updated successfully',
      data: updatedSale
    });
  } catch (error) {
    await t.rollback();
    console.error('Update sale error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating sale',
      error: error.message
    });
  }
};

exports.deleteSale = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { saleId } = req.params;

    const sale = await RegularSale.findByPk(saleId, {
      include: [{ model: RegularCustomer, as: 'customer' }],
      transaction: t
    });

    if (!sale) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    await RegularSaleItem.destroy({
      where: { regularSaleId: saleId },
      transaction: t
    });

    await RegularTransaction.destroy({
      where: { regularSaleId: saleId },
      transaction: t
    });

    const customerSales = await RegularSale.findAll({
      where: {
        regularCustomerId: sale.regularCustomerId,
        id: { [Op.ne]: saleId }
      },
      transaction: t
    });

    let newBalanceSilver = 0;
    let newBalanceLabor = 0;

    customerSales.forEach(s => {
      newBalanceSilver += parseFloat(s.balanceSilver || 0);
      newBalanceLabor += parseFloat(s.balanceLabor || 0);
    });

    await sale.customer.update(
      {
        balanceSilver: newBalanceSilver,
        balanceLabor: newBalanceLabor
      },
      { transaction: t }
    );

    await sale.destroy({ transaction: t });

    await t.commit();

    res.json({
      success: true,
      message: 'Sale deleted successfully'
    });
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

// ==========================================
// PAYMENT MANAGEMENT
// ==========================================

exports.addSilverPayment = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { saleId } = req.params;
    const { silverWeight, fromNo, weight, touch, name, notes } = req.body;

    if (!silverWeight || parseFloat(silverWeight) <= 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Valid silver weight is required'
      });
    }

    const sale = await RegularSale.findByPk(saleId, {
      include: [
        {
          model: RegularCustomer,
          as: 'customer'
        }
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

    const customer = sale.customer;
    const silverPayment = parseFloat(silverWeight);

    const previousBalanceSilver = parseFloat(sale.balanceSilver);
    const newBalanceSilver = previousBalanceSilver - silverPayment;
    const newPaidSilver = parseFloat(sale.paidSilver) + silverPayment;

    let silverStatus = newBalanceSilver <= 0 ? 'PAID' : 'UNPAID';

    let status = sale.status;
    if (silverStatus === 'PAID' && sale.laborStatus === 'PAID') {
      status = 'paid';
    } else if (newPaidSilver > 0 || parseFloat(sale.paidLabor) > 0) {
      status = 'partial';
    }

    let transactionNotes =
      notes || `Physical silver returned: ${silverPayment.toFixed(3)}g`;
    if (weight && touch) {
      const w = parseFloat(weight);
      const tTouch = parseFloat(touch);
      transactionNotes = `Silver returned: ${name ? name + ', ' : ''
        }Weight ${w.toFixed(3)}g, Touch ${tTouch.toFixed(
          2
        )}%, Fine ${silverPayment.toFixed(3)}g`;
      if (fromNo) {
        transactionNotes += ` - Ref: ${fromNo}`;
      }
    }

    await RegularTransaction.create(
      {
        regularCustomerId: sale.regularCustomerId,
        regularSaleId: sale.id,
        type: 'silver_payment',
        silverWeight: -silverPayment,
        laborAmount: 0,
        cashAmount: 0,
        silverRate: 0,
        balanceSilverBefore: previousBalanceSilver,
        balanceSilverAfter: newBalanceSilver,
        balanceLaborBefore: parseFloat(sale.balanceLabor),
        balanceLaborAfter: parseFloat(sale.balanceLabor),
        notes: transactionNotes,
        createdBy: req.user?.id || 1
      },
      { transaction: t }
    );

    await sale.update(
      {
        paidSilver: newPaidSilver,
        balanceSilver: newBalanceSilver,
        silverStatus,
        status
      },
      { transaction: t }
    );

    await customer.update(
      {
        balanceSilver: newBalanceSilver
      },
      { transaction: t }
    );

    await t.commit();

    res.json({
      success: true,
      message: 'Silver payment added successfully',
      data: sale
    });
  } catch (error) {
    await t.rollback();
    console.error('Add silver payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding silver payment',
      error: error.message
    });
  }
};

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

    const sale = await RegularSale.findByPk(saleId, {
      include: [
        {
          model: RegularCustomer,
          as: 'customer'
        }
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

    const customer = sale.customer;
    const rate = parseFloat(silverRate);
    const weight = parseFloat(silverWeight);
    const cashAmount = rate * weight;

    const previousBalanceSilver = parseFloat(sale.balanceSilver);
    const newBalanceSilver = previousBalanceSilver - weight;
    const newPaidSilver = parseFloat(sale.paidSilver) + weight;

    let silverStatus = newBalanceSilver <= 0 ? 'PAID' : 'UNPAID';

    let status = sale.status;
    if (silverStatus === 'PAID' && sale.laborStatus === 'PAID') {
      status = 'paid';
    } else if (newPaidSilver > 0 || parseFloat(sale.paidLabor) > 0) {
      status = 'partial';
    }

    await RegularTransaction.create(
      {
        regularCustomerId: sale.regularCustomerId,
        regularSaleId: sale.id,
        type: 'cash_for_silver',
        silverWeight: -weight,
        laborAmount: 0,
        cashAmount: cashAmount,
        silverRate: rate,
        balanceSilverBefore: previousBalanceSilver,
        balanceSilverAfter: newBalanceSilver,
        balanceLaborBefore: parseFloat(sale.balanceLabor),
        balanceLaborAfter: parseFloat(sale.balanceLabor),
        notes:
          notes ||
          `Paid ₹${cashAmount.toFixed(2)} for ${weight.toFixed(
            3
          )}g @ ₹${rate.toFixed(2)}/g`,
        createdBy: req.user?.id || 1
      },
      { transaction: t }
    );

    await sale.update(
      {
        paidSilver: newPaidSilver,
        balanceSilver: newBalanceSilver,
        silverStatus,
        status
      },
      { transaction: t }
    );

    await customer.update(
      {
        balanceSilver: newBalanceSilver
      },
      { transaction: t }
    );

    await t.commit();

    res.json({
      success: true,
      message: 'Cash for silver payment added successfully',
      data: sale
    });
  } catch (error) {
    await t.rollback();
    console.error('Add cash for silver error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding cash for silver payment',
      error: error.message
    });
  }
};

exports.addLaborPayment = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { saleId } = req.params;
    const { laborAmount, notes } = req.body;

    if (!laborAmount || parseFloat(laborAmount) <= 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Valid labor amount is required'
      });
    }

    const sale = await RegularSale.findByPk(saleId, {
      include: [
        {
          model: RegularCustomer,
          as: 'customer'
        }
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

    const customer = sale.customer;
    const payment = parseFloat(laborAmount);

    const previousBalanceLabor = parseFloat(sale.balanceLabor);
    const newBalanceLabor = previousBalanceLabor - payment;
    const newPaidLabor = parseFloat(sale.paidLabor) + payment;

    let laborStatus = newBalanceLabor <= 0 ? 'PAID' : 'UNPAID';

    let status = sale.status;
    if (sale.silverStatus === 'PAID' && laborStatus === 'PAID') {
      status = 'paid';
    } else if (
      parseFloat(sale.paidSilver) > 0 ||
      newPaidLabor > 0
    ) {
      status = 'partial';
    }

    await RegularTransaction.create(
      {
        regularCustomerId: sale.regularCustomerId,
        regularSaleId: sale.id,
        type: 'labor_payment',
        silverWeight: 0,
        laborAmount: -payment,
        cashAmount: payment,
        silverRate: 0,
        balanceSilverBefore: parseFloat(sale.balanceSilver),
        balanceSilverAfter: parseFloat(sale.balanceSilver),
        balanceLaborBefore: previousBalanceLabor,
        balanceLaborAfter: newBalanceLabor,
        notes:
          notes || `Labor payment: ₹${payment.toFixed(2)}`,
        createdBy: req.user?.id || 1
      },
      { transaction: t }
    );

    await sale.update(
      {
        paidLabor: newPaidLabor,
        balanceLabor: newBalanceLabor,
        laborStatus,
        status
      },
      { transaction: t }
    );

    await customer.update(
      {
        balanceLabor: newBalanceLabor
      },
      { transaction: t }
    );

    await t.commit();

    res.json({
      success: true,
      message: 'Labor payment added successfully',
      data: sale
    });
  } catch (error) {
    await t.rollback();
    console.error('Add labor payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding labor payment',
      error: error.message
    });
  }
};

// ==========================================
// RETURN SILVER (NEW)
// ==========================================

exports.returnSilver = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { saleId } = req.params;
    const { netWeight, notes } = req.body;

    if (!netWeight || parseFloat(netWeight) <= 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Valid net weight is required'
      });
    }

    const sale = await RegularSale.findByPk(saleId, {
      include: [
        {
          model: RegularCustomer,
          as: 'customer'
        }
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

    const customer = sale.customer;
    const weight = parseFloat(netWeight);

    const previousBalanceSilver = parseFloat(sale.balanceSilver);
    const newBalanceSilver = previousBalanceSilver - weight;
    const newPaidSilver = parseFloat(sale.paidSilver) + weight;

    let silverStatus = newBalanceSilver <= 0 ? 'PAID' : 'UNPAID';

    let status = sale.status;
    if (silverStatus === 'PAID' && sale.laborStatus === 'PAID') {
      status = 'paid';
    } else if (newPaidSilver > 0 || parseFloat(sale.paidLabor) > 0) {
      status = 'partial';
    }

    await RegularTransaction.create(
      {
        regularCustomerId: sale.regularCustomerId,
        regularSaleId: sale.id,
        type: 'return_silver',
        silverWeight: -weight,
        laborAmount: 0,
        cashAmount: 0,
        silverRate: 0,
        balanceSilverBefore: previousBalanceSilver,
        balanceSilverAfter: newBalanceSilver,
        balanceLaborBefore: parseFloat(sale.balanceLabor),
        balanceLaborAfter: parseFloat(sale.balanceLabor),
        notes:
          notes ||
          `Return silver: Net weight ${weight.toFixed(3)}g (negative in sale)`,
        createdBy: req.user?.id || 1
      },
      { transaction: t }
    );

    await sale.update(
      {
        paidSilver: newPaidSilver,
        balanceSilver: newBalanceSilver,
        silverStatus,
        status
      },
      { transaction: t }
    );

    await customer.update(
      {
        balanceSilver: newBalanceSilver
      },
      { transaction: t }
    );

    await t.commit();

    res.json({
      success: true,
      message: 'Return silver recorded successfully',
      data: sale
    });
  } catch (error) {
    await t.rollback();
    console.error('Return silver error:', error);
    res.status(500).json({
      success: false,
      message: 'Error returning silver',
      error: error.message
    });
  }
};

// ==========================================
// SILVER TAKEN (EXISTING COMPONENT SUPPORT)
// ==========================================

exports.createSilverTaken = async (req, res) => {
  try {
    const {
      regularCustomerId,
      fromNo,
      weight,
      touch,
      fine,
      notes
    } = req.body;

    if (!regularCustomerId) {
      return res.status(400).json({
        success: false,
        message: 'Customer required'
      });
    }
    if (!weight || !touch || !fine) {
      return res.status(400).json({
        success: false,
        message: 'Weight, touch, fine required'
      });
    }

    const customer = await RegularCustomer.findByPk(regularCustomerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const record = await SilverTakenRecord.create({
      regularCustomerId,
      fromNo,
      weight,
      touch,
      fine,
      notes,
      createdBy: req.user?.id || 1
    });

    await customer.update({
      balanceSilver:
        parseFloat(customer.balanceSilver || 0) - parseFloat(fine || 0)
    });

    res.status(201).json({
      success: true,
      message: 'Silver taken recorded successfully',
      data: record
    });
  } catch (error) {
    console.error('createSilverTaken error:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording silver taken',
      error: error.message
    });
  }
};

exports.getSilverTakenHistory = async (req, res) => {
  try {
    const records = await SilverTakenRecord.findAll({
      include: [
        {
          model: RegularCustomer,
          as: 'customer',
          attributes: ['id', 'name', 'phone']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: records
    });
  } catch (error) {
    console.error('getSilverTakenHistory error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching history',
      error: error.message
    });
  }
};

// ==========================================
// DAILY ANALYSIS
// ==========================================

exports.getDailyAnalysis = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const start = new Date(targetDate + 'T00:00:00');
    const end = new Date(targetDate + 'T23:59:59');

    const sales = await RegularSale.findAll({
      where: {
        saleDate: {
          [Op.between]: [start, end]
        }
      },
      include: [
        {
          model: RegularCustomer,
          as: 'customer',
          attributes: ['id', 'name', 'phone']
        }
      ],
      order: [['saleDate', 'ASC']]
    });

    const totalSales = sales.length;
    let totalSilver = 0;
    let totalAmount = 0;
    let totalPaid = 0;

    sales.forEach(s => {
      totalSilver += parseFloat(s.totalSilverWeight || 0);
      totalAmount += parseFloat(s.totalLaborCharges || 0);
      totalPaid +=
        parseFloat(s.paidLabor || 0) +
        parseFloat(s.paidSilver || 0) * 0;
    });

    res.json({
      success: true,
      data: {
        totalSales,
        totalSilver,
        totalAmount,
        totalPaid,
        sales
      }
    });
  } catch (error) {
    console.error('getDailyAnalysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching daily analysis',
      error: error.message
    });
  }
};

// ==========================================
// STATS / EXPORT
// ==========================================

exports.getRegularBillingStats = async (req, res) => {
  try {
    const totalSales = await RegularSale.count();

    const totals = await RegularSale.findOne({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('totalSilverWeight')), 'totalSilverWeight'],
        [sequelize.fn('SUM', sequelize.col('totalLaborCharges')), 'totalLaborCharges'],
        [sequelize.fn('SUM', sequelize.col('paidSilver')), 'paidSilver'],
        [sequelize.fn('SUM', sequelize.col('paidLabor')), 'paidLabor']
      ],
      raw: true
    });

    const customers = await RegularCustomer.findAll({
      attributes: ['balanceSilver', 'balanceLabor']
    });

    let pendingSilver = 0;
    let pendingLabor = 0;
    customers.forEach(customer => {
      pendingSilver += parseFloat(customer.balanceSilver || 0);
      pendingLabor += parseFloat(customer.balanceLabor || 0);
    });

    const totalCustomers = await RegularCustomer.count();

    res.json({
      success: true,
      data: {
        totalSales,
        totalSilverWeight: totals?.totalSilverWeight || 0,
        totalLaborCharges: totals?.totalLaborCharges || 0,
        paidSilver: totals?.paidSilver || 0,
        paidLabor: totals?.paidLabor || 0,
        pendingSilver,
        pendingLabor,
        totalCustomers
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
};

exports.exportSalesToExcel = async (req, res) => {
  try {
    const { search, startDate, endDate } = req.query;
    const whereClause = {};

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      whereClause.saleDate = { [Op.between]: [start, end] };
    }

    if (search) {
      whereClause.voucherNumber = { [Op.like]: `%${search}%` };
      // Note: Advanced search by customer name in export might require more complex queries
      // For now, simpler filter
    }

    const sales = await RegularSale.findAll({
      where: whereClause,
      include: [
        {
          model: RegularCustomer,
          as: 'customer',
          attributes: ['name', 'phone']
        }
      ],
      order: [['saleDate', 'DESC']]
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales');

    worksheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Voucher', key: 'voucher', width: 15 },
      { header: 'Customer', key: 'customer', width: 25 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Total Silver', key: 'totalSilver', width: 12 },
      { header: 'Total Amount', key: 'totalAmount', width: 15 },
      { header: 'Bal Silver', key: 'balSilver', width: 12 },
      { header: 'Bal Amount', key: 'balAmount', width: 15 },
      { header: 'Status', key: 'status', width: 10 }
    ];

    sales.forEach(sale => {
      worksheet.addRow({
        date: new Date(sale.saleDate).toLocaleDateString('en-GB'),
        voucher: sale.voucherNumber,
        customer: sale.customer?.name || 'N/A',
        phone: sale.customer?.phone || '',
        totalSilver: parseFloat(sale.totalSilverWeight || 0).toFixed(3),
        totalAmount: parseFloat(sale.totalLaborCharges || 0).toFixed(2),
        balSilver: parseFloat(sale.balanceSilver || 0).toFixed(3),
        balAmount: parseFloat(sale.balanceLabor || 0).toFixed(2),
        status: sale.status.toUpperCase()
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + `Sales_Export_${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting sales',
      error: error.message
    });
  }
};

exports.exportCustomersToExcel = async (req, res) => {
  try {
    const { search } = req.query;
    const whereClause = {};

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } }
      ];
    }

    const customers = await RegularCustomer.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Customers');

    worksheet.columns = [
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'Bal Silver', key: 'balSilver', width: 15 },
      { header: 'Bal Amount', key: 'balLabor', width: 15 }
    ];

    customers.forEach(customer => {
      worksheet.addRow({
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        balSilver: parseFloat(customer.balanceSilver || 0).toFixed(3),
        balLabor: parseFloat(customer.balanceLabor || 0).toFixed(2)
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + `Customers_Export_${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting customers',
      error: error.message
    });
  }
};

exports.returnSilver = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { saleId } = req.params;
    const { netWeight, notes, pieces } = req.body;

    if (!netWeight || parseFloat(netWeight) <= 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Valid net weight is required'
      });
    }

    const sale = await RegularSale.findByPk(saleId, {
      include: [
        {
          model: RegularCustomer,
          as: 'customer'
        }
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

    const customer = sale.customer;
    const weight = parseFloat(netWeight);

    const previousBalanceSilver = parseFloat(sale.balanceSilver);
    const newBalanceSilver = previousBalanceSilver - weight;
    const newPaidSilver = parseFloat(sale.paidSilver) + weight; // Treating return as payment? Not exactly.
    // If we treat it as payment, it increases paidSilver.
    // But paidSilver is usually "Silver received as Payment".
    // "Return" might be different. But for status calculation, it acts like payment.
    // However, if I want to distinguish 'Return' from 'Payment' in UI, I should be careful.
    // But `paidSilver` in Sale model is likely just a sum of credits.
    // I'll update paidSilver too.

    let silverStatus = newBalanceSilver <= 0.005 ? 'PAID' : 'UNPAID';

    let status = sale.status;
    if (silverStatus === 'PAID' && sale.laborStatus === 'PAID') {
      status = 'paid';
    } else if (newPaidSilver > 0 || parseFloat(sale.paidLabor) > 0) {
      status = 'partial';
    }

    await RegularTransaction.create(
      {
        regularCustomerId: sale.regularCustomerId,
        regularSaleId: sale.id,
        type: 'return_silver',
        silverWeight: -weight,
        laborAmount: 0,
        cashAmount: 0,
        silverRate: 0,
        balanceSilverBefore: previousBalanceSilver,
        balanceSilverAfter: newBalanceSilver,
        balanceLaborBefore: parseFloat(sale.balanceLabor),
        balanceLaborAfter: parseFloat(sale.balanceLabor),
        notes:
          notes ||
          `Return silver: ${pieces ? pieces + ' pcs, ' : ''}Net weight ${weight.toFixed(3)}g`,
        createdBy: req.user?.id || 1
      },
      { transaction: t }
    );

    await sale.update(
      {
        paidSilver: newPaidSilver,
        balanceSilver: newBalanceSilver,
        silverStatus,
        status
      },
      { transaction: t }
    );

    await customer.update(
      {
        balanceSilver: newBalanceSilver
      },
      { transaction: t }
    );

    await t.commit();

    res.json({
      success: true,
      message: 'Return silver recorded successfully',
      data: sale
    });
  } catch (error) {
    if (t) await t.rollback();
    console.error('Return silver error:', error);
    res.status(500).json({
      success: false,
      message: 'Error returning silver',
      error: error.message
    });
  }
};
