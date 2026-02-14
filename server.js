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


const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: 'http://localhost:5173',
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
    await sequelize.sync({ alter: true });
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