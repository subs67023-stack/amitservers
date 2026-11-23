const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const { sequelize } = require('./config/database');
const { testConnection } = require('./config/database');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const adminRoutes = require('./routes/adminRoutes');
const billingRoutes = require('./routes/billingRoutes');
const regularBillingRoutes = require('./routes/regularBillingRoutes');
const wholesaleJamaKharchRoutes = require('./routes/wholesaleJamaKharchRoutes');
const regularJamaKharchRoutes = require('./routes/regularJamaKharchRoutes');
const wholesaleBullenRoutes = require('./routes/wholesaleBullenRoutes');
const regularBullenRoutes = require('./routes/regularBullenRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const salaryRoutes = require('./routes/salaryRoutes');

const bakiTransactionRoutes = require('./routes/bakiTransactionRoutes');
const gstBillingRoutes = require('./routes/gstBillingRoutes');
const productBillingRoutes = require('./routes/productBillingRoutes');
const productionBatchRoutes = require('./routes/productionBatchRoutes');
const pitalKaamRoutes = require('./routes/pitalKaamRoutes');


const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: [process.env.CLIENT_URL, 'https://sbasilvers.vercel.app'].filter(Boolean),
  credentials: true
}));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'Server is running!',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/regular-billing', regularBillingRoutes);
app.use('/api/wholesale-jama-kharch', wholesaleJamaKharchRoutes);
app.use('/api/regular-jama-kharch', regularJamaKharchRoutes);
// Register routes
app.use('/api/wholesale-bullen', wholesaleBullenRoutes);
app.use('/api/regular-bullen', regularBullenRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/salaries', salaryRoutes);

app.use('/api/baki-transactions', bakiTransactionRoutes);
app.use('/api/gst-billing', gstBillingRoutes);
app.use('/api/product-billing', productBillingRoutes);
app.use('/api/production-batches', productionBatchRoutes);
app.use('/api/pital-kaam', pitalKaamRoutes);


app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await testConnection();

    // Auto-migrate pital_customers schema if table exists without customerType
    try {
      const [colRows] = await sequelize.query("SHOW COLUMNS FROM `pital_customers` LIKE 'customerType'");
      if (colRows.length === 0) {
        console.log('🔄 Adding customerType column to pital_customers table...');
        try {
          const [indexRows] = await sequelize.query("SHOW INDEX FROM `pital_customers` WHERE Column_name = 'name' AND Non_unique = 0");
          for (const row of indexRows) {
            if (row.Key_name !== 'PRIMARY' && row.Key_name !== 'pital_customers_name_customer_type') {
              try {
                await sequelize.query(`ALTER TABLE \`pital_customers\` DROP INDEX \`${row.Key_name}\``);
              } catch (_) {}
            }
          }
        } catch (_) {}
        await sequelize.query("ALTER TABLE `pital_customers` ADD COLUMN `customerType` ENUM('kharedi', 'veekhari') NOT NULL DEFAULT 'kharedi' AFTER `id`");
        console.log('✅ Added customerType column to pital_customers');
      }
    } catch (_) {
      // Table doesn't exist yet, sync will create it with all columns
    }

    await sequelize.sync();
    console.log('✅ Database tables synchronized');

    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🔗 API Base: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();