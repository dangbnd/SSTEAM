let db = null;

function setPageRoutesDb(nextDb) {
    db = nextDb;
}

function registerPageRoutes(app, deps) {
    const { sendHtmlWithLayout } = deps;

    // ============================================================================
    // HTML ROUTES
    // ============================================================================
    
    // Serve news detail page
    app.get('/news/:slug', (req, res) => {
        return sendHtmlWithLayout(res, 'news-detail.html', req.path);
    });
    
    // Serve projects page
    app.get('/projects', (req, res) => {
        return sendHtmlWithLayout(res, 'projects.html', req.path);
    });
    
    // Serve project detail page
    app.get('/projects/:slug', (req, res) => {
        return sendHtmlWithLayout(res, 'project-detail.html', req.path);
    });
    
    // Serve tutorial detail page by slug
    app.get('/tutorials/:slug', async (req, res) => {
        try {
            if (!db) {
                return res.status(503).send('Database not connected');
            }

            const slug = req.params.slug;
            const tutorial = await db.collection('tutorials').findOne({ slug });
            if (!tutorial) {
                res.status(404);
                return sendHtmlWithLayout(res, '404.html', req.path);
            }
            return sendHtmlWithLayout(res, 'tutorial-detail.html', req.path);
        } catch (error) {
            console.error('Error resolving tutorial detail page:', error);
            return res.status(500).send('Internal Server Error');
        }
    });

    // Order detail route (for links from order history)
    app.get('/orders/:id', (req, res) => {
        return sendHtmlWithLayout(res, 'order.html', req.path);
    });
    
    // Serve common static pages with shared layout
    const STATIC_PAGE_ROUTES = {
        '/': 'index.html',
        '/admin': 'admin.html',
        '/admin-login': 'admin-login.html',
        '/news': 'news.html',
        '/news-layout': 'news-layout.html',
        '/products': 'products.html',
        '/tutorials': 'tutorials.html',
        '/courses': 'courses.html',
        '/resources': 'resources.html',
        '/about': 'about.html',
        '/contact': 'contact.html',
        '/login': 'login.html',
        '/register': 'register.html',
        '/forgot-password': 'forgot-password.html',
        '/terms': 'terms.html',
        '/privacy': 'privacy.html',
        '/profile': 'profile.html',
        '/orders': 'orders.html',
        '/order': 'order.html',
        '/cart': 'cart.html',
        '/search': 'search.html',
        '/404': '404.html',
    };
    
    Object.entries(STATIC_PAGE_ROUTES).forEach(([routePath, htmlFile]) => {
        app.get(routePath, (req, res) => sendHtmlWithLayout(res, htmlFile, req.path));
    });
    
    // API: get tutorial by slug
    app.get('/api/tutorials/slug/:slug', async (req, res) => {
        try {
            const slug = req.params.slug;
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }
    
            // Increment views and return the updated document
            const result = await db.collection('tutorials').findOneAndUpdate(
                { slug },
                { $inc: { views: 1 } },
                { returnDocument: 'after' }
            );
    
            const updatedTutorial = result && (result.value || result);
            if (!updatedTutorial || !updatedTutorial.value && !updatedTutorial._id) {
                return res.status(404).json({ error: 'Tutorial not found' });
            }
    
            // Handle different driver return shapes
            const tutorialDoc = updatedTutorial.value ? updatedTutorial.value : updatedTutorial;
            res.json(tutorialDoc);
        } catch (error) {
            console.error('Error fetching tutorial by slug:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    
}

module.exports = { registerPageRoutes, setPageRoutesDb };
