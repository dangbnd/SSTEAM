import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { slug } = req.query;
        
        if (!slug) {
            return res.status(400).json({ error: 'Slug is required' });
        }

        // Đường dẫn đến file database
        const dbPath = path.join(process.cwd(), 'public', 'data', 'tutorial-views.json');
        
        // Đọc database hiện tại
        let db = { views: {}, lastUpdated: new Date().toISOString() };
        
        try {
            const dbContent = fs.readFileSync(dbPath, 'utf8');
            db = JSON.parse(dbContent);
        } catch (error) {
            // Nếu file không tồn tại, tạo mới
            console.log('Creating new database file');
        }

        // Tăng view count cho tutorial
        if (!db.views[slug]) {
            db.views[slug] = 0;
        }
        
        db.views[slug]++;
        db.lastUpdated = new Date().toISOString();

        // Lưu database
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

        console.log(`✅ View count incremented for tutorial: ${slug} (${db.views[slug]} views)`);

        return res.status(200).json({
            success: true,
            slug: slug,
            views: db.views[slug],
            message: 'View count incremented successfully'
        });

    } catch (error) {
        console.error('❌ Error incrementing view count:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
}
