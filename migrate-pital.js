require('dotenv').config();
const { sequelize } = require('./config/database');

async function migratePitalSchema() {
  try {
    console.log('🔄 Checking and migrating pital_customers schema...');
    await sequelize.authenticate();
    console.log('✅ Connected to database: ' + process.env.DB_NAME);

    // 1. Check if pital_customers table exists
    const [tables] = await sequelize.query("SHOW TABLES LIKE 'pital_customers'");
    if (tables.length === 0) {
      console.log('ℹ️ Table pital_customers does not exist yet. It will be created on server start.');
      process.exit(0);
    }

    // 2. Check if customerType column exists
    const [columns] = await sequelize.query("SHOW COLUMNS FROM `pital_customers` LIKE 'customerType'");
    if (columns.length === 0) {
      console.log('➕ Adding column customerType to pital_customers...');
      await sequelize.query("ALTER TABLE `pital_customers` ADD COLUMN `customerType` ENUM('kharedi', 'veekhari') NOT NULL DEFAULT 'kharedi' AFTER `id`");
      console.log('✅ Added customerType column');
    } else {
      console.log('ℹ️ customerType column already exists');
    }

    // 3. Drop any old single-column unique index on name
    try {
      const [indices] = await sequelize.query("SHOW INDEX FROM `pital_customers` WHERE Column_name = 'name' AND Non_unique = 0");
      for (const idx of indices) {
        if (idx.Key_name !== 'PRIMARY' && idx.Key_name !== 'pital_customers_name_customer_type') {
          try {
            await sequelize.query(`ALTER TABLE \`pital_customers\` DROP INDEX \`${idx.Key_name}\``);
            console.log(`✅ Dropped old unique index: ${idx.Key_name}`);
          } catch (e) {
            // ignore
          }
        }
      }
    } catch (e) {
      // ignore
    }

    // 4. Ensure composite unique index exists
    try {
      await sequelize.query("ALTER TABLE `pital_customers` ADD UNIQUE INDEX `pital_customers_name_customer_type` (`name`, `customerType`)");
      console.log('✅ Added composite unique index on (name, customerType)');
    } catch (e) {
      if (e.message && e.message.includes('Duplicate key name')) {
        console.log('ℹ️ Index pital_customers_name_customer_type already exists');
      } else {
        console.warn('⚠️ Index note:', e.message);
      }
    }

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
  }
}

migratePitalSchema();

