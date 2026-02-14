const { ProductCustomer, ProductSale, ProductSaleItem, ProductTransaction, WholesaleProduct, sequelize } = require('../models');
const { Op } = require('sequelize');

// Get or create customer
exports.getOrCreateCustomer = async (req, res) => {
    try {
        const { name, phone, email, address, gstNumber } = req.body;

        let customer = await ProductCustomer.findOne({ where: { phone } });

        if (!customer) {
            customer = await ProductCustomer.create({
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

        const { count, rows } = await ProductCustomer.findAndCountAll({
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

        const customer = await ProductCustomer.findByPk(customerId);
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }

        const whereClause = { customerId };
        // FIX: Only apply date filter if both dates are present AND not empty strings
        if (startDate && endDate && startDate !== '' && endDate !== '') {
            whereClause.transactionDate = {
                [Op.between]: [startDate, endDate]
            };
        }

        const transactions = await ProductTransaction.findAll({
            where: whereClause,
            include: [
                {
                    model: ProductSale,
                    as: 'sale',
                    attributes: ['voucherNumber', 'saleDate', 'totalAmount', 'billingType']
                }
            ],
            order: [['transactionDate', 'ASC'], ['id', 'ASC']] // Added ID Sort for stable order
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

// Create Product Sale (LOGIC: SALE = JAMA/CREDIT = INCREASE BALANCE)
exports.createSale = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const {
            customerId,
            billingType,
            items,
            silverRate,
            paidAmount = 0, // This is technically "Debit" in this inverse logic if passed directly
            gstApplicable = false,
            cgstPercent = 1.5,
            sgstPercent = 1.5,
            notes,
            paymentDetails // Get full payment details including silver payments
        } = req.body;

        const customer = await ProductCustomer.findByPk(customerId);
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
        const lastSale = await ProductSale.findOne({
            where: { voucherNumber: { [Op.like]: `PB${dateStr}%` } }, // PB prefix for Product Bill
            order: [['voucherNumber', 'DESC']],
            transaction: t
        });

        let voucherNumber;
        if (lastSale) {
            const lastNum = parseInt(lastSale.voucherNumber.slice(-4));
            voucherNumber = `PB${dateStr}${String(lastNum + 1).padStart(4, '0')}`;
        } else {
            voucherNumber = `PB${dateStr}0001`;
        }

        // Calculations
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

            const silverWeight = ((touch + wastage) * netWeight) / 100;
            const laborCharges = (grossWeight / 1000) * laborRatePerKg;
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

        // Logic: Sale creates CREDIT (JAMA) -> INCREASES BALANCE
        const laborBalanceBefore = parseFloat(customer.balanceLabor || 0);
        const laborBalanceAfter = laborBalanceBefore + totalAmount;

        // Silver Ledger logic: If we track silver weight as credit too
        const silverBalanceBefore = parseFloat(customer.balanceSilver || 0);
        const silverBalanceAfter = silverBalanceBefore + totalSilverWeight;

        customer.balanceLabor = laborBalanceAfter;
        customer.balanceSilver = silverBalanceAfter;
        await customer.save({ transaction: t });

        const sale = await ProductSale.create({
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
            paidAmount: 0, // Initial creation has 0 paid
            balanceLabor: laborBalanceAfter,
            balanceSilver: silverBalanceAfter,
            previousBalanceLabor: laborBalanceBefore,
            previousBalanceSilver: silverBalanceBefore,
            notes,
            status: 'pending',
            createdBy: req.user.id
        }, { transaction: t });

        // Sale Items
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

        await ProductSaleItem.bulkCreate(saleItems, { transaction: t });

        // Create Transaction (Type: SALE = JAMA)
        await ProductTransaction.create({
            customerId,
            saleId: sale.id,
            type: 'sale',
            amount: totalAmount, // Positive adds to balance
            silverWeight: totalSilverWeight,
            balanceBefore: laborBalanceBefore,
            balanceAfter: laborBalanceAfter,
            balanceLaborBefore: laborBalanceBefore,
            balanceLaborAfter: laborBalanceAfter,
            balanceSilverBefore: silverBalanceBefore,
            balanceSilverAfter: silverBalanceAfter,
            createdBy: req.user.id
        }, { transaction: t });


        // Process Initial Payments if any
        if (paymentDetails) {
            // 1. Process Silver Payments
            if (paymentDetails.silverPayments && paymentDetails.silverPayments.length > 0) {
                // Fetch latest balances
                const cust = await ProductCustomer.findByPk(customerId, { transaction: t });
                let currentBalSilver = parseFloat(cust.balanceSilver);

                let totalPaidSilver = 0;
                for (const p of paymentDetails.silverPayments) {
                    totalPaidSilver += parseFloat(p.fine || 0);
                }

                if (totalPaidSilver > 0) {
                    const newBalSilver = currentBalSilver - totalPaidSilver;

                    await ProductTransaction.create({
                        customerId,
                        saleId: sale.id,
                        type: 'payment', // Silver Payment
                        silverWeight: -totalPaidSilver,
                        amount: 0,
                        balanceSilverBefore: currentBalSilver,
                        balanceSilverAfter: newBalSilver,
                        balanceLaborBefore: parseFloat(cust.balanceLabor),
                        balanceLaborAfter: parseFloat(cust.balanceLabor),
                        // balanceBefore: parseFloat(cust.balanceLabor), // Legacy compat field
                        // balanceAfter: parseFloat(cust.balanceLabor),
                        notes: 'Silver Payment with Sale',
                        createdBy: req.user.id
                    }, { transaction: t });

                    cust.balanceSilver = newBalSilver;
                    await cust.save({ transaction: t });
                }
            }

            // 2. Process Cash Payment
            const cashPaid = parseFloat(paymentDetails.cashPayment || 0);
            if (cashPaid > 0) {
                const cust = await ProductCustomer.findByPk(customerId, { transaction: t }); // Refetch for sequential accuracy
                const currentBalLabor = parseFloat(cust.balanceLabor);
                const newBalLabor = currentBalLabor - cashPaid;

                await ProductTransaction.create({
                    customerId,
                    saleId: sale.id,
                    type: 'payment',
                    amount: -cashPaid,
                    silverWeight: 0,
                    balanceLaborBefore: currentBalLabor,
                    balanceLaborAfter: newBalLabor,
                    balanceSilverBefore: parseFloat(cust.balanceSilver),
                    balanceSilverAfter: parseFloat(cust.balanceSilver),
                    //balanceBefore: currentBalLabor,
                    //balanceAfter: newBalLabor,
                    notes: 'Cash Payment with Sale',
                    createdBy: req.user.id
                }, { transaction: t });

                cust.balanceLabor = newBalLabor;
                await cust.save({ transaction: t });

                // Update Paid Amount on Sale
                await sale.update({ paidAmount: cashPaid }, { transaction: t });
            }

            // 3. Process Cash For Silver (Sell Silver for Cash)
            // Logic: This REDUCES Silver Balance (you gave silver) and INCREASES Labor Balance (it costs money? NO wait.)
            // Cash For Silver usually means Customer GIVES Silver to Seller in exchange for Cash.
            // OR Seller SELLS Silver to Customer for Cash.
            // If it's "Payment Mode", it usually means User (Seller) RECEIVED Cash for Silver.
            // Let's assume standard "Jama/Kharch" logic:
            // "Cash for Silver" in a Sale context usually means the Customer is giving partial Silver to cover the bill?
            // NO, the UI says "Cash for Silver (Sell Silver for Cash)".
            // If Seller Sells Silver -> Customer Silver Balance INCREASES (Debit? No Credit).
            // Customer Labor Balance also INCREASES (Debit).
            // But this is "Payment".

            // Defaulting to: This is a reduction of Silver Balance (Customer paid silver) converted to Cash Value?
            // Let's stick to simple Cash/Silver payments implemented above for now to ensure stability.
        }

        await t.commit();

        res.status(201).json({
            success: true,
            message: 'Product Bill created successfully',
            data: sale
        });

    } catch (error) {
        await t.rollback();
        console.error('Create product sale error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating product bill',
            error: error.message
        });
    }
};

// Get all sales
exports.getAllSales = async (req, res) => {
    try {
        const { customerId, startDate, endDate, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        const whereClause = {};
        if (customerId) whereClause.customerId = customerId;
        if (startDate && endDate) {
            whereClause.saleDate = { [Op.between]: [startDate, endDate] };
        }

        const { count, rows } = await ProductSale.findAndCountAll({
            where: whereClause,
            include: [{
                model: ProductCustomer,
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
        console.error('Get product sales error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching product sales',
            error: error.message
        });
    }
};

// Get Sale By ID (NEW - FIXES VIEW BUTTON)
exports.getSaleById = async (req, res) => {
    try {
        const { id } = req.params;
        const sale = await ProductSale.findByPk(id, {
            include: [
                {
                    model: ProductCustomer,
                    as: 'customer'
                },
                {
                    model: ProductSaleItem,
                    as: 'items'
                },
                {
                    model: ProductTransaction,
                    as: 'transactions' // To see history
                }
            ]
        });

        if (!sale) {
            return res.status(404).json({ success: false, message: 'Sale not found' });
        }

        res.json({
            success: true,
            data: sale
        });
    } catch (error) {
        console.error('Get sale details error:', error);
        res.status(500).json({ success: false, message: 'Error fetching sale details' });
    }
};

// Add Payment (LOGIC: PAYMENT = KHARCHA/DEBIT = DECREASE BALANCE)
exports.addPayment = async (req, res) => {
    const t = await sequelize.transaction();

    try {
        const { saleId } = req.params;
        const {
            amount = 0, // Cash Amount
            paidSilver = 0, // Silver Weight 
            paymentMode = 'cash',
            referenceNumber = '',
            notes = '',
            cashForSilver // { weight, rate }
        } = req.body;

        // Validation (At least one must be > 0)
        // Note: amount is already negative-capable logic below, but input should be positive
        if ((!amount || amount <= 0) && (!paidSilver || paidSilver <= 0) && (!cashForSilver || cashForSilver.weight <= 0)) {
            // allow if specifically handling logic
        }

        const sale = await ProductSale.findByPk(saleId, { transaction: t });
        if (!sale) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Sale not found' });
        }

        const customer = await ProductCustomer.findByPk(sale.customerId, { transaction: t });

        // 1. Handle Cash Payment
        if (parseFloat(amount) > 0) {
            const laborBalanceBefore = parseFloat(customer.balanceLabor || 0);
            const laborBalanceAfter = laborBalanceBefore - parseFloat(amount);

            await ProductTransaction.create({
                customerId: sale.customerId,
                saleId: sale.id,
                type: 'payment',
                amount: -parseFloat(amount), // Negative for payment
                paymentMode: 'cash',
                referenceNumber,
                balanceLaborBefore: laborBalanceBefore,
                balanceLaborAfter: laborBalanceAfter,
                balanceSilverBefore: parseFloat(customer.balanceSilver || 0),
                balanceSilverAfter: parseFloat(customer.balanceSilver || 0),
                //balanceBefore: laborBalanceBefore,
                //balanceAfter: laborBalanceAfter,
                notes: notes,
                createdBy: req.user?.id || 1
            }, { transaction: t });

            customer.balanceLabor = laborBalanceAfter;

            // Update Sale Paid Amount
            const newPaidAmount = parseFloat(sale.paidAmount || 0) + parseFloat(amount);
            await sale.update({ paidAmount: newPaidAmount }, { transaction: t });
        }

        // 2. Handle Silver Payment
        if (parseFloat(paidSilver) > 0) {
            const silverBalanceBefore = parseFloat(customer.balanceSilver || 0);
            const silverBalanceAfter = silverBalanceBefore - parseFloat(paidSilver);

            await ProductTransaction.create({
                customerId: sale.customerId,
                saleId: sale.id,
                type: 'payment',
                silverWeight: -parseFloat(paidSilver),
                paymentMode: 'silver',
                balanceSilverBefore: silverBalanceBefore,
                balanceSilverAfter: silverBalanceAfter,
                balanceLaborBefore: parseFloat(customer.balanceLabor || 0),
                balanceLaborAfter: parseFloat(customer.balanceLabor || 0),
                notes: notes + ' (Silver Payment)',
                createdBy: req.user?.id || 1
            }, { transaction: t });

            customer.balanceSilver = silverBalanceAfter;
        }

        // 3. Handle Cash For Silver (If implemented later)

        await customer.save({ transaction: t });
        await t.commit();

        res.json({
            success: true,
            message: 'Payment recorded successfully',
            data: { newBalanceLabor: customer.balanceLabor, newBalanceSilver: customer.balanceSilver }
        });

    } catch (error) {
        await t.rollback();
        console.error('Add payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Error recording payment',
            error: error.message
        });
    }
};
