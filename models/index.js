const { sequelize } = require('../config/database');
const User = require('./User');
const Product = require('./Product');
const Category = require('./Category');
const Customer = require('./Customer');
const SilverRate = require('./SilverRate');
const Sale = require('./Sale');
const SaleItem = require('./SaleItem');
const Transaction = require('./Transaction');
const WholesaleProduct = require('./WholesaleProduct');
const Producer = require('./Producer'); // NEW

// Regular Billing Models
const RegularCustomer = require('./RegularCustomer');
const RegularSale = require('./RegularSale');
const RegularSaleItem = require('./RegularSaleItem');
const RegularTransaction = require('./RegularTransaction');
const SilverPaymentItem = require('./SilverPaymentItem'); // ← NEW: ADD THIS LINE
const WholesaleBullen = require('./WholesaleBullen');
const RegularBullen = require('./RegularBullen');
const Employee = require('./Employee');
const Salary = require('./Salary');
const BakiTransaction = require('./BakiTransaction');
const SilverTakenRecord = require('./SilverTakenRecord');
// GST Billing Models
const GSTCustomer = require('./GSTCustomer');
const GSTBill = require('./GSTBill');
const GSTBillItem = require('./GSTBillItem');

// ========================================
// ASSOCIATIONS
// ========================================

// Category <-> Product
Category.hasMany(Product, {
  foreignKey: 'categoryId',
  as: 'products'
});
Product.belongsTo(Category, {
  foreignKey: 'categoryId',
  as: 'category'
});

// Wholesale System Relationships
Customer.hasMany(Sale, {
  foreignKey: 'customerId',
  as: 'sales'
});
Sale.belongsTo(Customer, {
  foreignKey: 'customerId',
  as: 'customer'
});
Sale.hasMany(SaleItem, {
  foreignKey: 'saleId',
  as: 'items',
  onDelete: 'CASCADE'
});
SaleItem.belongsTo(Sale, {
  foreignKey: 'saleId',
  as: 'sale'
});
WholesaleProduct.hasMany(SaleItem, {
  foreignKey: 'productId',
  as: 'saleItems'
});
SaleItem.belongsTo(WholesaleProduct, {
  foreignKey: 'productId',
  as: 'product'
});
// Producer <-> WholesaleProduct
Producer.hasMany(WholesaleProduct, {
  foreignKey: 'producerId',
  as: 'products'
});
WholesaleProduct.belongsTo(Producer, {
  foreignKey: 'producerId',
  as: 'producer'
});

Customer.hasMany(Transaction, {
  foreignKey: 'customerId',
  as: 'transactions'
});
Transaction.belongsTo(Customer, {
  foreignKey: 'customerId',
  as: 'customer'
});
Sale.hasMany(Transaction, {
  foreignKey: 'saleId',
  as: 'transactions'
});
Transaction.belongsTo(Sale, {
  foreignKey: 'saleId',
  as: 'sale'
});
User.hasMany(Sale, {
  foreignKey: 'createdBy',
  as: 'salesCreated'
});
Sale.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator'
});
User.hasMany(Transaction, {
  foreignKey: 'createdBy',
  as: 'transactionsCreated'
});
Transaction.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator'
});

// === REGULAR BILLING SYSTEM (WITH CUSTOMER) ==== //
RegularCustomer.hasMany(RegularSale, {
  foreignKey: 'regularCustomerId',
  as: 'sales'
});
RegularSale.belongsTo(RegularCustomer, {
  foreignKey: 'regularCustomerId',
  as: 'customer'
});

RegularSale.hasMany(RegularSaleItem, {
  foreignKey: 'regularSaleId',
  as: 'items',
  onDelete: 'CASCADE'
});
RegularSaleItem.belongsTo(RegularSale, {
  foreignKey: 'regularSaleId',
  as: 'sale'
});

Product.hasMany(RegularSaleItem, {
  foreignKey: 'productId',
  as: 'regularSaleItems'
});
RegularSaleItem.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product'
});

RegularSale.hasMany(RegularTransaction, {
  foreignKey: 'regularSaleId',
  as: 'transactions'
});
RegularTransaction.belongsTo(RegularSale, {
  foreignKey: 'regularSaleId',
  as: 'sale'
});

RegularCustomer.hasMany(RegularTransaction, {
  foreignKey: 'regularCustomerId',
  as: 'transactions'
});
RegularTransaction.belongsTo(RegularCustomer, {
  foreignKey: 'regularCustomerId',
  as: 'customer'
});

// ========================================
// NEW: SILVER PAYMENT ITEM ASSOCIATIONS
// ========================================
RegularSale.hasMany(SilverPaymentItem, {
  foreignKey: 'regularSaleId',
  as: 'silverPayments',
  onDelete: 'CASCADE'
});

SilverPaymentItem.belongsTo(RegularSale, {
  foreignKey: 'regularSaleId',
  as: 'sale'
});

RegularTransaction.hasMany(SilverPaymentItem, {
  foreignKey: 'regularTransactionId',
  as: 'silverPayments',
  onDelete: 'SET NULL'
});

SilverPaymentItem.belongsTo(RegularTransaction, {
  foreignKey: 'regularTransactionId',
  as: 'transaction'
});
// ========================================

// Employee & Salary
Employee.hasMany(Salary, {
  foreignKey: 'employeeId',
  as: 'salaries',
  onDelete: 'CASCADE'
});

Salary.belongsTo(Employee, {
  foreignKey: 'employeeId',
  as: 'Employee'
});

// Employee & BakiTransaction
Employee.hasMany(BakiTransaction, {
  foreignKey: 'employeeId',
  as: 'bakiTransactions',
  onDelete: 'CASCADE'
});

BakiTransaction.belongsTo(Employee, {
  foreignKey: 'employeeId',
  as: 'Employee'
});

// ========================================
// GST BILLING ASSOCIATIONS
// ========================================
GSTCustomer.hasMany(GSTBill, {
  foreignKey: 'customerId',
  as: 'bills'
});
GSTBill.belongsTo(GSTCustomer, {
  foreignKey: 'customerId',
  as: 'customer'
});

GSTBill.hasMany(GSTBillItem, {
  foreignKey: 'billId',
  as: 'items',
  onDelete: 'CASCADE'
});
GSTBillItem.belongsTo(GSTBill, {
  foreignKey: 'billId',
  as: 'bill'
});

module.exports = {
  sequelize,
  User,
  Product,
  Category,
  Customer,
  SilverRate,
  Sale,
  SaleItem,
  Transaction,
  Producer, // NEW

  // Regular billing
  RegularCustomer,
  RegularSale,
  RegularSaleItem,
  RegularTransaction,
  SilverPaymentItem, // ← NEW: ADD THIS LINE
  WholesaleBullen,
  RegularBullen,
  Employee,
  Salary,
  BakiTransaction,
  SilverTakenRecord,
  WholesaleProduct,
  // GST Billing
  GSTCustomer,
  GSTBill,
  GSTBillItem
};
