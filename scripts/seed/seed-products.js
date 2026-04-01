/*
 Seed sample products into MongoDB.
 - Ensures default product categories exist (upsert by slug)
 - Inserts/updates sample products (upsert by slug)
 Usage:
   node scripts/seed/seed-products.js
 Optional env:
   MONGO_URI=mongodb://localhost:27017 DB_NAME=stem_steam_education node scripts/seed/seed-products.js
*/

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/';
const DB_NAME = process.env.DB_NAME || 'stem_steam_education';

async function ensureCategories(db) {
	const categoriesCol = db.collection('categories');
	const now = new Date();
	const defaultCategories = [
		{
			name: 'Điện tử cơ bản',
			description: 'Các linh kiện điện tử cơ bản cho người mới bắt đầu',
			icon: '⚡',
			color: '#3B82F6',
			slug: 'dien-tu-co-ban',
			createdAt: now,
			updatedAt: now,
		},
		{
			name: 'Robot và tự động hóa',
			description: 'Bộ kit robot và thiết bị tự động hóa',
			icon: '🤖',
			color: '#10B981',
			slug: 'robot-va-tu-dong-hoa',
			createdAt: now,
			updatedAt: now,
		},
		{
			name: 'Lập trình và phát triển',
			description: 'Thiết bị và phần mềm lập trình',
			icon: '💻',
			color: '#8B5CF6',
			slug: 'lap-trinh-va-phat-trien',
			createdAt: now,
			updatedAt: now,
		},
		{
			name: 'Khoa học và thí nghiệm',
			description: 'Bộ thí nghiệm khoa học STEM',
			icon: '🔬',
			color: '#F59E0B',
			slug: 'khoa-hoc-va-thi-nghiem',
			createdAt: now,
			updatedAt: now,
		},
	];

	const slugToId = {};
	for (const category of defaultCategories) {
		await categoriesCol.updateOne(
			{ slug: category.slug },
			{ $setOnInsert: category },
			{ upsert: true }
		);
		const doc = await categoriesCol.findOne({ slug: category.slug });
		slugToId[category.slug] = doc && doc._id;
	}
	return slugToId;
}

function buildSampleProducts(slugToCategoryId) {
	const now = new Date();
	return [
		{
			slug: 'arduino-uno-r3',
			name: 'Arduino Uno R3',
			description:
				"Board Arduino Uno R3 chính hãng, phù hợp cho người mới học lập trình. Bao gồm 14 chân digital I/O, 6 chân analog input, USB connection và power jack.",
			shortDescription: 'Board Arduino Uno R3 chính hãng cho người mới học lập trình',
			price: 250000,
			currency: 'VND',
			image: 'arduino-uno.jpg',
			stock: 50,
			status: 'active',
			rating: 4.8,
			isFeatured: true,
			categoryId: slugToCategoryId['dien-tu-co-ban'],
			createdAt: now,
			updatedAt: now,
		},
		{
			slug: 'bo-kit-robot-mbot',
			name: 'Bộ kit robot mBot',
			description:
				'Bộ kit robot giáo dục mBot với nhiều tính năng thú vị. Dễ dàng lắp ráp và lập trình, phù hợp cho học sinh từ 8 tuổi trở lên.',
			shortDescription: 'Bộ kit robot giáo dục mBot dễ lắp ráp và lập trình',
			price: 1200000,
			currency: 'VND',
			image: 'mbot-kit.jpg',
			stock: 25,
			status: 'active',
			rating: 4.9,
			isFeatured: true,
			categoryId: slugToCategoryId['robot-va-tu-dong-hoa'],
			createdAt: now,
			updatedAt: now,
		},
		{
			slug: 'raspberry-pi-4-model-b',
			name: 'Raspberry Pi 4 Model B',
			description:
				'Máy tính mini Raspberry Pi 4 với hiệu năng cao. RAM 4GB, CPU quad-core 1.5GHz, hỗ trợ 4K video và nhiều cổng kết nối.',
			shortDescription: 'Máy tính mini Raspberry Pi 4 hiệu năng cao',
			price: 1800000,
			currency: 'VND',
			image: 'raspberry-pi-4.jpg',
			stock: 30,
			status: 'active',
			rating: 4.7,
			isFeatured: true,
			categoryId: slugToCategoryId['lap-trinh-va-phat-trien'],
			createdAt: now,
			updatedAt: now,
		},
		{
			slug: 'bo-thi-nghiem-hoa-hoc',
			name: 'Bộ thí nghiệm hóa học',
			description:
				'Bộ thí nghiệm hóa học an toàn cho học sinh. Bao gồm các dụng cụ cơ bản và hóa chất an toàn để thực hiện các thí nghiệm đơn giản.',
			shortDescription: 'Bộ thí nghiệm hóa học an toàn cho học sinh',
			price: 450000,
			currency: 'VND',
			image: 'chemistry-kit.jpg',
			stock: 40,
			status: 'active',
			rating: 4.6,
			isFeatured: false,
			categoryId: slugToCategoryId['khoa-hoc-va-thi-nghiem'],
			createdAt: now,
			updatedAt: now,
		},
		{
			slug: 'bo-37-cam-bien-arduino',
			name: 'Bộ 37 cảm biến Arduino',
			description:
				'Bộ 37 cảm biến Arduino đa dạng bao gồm cảm biến nhiệt độ, độ ẩm, ánh sáng, chuyển động và nhiều loại khác.',
			shortDescription: 'Bộ 37 cảm biến Arduino đa dạng',
			price: 350000,
			currency: 'VND',
			image: 'arduino-sensors.jpg',
			stock: 35,
			status: 'active',
			rating: 4.5,
			isFeatured: false,
			categoryId: slugToCategoryId['dien-tu-co-ban'],
			createdAt: now,
			updatedAt: now,
		},
		{
			slug: 'bo-kit-lap-trinh-scratch',
			name: 'Bộ kit lập trình Scratch',
			description:
				'Bộ kit lập trình Scratch với các khối lệnh vật lý, giúp trẻ em học lập trình một cách trực quan và thú vị.',
			shortDescription: 'Bộ kit lập trình Scratch cho trẻ em',
			price: 280000,
			currency: 'VND',
			image: 'scratch-kit.jpg',
			stock: 60,
			status: 'active',
			rating: 4.4,
			isFeatured: false,
			categoryId: slugToCategoryId['lap-trinh-va-phat-trien'],
			createdAt: now,
			updatedAt: now,
		},
	];
}

async function upsertProducts(db, products) {
	const productsCol = db.collection('products');
	let inserted = 0;
	for (const product of products) {
		const res = await productsCol.updateOne(
			{ slug: product.slug },
			{ $setOnInsert: product },
			{ upsert: true }
		);
		if (res.upsertedCount === 1) {
			inserted += 1;
			console.log(`✅ Inserted: ${product.name}`);
		} else {
			console.log(`ℹ️ Skipped (exists): ${product.name}`);
		}
	}
	return inserted;
}

async function main() {
	let client;
	try {
		console.log('🔌 Connecting to MongoDB...', MONGO_URI, DB_NAME);
		client = new MongoClient(MONGO_URI);
		await client.connect();
		const db = client.db(DB_NAME);

		console.log('🧭 Ensuring categories...');
		const slugToCategoryId = await ensureCategories(db);
		console.log('✅ Categories ready');

		console.log('📦 Preparing sample products...');
		const products = buildSampleProducts(slugToCategoryId);

		console.log('⬆️ Upserting products...');
		const inserted = await upsertProducts(db, products);

		const total = await db.collection('products').countDocuments();
		console.log(`🎉 Done. Inserted ${inserted} new products. Total products: ${total}`);
	} catch (error) {
		console.error('❌ Seed failed:', error);
		process.exitCode = 1;
	} finally {
		if (client) await client.close();
	}
}

main();
