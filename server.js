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

app.get('/', (req, res) => {
  res.send('Server is running');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
  // Bind to 0.0.0.0 and listen immediately so Render port scan detects open port without delay
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT} (0.0.0.0)`);
    console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  });

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
    } catch (e) {
      console.log('ℹ️ pital_customers check:', e.message);
    }

    // Auto-migrate salaries schema if table exists without addToBaki
    try {
      const [colRows] = await sequelize.query("SHOW COLUMNS FROM `salaries` LIKE 'addToBaki'");
      if (colRows.length === 0) {
        console.log('🔄 Adding addToBaki column to salaries table...');
        await sequelize.query("ALTER TABLE `salaries` ADD COLUMN `addToBaki` TINYINT(1) NOT NULL DEFAULT 0 AFTER `advance`");
        console.log('✅ Added addToBaki column to salaries');
      }
    } catch (e) {
      console.log('ℹ️ salaries check:', e.message);
    }

    // Auto-migrate pital_entries schema if table exists without items
    try {
      const [colRows] = await sequelize.query("SHOW COLUMNS FROM `pital_entries` LIKE 'items'");
      if (colRows.length === 0) {
        console.log('🔄 Adding items column to pital_entries table...');
        await sequelize.query("ALTER TABLE `pital_entries` ADD COLUMN `items` JSON NULL AFTER `notes`");
        console.log('✅ Added items column to pital_entries');
      }
    } catch (e) {
      console.log('ℹ️ pital_entries check:', e.message);
    }

    // Auto-migrate wholesale_products schema if stamp or stoneWeight missing
    try {
      const [colStamp] = await sequelize.query("SHOW COLUMNS FROM `wholesale_products` LIKE 'stamp'");
      if (colStamp.length === 0) {
        console.log('🔄 Adding stamp column to wholesale_products table...');
        await sequelize.query("ALTER TABLE `wholesale_products` ADD COLUMN `stamp` VARCHAR(100) DEFAULT '-' AFTER `touch`");
        console.log('✅ Added stamp column to wholesale_products');
      }
    } catch (e) {
      console.log('ℹ️ wholesale_products stamp check:', e.message);
    }

    try {
      const [colStone] = await sequelize.query("SHOW COLUMNS FROM `wholesale_products` LIKE 'stoneWeight'");
      if (colStone.length === 0) {
        console.log('🔄 Adding stoneWeight column to wholesale_products table...');
        await sequelize.query("ALTER TABLE `wholesale_products` ADD COLUMN `stoneWeight` DECIMAL(10,3) DEFAULT 0 AFTER `grossWeight`");
        console.log('✅ Added stoneWeight column to wholesale_products');
      }
    } catch (e) {
      console.log('ℹ️ wholesale_products stoneWeight check:', e.message);
    }

    // Auto-migrate sale_items schema if stamp column missing
    try {
      const [colSaleStamp] = await sequelize.query("SHOW COLUMNS FROM `sale_items` LIKE 'stamp'");
      if (colSaleStamp.length === 0) {
        console.log('🔄 Adding stamp column to sale_items table...');
        await sequelize.query("ALTER TABLE `sale_items` ADD COLUMN `stamp` VARCHAR(100) DEFAULT '-' AFTER `description`");
        console.log('✅ Added stamp column to sale_items');
      }
    } catch (e) {
      console.log('ℹ️ sale_items stamp check:', e.message);
    }

    await sequelize.sync();
    console.log('✅ Database tables synchronized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
};

startServer();