const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/';
const DB_NAME = process.env.DB_NAME || 'stem_steam_education';

async function seedTutorialCategories() {
    const client = new MongoClient(MONGO_URI);
    
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db(DB_NAME);
        
        // Sample tutorial categories
        const categories = [
            {
                name: 'Lập trình Arduino',
                description: 'Học lập trình với Arduino từ cơ bản đến nâng cao',
                slug: 'lap-trinh-arduino',
                icon: '🔧',
                color: '#3b82f6',
                level: 'beginner',
                subject: 'programming',
                sortOrder: 1,
                requirements: 'Kiến thức cơ bản về điện tử',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Robot và IoT',
                description: 'Xây dựng robot thông minh và hệ thống IoT',
                slug: 'robot-va-iot',
                icon: '🤖',
                color: '#10b981',
                level: 'intermediate',
                subject: 'robotics',
                sortOrder: 2,
                requirements: 'Kiến thức Arduino cơ bản',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Trí tuệ nhân tạo',
                description: 'Machine Learning và AI với Python',
                slug: 'tri-tue-nhan-tao',
                icon: '🧠',
                color: '#f59e0b',
                level: 'advanced',
                subject: 'ai',
                sortOrder: 3,
                requirements: 'Kiến thức Python cơ bản',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Điện tử cơ bản',
                description: 'Nguyên lý điện tử và mạch điện',
                slug: 'dien-tu-co-ban',
                icon: '⚡',
                color: '#ef4444',
                level: 'beginner',
                subject: 'electronics',
                sortOrder: 4,
                requirements: 'Không yêu cầu kiến thức trước',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Khoa học dữ liệu',
                description: 'Phân tích dữ liệu và visualization',
                slug: 'khoa-hoc-du-lieu',
                icon: '📊',
                color: '#8b5cf6',
                level: 'intermediate',
                subject: 'math',
                sortOrder: 5,
                requirements: 'Kiến thức toán học cơ bản',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Thiết kế 3D',
                description: 'Thiết kế và in 3D với CAD',
                slug: 'thiet-ke-3d',
                icon: '🎨',
                color: '#06b6d4',
                level: 'beginner',
                subject: 'engineering',
                sortOrder: 6,
                requirements: 'Không yêu cầu kiến thức trước',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];
        
        // Check if categories already exist
        const existingCount = await db.collection('tutorial_categories').countDocuments();
        
        if (existingCount > 0) {
            console.log(`ℹ️ Tutorial categories already exist (${existingCount} categories)`);
            console.log('📋 Existing categories:');
            const existing = await db.collection('tutorial_categories').find({}).toArray();
            existing.forEach(cat => {
                console.log(`   - ${cat.name} (${cat.slug})`);
            });
            return;
        }
        
        // Insert categories
        const result = await db.collection('tutorial_categories').insertMany(categories);
        console.log(`✅ Inserted ${result.insertedCount} tutorial categories`);
        
        // Display inserted categories
        console.log('📋 Inserted categories:');
        categories.forEach(cat => {
            console.log(`   - ${cat.name} (${cat.slug}) - ${cat.icon} ${cat.color}`);
        });
        
    } catch (error) {
        console.error('❌ Error seeding tutorial categories:', error);
    } finally {
        await client.close();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the seed function
if (require.main === module) {
    seedTutorialCategories()
        .then(() => {
            console.log('🎉 Tutorial categories seeding completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Seeding failed:', error);
            process.exit(1);
        });
}

module.exports = { seedTutorialCategories };
