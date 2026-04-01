import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
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
            // Nếu file không tồn tại, trả về 0
            return res.status(200).json({
                slug: slug,
                views: 0,
                message: 'No views found'
            });
        }

        const views = db.views[slug] || 0;

        return res.status(200).json({
            slug: slug,
            views: views,
            lastUpdated: db.lastUpdated
        });

    } catch (error) {
        console.error('❌ Error getting view count:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
}
