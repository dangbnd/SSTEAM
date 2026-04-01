/*
 Seed sample tutorial categories and tutorials into MongoDB.
 - Ensures default tutorial categories exist (upsert by slug)
 - Inserts/updates sample tutorials (upsert by slug), linked to categories
 Usage:
   node scripts/seed/seed-tutorials.js
 Optional env:
   MONGO_URI=mongodb://localhost:27017 DB_NAME=stem_steam_education node scripts/seed/seed-tutorials.js
*/

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/';
const DB_NAME = process.env.DB_NAME || 'stem_steam_education';

async function ensureTutorialCategories(db) {
	const col = db.collection('tutorial_categories');
	const now = new Date();
	const categories = [
		{
			slug: 'lap-trinh-co-ban',
			name: 'Lập trình cơ bản',
			description: 'Học lập trình từ cơ bản đến nâng cao',
			level: 'beginner',
			subject: 'programming',
			icon: '📚',
			color: '#3B82F6',
			createdAt: now,
			updatedAt: now,
		},
		{
			slug: 'dien-tu-arduino',
			name: 'Điện tử Arduino',
			description: 'Hướng dẫn sử dụng Arduino cho dự án điện tử',
			level: 'intermediate',
			subject: 'electronics',
			icon: '⚡',
			color: '#10B981',
			createdAt: now,
			updatedAt: now,
		},
		{
			slug: 'robot-va-ai',
			name: 'Robot và AI',
			description: 'Xây dựng robot và ứng dụng trí tuệ nhân tạo',
			level: 'advanced',
			subject: 'robotics',
			icon: '🤖',
			color: '#8B5CF6',
			createdAt: now,
			updatedAt: now,
		},
		{
			slug: 'khoa-hoc-du-lieu',
			name: 'Khoa học dữ liệu',
			description: 'Phân tích dữ liệu và machine learning',
			level: 'advanced',
			subject: 'data-science',
			icon: '📊',
			color: '#F59E0B',
			createdAt: now,
			updatedAt: now,
		},
	];

	const slugToId = {};
	for (const cat of categories) {
		await col.updateOne(
			{ slug: cat.slug },
			{ $setOnInsert: cat },
			{ upsert: true }
		);
		const doc = await col.findOne({ slug: cat.slug });
		slugToId[cat.slug] = doc && doc._id;
	}
	return slugToId;
}

function buildSampleTutorials(slugToCategoryId) {
	const now = new Date();
	return [
		{
			slug: 'lam-quen-voi-scratch',
			title: 'Làm quen với Scratch',
			description: 'Hướng dẫn cơ bản về lập trình Scratch cho trẻ em. Học cách tạo nhân vật, phong cảnh và lập trình chuyển động cơ bản.',
			content: '1. Giới thiệu Scratch\n2. Tạo nhân vật/phong cảnh\n3. Lập trình chuyển động\n4. Sự kiện\n5. Game đơn giản',
			categoryId: slugToCategoryId['lap-trinh-co-ban'],
			difficulty: 'beginner',
			duration: 30,
			tags: ['scratch', 'lập trình cơ bản', 'trẻ em'],
			status: 'published',
			isFeatured: true,
			excerpt: 'Học lập trình Scratch từ cơ bản đến nâng cao',
			thumbnail: 'scratch-tutorial.jpg',
			viewCount: 1250,
			rating: 4.8,
			createdAt: now,
			updatedAt: now,
		},
		{
			slug: 'dieu-khien-led-voi-arduino',
			title: 'Điều khiển LED với Arduino',
			description: 'Hướng dẫn điều khiển LED đơn giản bằng Arduino. Học cách kết nối mạch và viết code điều khiển.',
			content: '1. Giới thiệu Arduino\n2. Kết nối mạch LED\n3. Viết code\n4. Hiệu ứng nhấp nháy\n5. Nhiều LED',
			categoryId: slugToCategoryId['dien-tu-arduino'],
			difficulty: 'intermediate',
			duration: 45,
			tags: ['arduino', 'led', 'điện tử'],
			status: 'published',
			isFeatured: true,
			excerpt: 'Học điều khiển LED với Arduino từ cơ bản',
			thumbnail: 'arduino-led.jpg',
			viewCount: 980,
			rating: 4.7,
			createdAt: now,
			updatedAt: now,
		},
		{
			slug: 'xay-dung-robot-don-gian',
			title: 'Xây dựng robot đơn giản',
			description: 'Hướng dẫn tạo robot cơ bản với mBot. Học cách lắp ráp và lập trình robot di chuyển.',
			content: '1. Giới thiệu mBot\n2. Lắp ráp\n3. Lập trình di chuyển\n4. Thêm cảm biến\n5. Dự án',
			categoryId: slugToCategoryId['robot-va-ai'],
			difficulty: 'intermediate',
			duration: 60,
			tags: ['robot', 'mbot', 'tự động hóa'],
			status: 'published',
			isFeatured: true,
			excerpt: 'Xây dựng robot đơn giản với mBot',
			thumbnail: 'mbot-robot.jpg',
			viewCount: 750,
			rating: 4.6,
			createdAt: now,
			updatedAt: now,
		},
		{
			slug: 'phan-tich-du-lieu-voi-python',
			title: 'Phân tích dữ liệu với Python',
			description: 'Hướng dẫn phân tích dữ liệu cơ bản sử dụng Python. Học cách xử lý và trực quan hóa dữ liệu.',
			content: '1. Python cơ bản\n2. Pandas/NumPy\n3. Xử lý dữ liệu\n4. Biểu đồ Matplotlib\n5. Thống kê',
			categoryId: slugToCategoryId['khoa-hoc-du-lieu'],
			difficulty: 'advanced',
			duration: 90,
			tags: ['python', 'dữ liệu', 'machine learning'],
			status: 'published',
			isFeatured: false,
			excerpt: 'Phân tích dữ liệu với Python từ cơ bản',
			thumbnail: 'python-data.jpg',
			viewCount: 620,
			rating: 4.5,
			createdAt: now,
			updatedAt: now,
		},
		{
			slug: 'lap-trinh-game-voi-scratch',
			title: 'Lập trình game với Scratch',
			description: 'Hướng dẫn tạo game đơn giản với Scratch. Học cách thiết kế game và lập trình logic.',
			content: '1. Nhân vật game\n2. Chuyển động\n3. Va chạm\n4. Điểm số\n5. Âm thanh',
			categoryId: slugToCategoryId['lap-trinh-co-ban'],
			difficulty: 'beginner',
			duration: 40,
			tags: ['scratch', 'game', 'lập trình'],
			status: 'published',
			isFeatured: false,
			excerpt: 'Tạo game đơn giản với Scratch',
			thumbnail: 'scratch-game.jpg',
			viewCount: 890,
			rating: 4.4,
			createdAt: now,
			updatedAt: now,
		},
		{
			slug: 'iot-voi-arduino-va-wifi',
			title: 'IoT với Arduino và WiFi',
			description: 'Hướng dẫn tạo dự án IoT đơn giản với Arduino. Kết nối cảm biến và gửi dữ liệu lên internet.',
			content: '1. Giới thiệu IoT\n2. WiFi với Arduino\n3. Đọc cảm biến\n4. Gửi dữ liệu cloud\n5. Dashboard',
			categoryId: slugToCategoryId['dien-tu-arduino'],
			difficulty: 'advanced',
			duration: 75,
			tags: ['arduino', 'iot', 'wifi', 'cảm biến'],
			status: 'published',
			isFeatured: false,
			excerpt: 'Tạo dự án IoT với Arduino và WiFi',
			thumbnail: 'arduino-iot.jpg',
			viewCount: 520,
			rating: 4.3,
			createdAt: now,
			updatedAt: now,
		},
	];
}

async function upsertTutorials(db, tutorials) {
	const col = db.collection('tutorials');
	let inserted = 0;
	for (const t of tutorials) {
		const res = await col.updateOne(
			{ slug: t.slug },
			{ $setOnInsert: t },
			{ upsert: true }
		);
		if (res.upsertedCount === 1) {
			inserted += 1;
			console.log(`✅ Inserted: ${t.title}`);
		} else {
			console.log(`ℹ️ Skipped (exists): ${t.title}`);
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

		console.log('🧭 Ensuring tutorial categories...');
		const slugToCategoryId = await ensureTutorialCategories(db);
		console.log('✅ Tutorial categories ready');

		console.log('📦 Preparing sample tutorials...');
		const tutorials = buildSampleTutorials(slugToCategoryId);

		console.log('⬆️ Upserting tutorials...');
		const inserted = await upsertTutorials(db, tutorials);

		const total = await db.collection('tutorials').countDocuments();
		console.log(`🎉 Done. Inserted ${inserted} new tutorials. Total tutorials: ${total}`);
	} catch (error) {
		console.error('❌ Seed failed:', error);
		process.exitCode = 1;
	} finally {
		if (client) await client.close();
	}
}

main();
