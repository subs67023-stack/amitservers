require('dotenv').config();
const { sequelize, Category, User, Product, Customer, SilverRate } = require('./models');

async function seedProduction() {
    try {
        console.log('🚀 Starting production seed...');

        // Ensure tables exist
        await sequelize.sync({ alter: true });

        // 1. Seed Categories
        console.log('\n📦 Seeding Categories...');
        const categories = [
            { name: 'LADIES', displayOrder: 1, description: 'Elegant silver jewelry designed for women', isActive: true },
            { name: 'GENTS', displayOrder: 2, description: 'Sophisticated silver pieces for men', isActive: true },
            { name: 'LORDS', displayOrder: 3, description: 'Exquisite craftsmanship for the elite', isActive: true }
        ];

        const categoryMap = {};
        for (const catData of categories) {
            const [cat] = await Category.findOrCreate({
                where: { name: catData.name },
                defaults: catData
            });
            categoryMap[cat.name] = cat.id;
        }
        console.log('✅ Categories synced');

        // 2. Seed Users
        console.log('\n👤 Seeding Users...');
        const users = [
            { firstName: 'Admin', lastName: 'User', email: 'admin@argentum.com', password: 'admin123', role: 'admin', phone: '+1234567890' },
            { firstName: 'John', lastName: 'Doe', email: 'john@example.com', password: 'user123', role: 'user', phone: '+1234567891' },
            { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', password: 'user123', role: 'user', phone: '+1234567892' }
        ];

        for (const userData of users) {
            await User.findOrCreate({
                where: { email: userData.email },
                defaults: userData
            });
        }
        console.log('✅ Users synced');

        // 3. Seed Products (Only if empty for simplicity, or check by SKU if exists)
        // For now, checks if ANY products exist for the category, if not adds them
        console.log('\n💍 Seeding Products...');

        // Sample product data (subset)
        const products = [
            { name: "Orion's Tear - Silver Ring", category: 'LADIES', price: 42.00, silverWeight: 8.5, sku: 'LAD-RING-001' },
            { name: 'Executive Watch Band Ring', category: 'GENTS', price: 89.00, silverWeight: 15.7, sku: 'GEN-RING-001' },
            { name: 'Dragon Guardian Pendant', category: 'LORDS', price: 120.00, silverWeight: 28.5, sku: 'LOR-PEND-001' }
        ];

        for (const prodData of products) {
            const catId = categoryMap[prodData.category];
            if (catId) {
                await Product.findOrCreate({
                    where: { sku: prodData.sku },
                    defaults: {
                        ...prodData,
                        categoryId: catId,
                        description: `Description for ${prodData.name}`,
                        stock: 10,
                        images: [],
                        isActive: true
                    }
                });
            }
        }
        console.log('✅ Products synced');

        // 4. Seed Billing Data
        console.log('\n💰 Seeding Billing Data...');
        const customers = [
            { name: 'RAJ AVATE', phone: '8421091966', email: 'raj.avate@example.com', address: 'Rajkot, Gujarat' },
            { name: 'Priya Sharma', phone: '9876543210', email: 'priya.sharma@example.com', address: 'Mumbai, Maharashtra' }
        ];

        for (const custData of customers) {
            await Customer.findOrCreate({
                where: { phone: custData.phone },
                defaults: custData
            });
        }
        console.log('✅ Customers synced');

        console.log('\n✅ Production seed completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Production seed failed:', error);
        process.exit(1);
    }
}

seedProduction();
