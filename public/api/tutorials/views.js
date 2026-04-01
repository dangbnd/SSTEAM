import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Đường dẫn đến file database
        const dbPath = path.join(process.cwd(), 'public', 'data', 'tutorial-views.json');
        
        // Đọc database hiện tại
        let db = { views: {}, lastUpdated: new Date().toISOString() };
        
        try {
            const dbContent = fs.readFileSync(dbPath, 'utf8');
            db = JSON.parse(dbContent);
        } catch (error) {
            // Nếu file không tồn tại, trả về empty object
            return res.status(200).json({
                views: {},
                lastUpdated: new Date().toISOString(),
                message: 'No views found'
            });
        }

        return res.status(200).json({
            views: db.views,
            lastUpdated: db.lastUpdated,
            totalTutorials: Object.keys(db.views).length,
            totalViews: Object.values(db.views).reduce((sum, count) => sum + count, 0)
        });

    } catch (error) {
        console.error('❌ Error getting all view counts:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
}
