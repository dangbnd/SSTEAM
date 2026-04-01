const fs = require('fs');
const path = require('path');

// Simple Node.js API handler
function handleViewTracking(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get slug from URL or body
        let slug = req.query.slug;
        if (!slug && req.body) {
            slug = req.body.slug;
        }
        
        if (!slug) {
            return res.status(400).json({ error: 'Slug is required' });
        }

        // Đường dẫn đến file database
        const dbPath = path.join(__dirname, '..', '..', 'data', 'tutorial-views.json');
        
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

// Export for different server types
if (typeof module !== 'undefined' && module.exports) {
    module.exports = handleViewTracking;
}

// For direct execution
if (require.main === module) {
    const http = require('http');
    const url = require('url');
    
    const server = http.createServer((req, res) => {
        const parsedUrl = url.parse(req.url, true);
        req.query = parsedUrl.query;
        
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                req.body = body ? JSON.parse(body) : {};
            } catch (e) {
                req.body = {};
            }
            handleViewTracking(req, res);
        });
    });
    
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
        console.log(`View tracking server running on port ${PORT}`);
    });
}
