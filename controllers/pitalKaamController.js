const { PitalEntry, PitalCustomer, sequelize } = require('../models');
const { Op } = require('sequelize');

// Helper to auto-create or find customer by name AND type (NEVER mix kharedi and veekhari)
const ensureCustomer = async (name, customerType = 'kharedi', transaction = null) => {
  if (!name || !name.trim()) return null;
  const trimmedName = name.trim();
  const [customer] = await PitalCustomer.findOrCreate({
    where: { name: trimmedName, customerType },
    defaults: { name: trimmedName, customerType },
    transaction
  });
  return customer;
};

// Generate Bill Number
const generateBillNo = async (type) => {
  const prefix = type === 'kharedi' ? 'PK' : 'PV';
  const count = await PitalEntry.count({ where: { entryType: type } });
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `${prefix}-${dateStr}-${String(count + 1).padStart(3, '0')}`;
};

// 1. Get Distinct Party / Customer Names for Autocomplete (Separated by type)
exports.getNames = async (req, res) => {
  try {
    const { type } = req.query; // 'kharedi' | 'veekhari' | undefined

    if (type) {
      const customers = await PitalCustomer.findAll({
        where: { customerType: type },
        attributes: ['name', 'phone', 'address'],
        order: [['name', 'ASC']]
      });

      const entries = await PitalEntry.findAll({
        where: { entryType: type },
        attributes: ['name'],
        group: ['name'],
        order: [['name', 'ASC']]
      });

      const nameSet = new Set();
      customers.forEach(c => { if (c.name) nameSet.add(c.name.trim()); });
      entries.forEach(e => { if (e.name) nameSet.add(e.name.trim()); });

      return res.json({
        success: true,
        type,
        data: Array.from(nameSet),
        customers
      });
    }

    // Both types separated
    const kharediCustomers = await PitalCustomer.findAll({
      where: { customerType: 'kharedi' },
      attributes: ['name'],
      order: [['name', 'ASC']]
    });
    const kharediEntries = await PitalEntry.findAll({
      where: { entryType: 'kharedi' },
      attributes: ['name'],
      group: ['name']
    });
    const kharediNames = new Set();
    kharediCustomers.forEach(c => { if (c.name) kharediNames.add(c.name.trim()); });
    kharediEntries.forEach(e => { if (e.name) kharediNames.add(e.name.trim()); });

    const veekhariCustomers = await PitalCustomer.findAll({
      where: { customerType: 'veekhari' },
      attributes: ['name'],
      order: [['name', 'ASC']]
    });
    const veekhariEntries = await PitalEntry.findAll({
      where: { entryType: 'veekhari' },
      attributes: ['name'],
      group: ['name']
    });
    const veekhariNames = new Set();
    veekhariCustomers.forEach(c => { if (c.name) veekhariNames.add(c.name.trim()); });
    veekhariEntries.forEach(e => { if (e.name) veekhariNames.add(e.name.trim()); });

    res.json({
      success: true,
      kharediNames: Array.from(kharediNames),
      veekhariNames: Array.from(veekhariNames)
    });
  } catch (error) {
    console.error('Error fetching names:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch names' });
  }
};

// 2. Get Kharedi Entries
exports.getKharedi = async (req, res) => {
  try {
    const { search, startDate, endDate, page = 1, limit = 50 } = req.query;
    const where = { entryType: 'kharedi' };

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { billNo: { [Op.like]: `%${search}%` } }
      ];
    }

    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    } else if (startDate) {
      where.date = { [Op.gte]: startDate };
    } else if (endDate) {
      where.date = { [Op.lte]: endDate };
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const { count, rows } = await PitalEntry.findAndCountAll({
      where,
      order: [['date', 'DESC'], ['id', 'DESC']],
      limit: parseInt(limit, 10),
      offset
    });

    const allKharedi = await PitalEntry.findAll({ where });
    let totalKg = 0;
    let totalAmount = 0;
    allKharedi.forEach(e => {
      totalKg += parseFloat(e.kg || 0);
      totalAmount += parseFloat(e.total || 0);
    });

    res.json({
      success: true,
      data: rows,
      summary: {
        totalKg: Number(totalKg.toFixed(3)),
        totalAmount: Number(totalAmount.toFixed(2)),
        avgRate: totalKg > 0 ? Number((totalAmount / totalKg).toFixed(2)) : 0,
        count
      },
      pagination: {
        total: count,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(count / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('Error fetching kharedi:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch kharedi entries' });
  }
};

// 3. Create Kharedi Entry (party is strictly kharedi)
exports.createKharedi = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { date, name, kg, ratePerKg, notes } = req.body;

    if (!name || !name.trim()) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Party name is required' });
    }

    const parsedKg = parseFloat(kg) || 0;
    const parsedRate = parseFloat(ratePerKg) || 0;

    if (parsedKg <= 0 || parsedRate <= 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Valid kg and rate/kg are required' });
    }

    const total = Number((parsedKg * parsedRate).toFixed(2));
    // Ensure customer is registered as Kharedi party
    const customer = await ensureCustomer(name, 'kharedi', transaction);
    const billNo = await generateBillNo('kharedi');

    const entry = await PitalEntry.create({
      entryType: 'kharedi',
      billNo,
      date: date || new Date().toISOString().split('T')[0],
      name: name.trim(),
      customerId: customer ? customer.id : null,
      kg: parsedKg,
      ratePerKg: parsedRate,
      total,
      notes: notes || null
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'Kharedi entry created successfully',
      data: entry
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating kharedi:', error);
    res.status(500).json({ success: false, message: 'Failed to create kharedi entry', error: error.message });
  }
};

// 4. Get Veekhari Entries
exports.getVeekhari = async (req, res) => {
  try {
    const { search, startDate, endDate, page = 1, limit = 50 } = req.query;
    const where = { entryType: 'veekhari' };

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { billNo: { [Op.like]: `%${search}%` } }
      ];
    }

    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    } else if (startDate) {
      where.date = { [Op.gte]: startDate };
    } else if (endDate) {
      where.date = { [Op.lte]: endDate };
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const { count, rows } = await PitalEntry.findAndCountAll({
      where,
      order: [['date', 'DESC'], ['id', 'DESC']],
      limit: parseInt(limit, 10),
      offset
    });

    const allVeekhari = await PitalEntry.findAll({ where });
    let totalKg = 0;
    let totalAmount = 0;
    let totalCost = 0;
    let totalProfit = 0;

    allVeekhari.forEach(e => {
      const kgVal = parseFloat(e.kg || 0);
      totalKg += kgVal;
      totalAmount += parseFloat(e.total || 0);
      if (e.costAmount) totalCost += parseFloat(e.costAmount);
      if (e.profit) totalProfit += parseFloat(e.profit);
    });

    res.json({
      success: true,
      data: rows,
      summary: {
        totalKg: Number(totalKg.toFixed(3)),
        totalAmount: Number(totalAmount.toFixed(2)),
        totalCost: Number(totalCost.toFixed(2)),
        totalProfit: Number(totalProfit.toFixed(2)),
        avgRate: totalKg > 0 ? Number((totalAmount / totalKg).toFixed(2)) : 0,
        count
      },
      pagination: {
        total: count,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(count / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('Error fetching veekhari:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch veekhari entries' });
  }
};

// 5. Create Veekhari Entry (customer is strictly veekhari)
exports.createVeekhari = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { date, name, kg, ratePerKg, takenRatePerKg, notes } = req.body;

    if (!name || !name.trim()) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Customer name is required' });
    }

    const parsedKg = parseFloat(kg) || 0;
    const parsedRate = parseFloat(ratePerKg) || 0;
    const parsedTakenRate = takenRatePerKg !== undefined && takenRatePerKg !== '' ? parseFloat(takenRatePerKg) : null;

    if (parsedKg <= 0 || parsedRate <= 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Valid kg and rate/kg are required' });
    }

    const total = Number((parsedKg * parsedRate).toFixed(2));
    let costAmount = null;
    let profit = null;

    if (parsedTakenRate !== null && !isNaN(parsedTakenRate)) {
      costAmount = Number((parsedKg * parsedTakenRate).toFixed(2));
      profit = Number((total - costAmount).toFixed(2));
    }

    // Ensure customer is registered as Veekhari customer
    const customer = await ensureCustomer(name, 'veekhari', transaction);
    const billNo = await generateBillNo('veekhari');

    const entry = await PitalEntry.create({
      entryType: 'veekhari',
      billNo,
      date: date || new Date().toISOString().split('T')[0],
      name: name.trim(),
      customerId: customer ? customer.id : null,
      kg: parsedKg,
      ratePerKg: parsedRate,
      total,
      takenRatePerKg: parsedTakenRate,
      costAmount,
      profit,
      notes: notes || null
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'Veekhari entry created successfully',
      data: entry
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating veekhari:', error);
    res.status(500).json({ success: false, message: 'Failed to create veekhari entry', error: error.message });
  }
};

// 6. Update Entry
exports.updateEntry = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const entry = await PitalEntry.findByPk(id);

    if (!entry) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Entry not found' });
    }

    const { date, name, kg, ratePerKg, takenRatePerKg, notes } = req.body;

    const parsedKg = parseFloat(kg) || parseFloat(entry.kg);
    const parsedRate = parseFloat(ratePerKg) || parseFloat(entry.ratePerKg);
    const total = Number((parsedKg * parsedRate).toFixed(2));

    let parsedTakenRate = entry.takenRatePerKg;
    let costAmount = entry.costAmount;
    let profit = entry.profit;

    if (entry.entryType === 'veekhari') {
      if (takenRatePerKg !== undefined && takenRatePerKg !== '') {
        parsedTakenRate = parseFloat(takenRatePerKg);
        costAmount = Number((parsedKg * parsedTakenRate).toFixed(2));
        profit = Number((total - costAmount).toFixed(2));
      } else if (takenRatePerKg === null || takenRatePerKg === '') {
        parsedTakenRate = null;
        costAmount = null;
        profit = null;
      }
    }

    let customerId = entry.customerId;
    if (name && name.trim() !== entry.name) {
      const customer = await ensureCustomer(name, entry.entryType, transaction);
      customerId = customer ? customer.id : null;
    }

    await entry.update({
      date: date || entry.date,
      name: name ? name.trim() : entry.name,
      customerId,
      kg: parsedKg,
      ratePerKg: parsedRate,
      total,
      takenRatePerKg: parsedTakenRate,
      costAmount,
      profit,
      notes: notes !== undefined ? notes : entry.notes
    }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Entry updated successfully',
      data: entry
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating entry:', error);
    res.status(500).json({ success: false, message: 'Failed to update entry', error: error.message });
  }
};

// 7. Delete Entry
exports.deleteEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await PitalEntry.findByPk(id);

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Entry not found' });
    }

    await entry.destroy();
    res.json({ success: true, message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting entry:', error);
    res.status(500).json({ success: false, message: 'Failed to delete entry' });
  }
};

// 8. Overall Analysis
exports.getAnalysis = async (req, res) => {
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

    const allEntries = await PitalEntry.findAll({
      where,
      order: [['date', 'ASC']]
    });

    let kharediKg = 0;
    let kharediAmount = 0;
    let kharediCount = 0;

    let veekhariKg = 0;
    let veekhariAmount = 0;
    let veekhariCost = 0;
    let veekhariProfit = 0;
    let veekhariCount = 0;

    const monthlyMap = {};

    allEntries.forEach(e => {
      const kg = parseFloat(e.kg || 0);
      const total = parseFloat(e.total || 0);
      const monthKey = e.date ? e.date.substring(0, 7) : 'Unknown';

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          month: monthKey,
          kharediKg: 0,
          kharediAmount: 0,
          veekhariKg: 0,
          veekhariAmount: 0,
          profit: 0
        };
      }

      if (e.entryType === 'kharedi') {
        kharediKg += kg;
        kharediAmount += total;
        kharediCount++;
        monthlyMap[monthKey].kharediKg += kg;
        monthlyMap[monthKey].kharediAmount += total;
      } else if (e.entryType === 'veekhari') {
        veekhariKg += kg;
        veekhariAmount += total;
        veekhariCount++;
        monthlyMap[monthKey].veekhariKg += kg;
        monthlyMap[monthKey].veekhariAmount += total;

        if (e.profit) {
          veekhariProfit += parseFloat(e.profit);
          monthlyMap[monthKey].profit += parseFloat(e.profit);
        }
        if (e.costAmount) {
          veekhariCost += parseFloat(e.costAmount);
        }
      }
    });

    const stockRemainingKg = Number((kharediKg - veekhariKg).toFixed(3));
    const netCashFlow = Number((veekhariAmount - kharediAmount).toFixed(2));
    const avgKharediRate = kharediKg > 0 ? Number((kharediAmount / kharediKg).toFixed(2)) : 0;
    const avgVeekhariRate = veekhariKg > 0 ? Number((veekhariAmount / veekhariKg).toFixed(2)) : 0;

    const monthlyBreakdown = Object.values(monthlyMap).sort((a, b) => b.month.localeCompare(a.month));

    res.json({
      success: true,
      data: {
        kharedi: {
          totalKg: Number(kharediKg.toFixed(3)),
          totalAmount: Number(kharediAmount.toFixed(2)),
          count: kharediCount,
          avgRate: avgKharediRate
        },
        veekhari: {
          totalKg: Number(veekhariKg.toFixed(3)),
          totalAmount: Number(veekhariAmount.toFixed(2)),
          count: veekhariCount,
          avgRate: avgVeekhariRate,
          totalCost: Number(veekhariCost.toFixed(2)),
          totalProfit: Number(veekhariProfit.toFixed(2))
        },
        balance: {
          stockRemainingKg,
          netCashFlow
        },
        monthlyBreakdown
      }
    });
  } catch (error) {
    console.error('Error fetching analysis:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analysis' });
  }
};

// 9. Customers (Completely SEPARATED between Kharedi Parties and Veekhari Customers)
exports.getCustomers = async (req, res) => {
  try {
    const { search, type } = req.query; // 'kharedi' | 'veekhari' | undefined

    const entries = await PitalEntry.findAll({
      order: [['date', 'DESC'], ['id', 'DESC']]
    });

    // 1. Group Kharedi Parties strictly from kharedi entries
    const kharediMap = {};
    // 2. Group Veekhari Customers strictly from veekhari entries
    const veekhariMap = {};

    entries.forEach(e => {
      const name = e.name.trim();
      const kg = parseFloat(e.kg || 0);
      const total = parseFloat(e.total || 0);

      if (e.entryType === 'kharedi') {
        if (!kharediMap[name]) {
          kharediMap[name] = {
            name,
            customerType: 'kharedi',
            totalKg: 0,
            totalAmount: 0,
            transactionCount: 0,
            lastDate: e.date
          };
        }
        kharediMap[name].totalKg += kg;
        kharediMap[name].totalAmount += total;
        kharediMap[name].transactionCount++;
        if (e.date > kharediMap[name].lastDate) {
          kharediMap[name].lastDate = e.date;
        }
      } else if (e.entryType === 'veekhari') {
        if (!veekhariMap[name]) {
          veekhariMap[name] = {
            name,
            customerType: 'veekhari',
            totalKg: 0,
            totalAmount: 0,
            totalProfit: 0,
            transactionCount: 0,
            lastDate: e.date
          };
        }
        veekhariMap[name].totalKg += kg;
        veekhariMap[name].totalAmount += total;
        if (e.profit) veekhariMap[name].totalProfit += parseFloat(e.profit);
        veekhariMap[name].transactionCount++;
        if (e.date > veekhariMap[name].lastDate) {
          veekhariMap[name].lastDate = e.date;
        }
      }
    });

    let kharediParties = Object.values(kharediMap).map(p => ({
      ...p,
      totalKg: Number(p.totalKg.toFixed(3)),
      totalAmount: Number(p.totalAmount.toFixed(2)),
      avgRate: p.totalKg > 0 ? Number((p.totalAmount / p.totalKg).toFixed(2)) : 0
    }));

    let veekhariCustomers = Object.values(veekhariMap).map(c => ({
      ...c,
      totalKg: Number(c.totalKg.toFixed(3)),
      totalAmount: Number(c.totalAmount.toFixed(2)),
      totalProfit: Number((c.totalProfit || 0).toFixed(2)),
      avgRate: c.totalKg > 0 ? Number((c.totalAmount / c.totalKg).toFixed(2)) : 0
    }));

    if (search) {
      const q = search.toLowerCase();
      kharediParties = kharediParties.filter(p => p.name.toLowerCase().includes(q));
      veekhariCustomers = veekhariCustomers.filter(c => c.name.toLowerCase().includes(q));
    }

    kharediParties.sort((a, b) => a.name.localeCompare(b.name));
    veekhariCustomers.sort((a, b) => a.name.localeCompare(b.name));

    if (type === 'kharedi') {
      return res.json({ success: true, data: kharediParties });
    }
    if (type === 'veekhari') {
      return res.json({ success: true, data: veekhariCustomers });
    }

    res.json({
      success: true,
      kharediParties,
      veekhariCustomers
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customers' });
  }
};

// 10. Customer Detailed Ledger (Strictly by type so Kharedi and Veekhari never mix)
exports.getCustomerLedger = async (req, res) => {
  try {
    const { name } = req.params;
    const { type } = req.query; // 'kharedi' | 'veekhari'

    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const where = { name };
    if (type && (type === 'kharedi' || type === 'veekhari')) {
      where.entryType = type;
    }

    const entries = await PitalEntry.findAll({
      where,
      order: [['date', 'ASC'], ['id', 'ASC']]
    });

    let runningKg = 0;
    let runningAmount = 0;
    let totalKg = 0;
    let totalAmount = 0;
    let totalProfit = 0;

    const ledgerEntries = entries.map(e => {
      const kg = parseFloat(e.kg || 0);
      const total = parseFloat(e.total || 0);

      runningKg += kg;
      runningAmount += total;
      totalKg += kg;
      totalAmount += total;
      if (e.profit) totalProfit += parseFloat(e.profit);

      return {
        id: e.id,
        billNo: e.billNo,
        date: e.date,
        entryType: e.entryType,
        kg,
        ratePerKg: parseFloat(e.ratePerKg || 0),
        total,
        takenRatePerKg: e.takenRatePerKg ? parseFloat(e.takenRatePerKg) : null,
        profit: e.profit ? parseFloat(e.profit) : null,
        notes: e.notes,
        runningKg: Number(runningKg.toFixed(3)),
        runningAmount: Number(runningAmount.toFixed(2))
      };
    });

    res.json({
      success: true,
      data: {
        customerName: name,
        customerType: type || (entries[0] ? entries[0].entryType : 'kharedi'),
        summary: {
          totalKg: Number(totalKg.toFixed(3)),
          totalAmount: Number(totalAmount.toFixed(2)),
          totalProfit: Number(totalProfit.toFixed(2)),
          avgRate: totalKg > 0 ? Number((totalAmount / totalKg).toFixed(2)) : 0,
          count: entries.length
        },
        entries: ledgerEntries
      }
    });
  } catch (error) {
    console.error('Error fetching customer ledger:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customer ledger' });
  }
};
