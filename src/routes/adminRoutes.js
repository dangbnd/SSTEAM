let db = null;

function setAdminDb(nextDb) {
    db = nextDb;
}

function registerAdminRoutes(app, deps) {
    const {
        ObjectId,
        jwt,
        JWT_SECRET,
        authenticateAdmin,
        upload,
        convertImageUrlToWebp,
        sendHtmlWithLayout,
    } = deps;
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    // ============================================================================
    // ADMIN ROUTES
    // ============================================================================

    // Admin login
    app.post('/api/admin/login', async (req, res) => {
        try {
            if (!adminUsername || !adminPassword) {
                return res.status(503).json({
                    error: 'Admin credentials are not configured on server',
                });
            }

            const { username, password } = req.body;

            // Validate admin credentials from environment
            if (username === adminUsername && password === adminPassword) {
                const token = jwt.sign(
                    {
                        id: 'admin-001',
                        username: adminUsername,
                        role: 'admin',
                        fullName: 'Administrator'
                    },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );

                res.json({
                    token,
                    user: {
                        id: 'admin-001',
                        username: adminUsername,
                        role: 'admin',
                        fullName: 'Administrator'
                    }
                });
            } else {
                res.status(401).json({ error: 'Invalid login credentials' });
            }
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    });

    // Create product
    app.post('/api/admin/products', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            const {
                name, slug, description, fullDescription, categoryId, price, originalPrice,
                sku, stock, weight, dimensions, images, features, tags, isActive,
                metaTitle, metaDescription, keywords
            } = req.body;

            if (!name || !slug || price === undefined || price === null || !categoryId || !description) {
                return res.status(400).json({
                    error: 'Có lỗi xảy ra',
                    missing: {
                        name: !name,
                        slug: !slug,
                        price: price === undefined || price === null,
                        categoryId: !categoryId,
                        description: !description
                    }
                });
            }

            // Check if slug already exists
            const existingProduct = await db.collection('products').findOne({ slug });
            if (existingProduct) {
                return res.status(409).json({ error: 'Có lỗi xảy ra' });
            }

            const productData = {
                name: String(name).trim(),
                slug: String(slug).trim(),
                description: String(description).trim(),
                fullDescription: fullDescription || '',
                categoryId: ObjectId.isValid(categoryId) ? new ObjectId(categoryId) : categoryId,
                price: parseFloat(price),
                originalPrice: originalPrice ? parseFloat(originalPrice) : parseFloat(price),
                sku: sku || '',
                stock: parseInt(stock) || 0,
                weight: weight ? parseFloat(weight) : null,
                dimensions: dimensions || null,
                images: images || [],
                features: features || '',
                tags: tags || [],
                isActive: isActive !== false,
                metaTitle: metaTitle || '',
                metaDescription: metaDescription || '',
                keywords: keywords || [],
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await db.collection('products').insertOne(productData);
            console.log('Admin action', result.insertedId);
            res.status(201).json({
                message: 'Thao tác thành công',
                productId: result.insertedId
            });

        } catch (error) {
            console.error('Error creating product:', error);
            res.status(500).json({ error: 'Failed to create product' });
        }
    });

    // Fix product slug (for legacy data issues)
    app.patch('/api/admin/products/:id/fix-slug', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            const { id } = req.params;
            const { slug } = req.body;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({ error: 'Có lỗi xảy ra' });
            }

            if (!slug || typeof slug !== 'string' || slug.trim() === '') {
                return res.status(400).json({ error: 'Có lỗi xảy ra' });
            }

            const cleanSlug = slug.trim();

            // Check if new slug already exists for another product
            const existingProduct = await db.collection('products').findOne({
                slug: cleanSlug,
                _id: { $ne: new ObjectId(id) }
            });

            if (existingProduct) {
                return res.status(409).json({ error: 'Có lỗi xảy ra' });
            }

            // Update the product slug
            const result = await db.collection('products').updateOne(
                { _id: new ObjectId(id) },
                {
                    $set: {
                        slug: cleanSlug,
                        updatedAt: new Date()
                    }
                }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ error: 'Có lỗi xảy ra' });
            }

            console.log('Admin action', { id, slug: cleanSlug });
            res.json({
                message: 'Thao tác thành công',
                slug: cleanSlug
            });

        } catch (error) {
            console.error('Error fixing product slug:', error);
            res.status(500).json({ error: 'Có lỗi xảy ra' });
        }
    });

    // Update product
    app.put('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            const productId = req.params.id;
            console.log('Admin action', productId);

            let query;
            if (ObjectId.isValid(productId)) {
                query = { _id: new ObjectId(productId) };
            } else {
                query = { _id: productId };
            }

            const updateData = { ...req.body, updatedAt: new Date() };
            // Normalize images: convert any non-webp url to webp and replace in-place
            if (Array.isArray(updateData.images)) {
                const total = updateData.images.length;
                const webpCount = updateData.images.filter(u => typeof u === 'string' && u.toLowerCase().endsWith('.webp')).length;

                const newImages = [];
                for (const imgUrl of updateData.images) {
                    try {
                        if (typeof imgUrl === 'string' && !imgUrl.toLowerCase().endsWith('.webp')) {
                            const newUrl = await convertImageUrlToWebp(imgUrl);
                            newImages.push(newUrl);
                        } else {
                            newImages.push(imgUrl);
                        }
                    } catch (e) {

                        newImages.push(imgUrl);
                    }
                }
                updateData.images = newImages;

            } else {

            }
            delete updateData._id; // Remove _id from update data

            const result = await db.collection('products').updateOne(query, { $set: updateData });

            if (result.matchedCount === 0) {
                return res.status(404).json({ error: 'Product not found' });
            }

            console.log('Admin action');
            res.json({ message: 'Thao tác thành công' });

        } catch (error) {
            console.error('Error updating product:', error);
            res.status(500).json({ error: 'Failed to update product' });
        }
    });

    // Delete product
    app.delete('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            const productId = req.params.id;
            let query;

            if (ObjectId.isValid(productId)) {
                query = { _id: new ObjectId(productId) };
            } else {
                query = { _id: productId };
            }

            const result = await db.collection('products').deleteOne(query);

            if (result.deletedCount === 0) {
                return res.status(404).json({ error: 'Product not found' });
            }

            console.log('Admin action');
            res.json({ message: 'Thao tác thành công' });

        } catch (error) {
            console.error('Error deleting product:', error);
            res.status(500).json({ error: 'Failed to delete product' });
        }
    });

    // Admin Categories API
    app.get('/api/admin/categories', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            const categories = await db.collection('categories').find({}).toArray();

            // Count products in each category
            for (let category of categories) {
                const productCount = await db.collection('products').countDocuments({ categoryId: category._id });
                category.productCount = productCount;
            }

            res.json(categories);
        } catch (error) {
            console.error('Get categories error:', error);
            res.status(500).json({ error: 'Có lỗi xảy ra' });
        }
    });

    app.post('/api/admin/categories', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            const { name, description, slug, icon } = req.body;

            if (!name || !slug) {
                return res.status(400).json({ error: 'Có lỗi xảy ra' });
            }

            // Check if slug already exists
            const existingCategory = await db.collection('categories').findOne({ slug });
            if (existingCategory) {
                return res.status(500).json({ error: 'Có lỗi xảy ra' });
            }

            const category = {
                name,
                description: description || '',
                slug,
                icon: icon || '📁',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await db.collection('categories').insertOne(category);
            category._id = result.insertedId;

            res.status(201).json(category);
        } catch (error) {
            console.error('Create category error:', error);
            res.status(500).json({ error: 'Có lỗi xảy ra' });
        }
    });

    app.put('/api/admin/categories/:id', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            const { id } = req.params;
            const { name, description, slug, icon } = req.body;

            if (!name || !slug) {
                return res.status(400).json({ error: 'Có lỗi xảy ra' });
            }

            // Check if slug already exists (excluding current category)
            const existingCategory = await db.collection('categories').findOne({
                slug,
                _id: { $ne: new ObjectId(id) }
            });
            if (existingCategory) {
                return res.status(500).json({ error: 'Có lỗi xảy ra' });
            }

            const updateData = {
                name,
                description: description || '',
                slug,
                icon: icon || '📁',
                updatedAt: new Date()
            };

            const result = await db.collection('categories').updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ error: 'Category not found' });
            }

            res.json({ success: true, message: 'Category updated successfully' });
        } catch (error) {
            console.error('Update category error:', error);
            res.status(500).json({ error: 'Có lỗi xảy ra' });
        }
    });

    app.delete('/api/admin/categories/:id', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            const { id } = req.params;

            // Check if category has products
            const productCount = await db.collection('products').countDocuments({ categoryId: id });
            if (productCount > 0) {
                return res.status(400).json({ error: 'Có lỗi xảy ra' });
            }

            const result = await db.collection('categories').deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount === 0) {
                return res.status(404).json({ error: 'Có lỗi xảy ra' });
            }

            res.json({ message: 'Thao tác thành công' });
        } catch (error) {
            console.error('Delete category error:', error);
            res.status(500).json({ error: 'Có lỗi xảy ra' });
        }
    });

    // ===== TUTORIAL CATEGORIES ADMIN API =====

    // Create tutorial category
    app.post('/api/admin/tutorial-categories', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            const { name, description, slug, icon, color, level, subject, sortOrder, requirements, isActive } = req.body;

            if (!name || !slug) {
                return res.status(400).json({ error: 'Có lỗi xảy ra' });
            }

            // Check if slug already exists
            const existingCategory = await db.collection('tutorial_categories').findOne({ slug });
            if (existingCategory) {
                return res.status(400).json({ error: 'Có lỗi xảy ra' });
            }

            const newCategory = {
                name,
                description: description || '',
                slug,
                icon: icon || '📁',
                color: color || '#4CAF50',
                level: level || 'beginner',
                subject: subject || 'programming',
                sortOrder: sortOrder || 0,
                requirements: requirements || '',
                isActive: isActive !== undefined ? isActive : true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await db.collection('tutorial_categories').insertOne(newCategory);

            res.status(201).json({
                message: 'Thao tác thành công',
                category: { ...newCategory, _id: result.insertedId }
            });

        } catch (error) {
            console.error('Error creating tutorial category:', error);
            res.status(500).json({ error: 'Có lỗi xảy ra' });
        }
    });

    // Update tutorial category
    app.put('/api/admin/tutorial-categories/:id', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            const { id } = req.params;
            const { name, description, slug, icon, color, level, subject, sortOrder, requirements, isActive } = req.body;

            if (!name || !slug) {
                return res.status(400).json({ error: 'Có lỗi xảy ra' });
            }

            // Check if slug already exists (excluding current category)
            const existingCategory = await db.collection('tutorial_categories').findOne({
                slug,
                _id: { $ne: new ObjectId(id) }
            });
            if (existingCategory) {
                return res.status(400).json({ error: 'Có lỗi xảy ra' });
            }

            const updateData = {
                name,
                description: description || '',
                slug,
                icon: icon || '📁',
                color: color || '#4CAF50',
                level: level || 'beginner',
                subject: subject || 'programming',
                sortOrder: sortOrder || 0,
                requirements: requirements || '',
                isActive: isActive !== undefined ? isActive : true,
                updatedAt: new Date()
            };

            const result = await db.collection('tutorial_categories').updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ error: 'Có lỗi xảy ra' });
            }

            res.json({ message: 'Thao tác thành công' });

        } catch (error) {
            console.error('Error updating tutorial category:', error);
            res.status(500).json({ error: 'Có lỗi xảy ra' });
        }
    });

    // Delete tutorial category
    app.delete('/api/admin/tutorial-categories/:id', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            const { id } = req.params;

            // Check if category has tutorials
            const tutorialCount = await db.collection('tutorials').countDocuments({ categoryId: id });
            if (tutorialCount > 0) {
                return res.status(400).json({ error: 'Có lỗi xảy ra' });
            }

            const result = await db.collection('tutorial_categories').deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount === 0) {
                return res.status(404).json({ error: 'Có lỗi xảy ra' });
            }

            res.json({ message: 'Thao tác thành công' });

        } catch (error) {
            console.error('Error deleting tutorial category:', error);
            res.status(500).json({ error: 'Có lỗi xảy ra' });
        }
    });

    // ===== TUTORIALS ADMIN API =====

    // Create tutorial
    app.post('/api/admin/tutorials', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            const {
                title,
                content,
                author,
                categoryId,
                slug,
                description,
                difficulty,
                duration,
                tags,
                isPublished,
                featuredImage,
                videoUrl,
                attachments,
                seo
            } = req.body;

            if (!title || !content || !author) {
                return res.status(400).json({ error: 'Có lỗi xảy ra' });
            }

            // Generate slug if not provided
            let finalSlug = slug;
            if (!finalSlug) {
                finalSlug = title
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-')
                    .trim();
            }

            // Check if slug already exists
            const existingTutorial = await db.collection('tutorials').findOne({ slug: finalSlug });
            if (existingTutorial) {
                return res.status(400).json({ error: 'Có lỗi xảy ra' });
            }

            const newTutorial = {
                title,
                content,
                author,
                categoryId: categoryId || null,
                slug: finalSlug,
                description: description || '',
                difficulty: difficulty || 'beginner',
                duration: duration || 0,
                tags: tags || [],
                isPublished: isPublished !== undefined ? isPublished : false,
                featuredImage: featuredImage || '',
                videoUrl: videoUrl || '',
                attachments: attachments || [],
                seo: seo || { title: '', description: '', keywords: [], canonical: '', ogTitle: '', ogDescription: '', ogImage: '' },
                views: 0,
                likes: 0,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await db.collection('tutorials').insertOne(newTutorial);

            res.status(201).json({
                message: 'Thao tác thành công',
                tutorial: { ...newTutorial, _id: result.insertedId }
            });

        } catch (error) {
            console.error('Error creating tutorial:', error);
            res.status(500).json({ error: 'Có lỗi xảy ra' });
        }
    });

    // Update tutorial
    app.put('/api/admin/tutorials/:id', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            const { id } = req.params;
            const {
                title,
                content,
                author,
                categoryId,
                slug,
                description,
                difficulty,
                duration,
                tags,
                isPublished,
                featuredImage,
                videoUrl,
                attachments,
                seo
            } = req.body;

            if (!title || !content || !author) {
                return res.status(400).json({ error: 'Có lỗi xảy ra' });
            }

            // Check if slug already exists (excluding current tutorial)
            if (slug) {
                const existingTutorial = await db.collection('tutorials').findOne({
                    slug,
                    _id: { $ne: new ObjectId(id) }
                });
                if (existingTutorial) {
                    return res.status(400).json({ error: 'Có lỗi xảy ra' });
                }
            }

            const updateData = {
                title,
                content,
                author,
                categoryId: categoryId || null,
                slug: slug || '',
                description: description || '',
                difficulty: difficulty || 'beginner',
                duration: duration || 0,
                tags: tags || [],
                isPublished: isPublished !== undefined ? isPublished : false,
                featuredImage: featuredImage || '',
                videoUrl: videoUrl || '',
                attachments: attachments || [],
                seo: seo || { title: '', description: '', keywords: [], canonical: '', ogTitle: '', ogDescription: '', ogImage: '' },
                updatedAt: new Date()
            };

            const result = await db.collection('tutorials').updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ error: 'Có lỗi xảy ra' });
            }

            res.json({ message: 'Thao tác thành công' });

        } catch (error) {
            console.error('Error updating tutorial:', error);
            res.status(500).json({ error: 'Có lỗi xảy ra' });
        }
    });

    // Delete tutorial
    app.delete('/api/admin/tutorials/:id', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            const { id } = req.params;

            const result = await db.collection('tutorials').deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount === 0) {
                return res.status(404).json({ error: 'Có lỗi xảy ra' });
            }

            res.json({ message: 'Thao tác thành công' });

        } catch (error) {
            console.error('Error deleting tutorial:', error);
            res.status(500).json({ error: 'Có lỗi xảy ra' });
        }
    });

    // ============================================================================
    // TUTORIAL CATEGORIES API
    // ============================================================================

    // Get all tutorial categories
    app.get('/api/tutorial-categories', async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            const categories = await db.collection('tutorial_categories')
                .find({ isActive: { $ne: false } })
                .sort({ sortOrder: 1, name: 1 })
                .toArray();

            res.json(categories);

        } catch (error) {
            console.error('Error fetching tutorial categories:', error);
            res.status(500).json({ error: 'Failed to fetch tutorial categories' });
        }
    });

    // Get all tutorial categories (admin)
    app.get('/api/admin/tutorial-categories', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            const categories = await db.collection('tutorial_categories')
                .find({})
                .sort({ sortOrder: 1, name: 1 })
                .toArray();

            res.json(categories);

        } catch (error) {
            console.error('Error fetching tutorial categories for admin:', error);
            res.status(500).json({ error: 'Failed to fetch tutorial categories' });
        }
    });

    // Image upload API
    app.post('/api/admin/upload-image', authenticateAdmin, upload.single('image'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'Có lỗi xảy ra' });
            }

            // Return the URL of the uploaded image
            const imageUrl = `/uploads/${req.file.filename}`;
            res.json({
                message: 'Thao tác thành công',
                url: imageUrl,
                filename: req.file.filename
            });

        } catch (error) {
            console.error('Error uploading image:', error);
            res.status(500).json({ error: 'Có lỗi xảy ra' });
        }
    });

    // Admin Stats API
    app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            const stats = {
                products: 0,
                categories: 0,
                tutorialCategories: 0,
                tutorials: 0,
                projects: 0,
                users: 0,
                orders: 0
            };

            // Count products
            try {
                stats.products = await db.collection('products').countDocuments();
            } catch (e) {
                console.log('Products collection not found');
            }

            // Count categories
            try {
                stats.categories = await db.collection('categories').countDocuments();
            } catch (e) {
                console.log('Categories collection not found');
            }

            // Count tutorial categories
            try {
                stats.tutorialCategories = await db.collection('tutorial_categories').countDocuments();
            } catch (e) {
                console.log('Tutorial categories collection not found');
            }

            // Count news categories
            try {
                stats.newsCategories = await db.collection('news_categories').countDocuments();
            } catch (e) {
                console.log('News categories collection not found');
            }

            // Count tutorials
            try {
                stats.tutorials = await db.collection('tutorials').countDocuments();
            } catch (e) {
                console.log('Tutorials collection not found');
            }

            // Count projects
            try {
                stats.projects = await db.collection('projects').countDocuments({
                    isActive: { $ne: false }
                });
            } catch (e) {
                console.log('Projects count error');
            }

            // Count users
            try {
                stats.users = await db.collection('users').countDocuments();
            } catch (e) {
                console.log('Users collection not found');
            }

            // Count orders
            try {
                stats.orders = await db.collection('orders').countDocuments();
            } catch (e) {
                console.log('Orders collection not found');
            }

            res.json(stats);
        } catch (error) {
            console.error('Stats error:', error);
            res.status(500).json({ error: 'Có lỗi xảy ra' });
        }
    });

    // Admin Upload Icon API
    app.post('/api/admin/upload-icon', authenticateAdmin, upload.single('icon'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            // Return the file URL
            const fileUrl = `/uploads/${req.file.filename}`;
            res.json({
                success: true,
                url: fileUrl,
                filename: req.file.filename
            });

        } catch (error) {
            console.error('Upload icon error:', error);
            res.status(500).json({ error: 'Failed to upload icon' });
        }
    });

    // Admin Projects API
    app.get('/api/admin/projects', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            const projects = await db.collection('projects').find({
                isActive: { $ne: false }
            }).toArray();

            res.json(projects);
        } catch (error) {
            console.error('Error fetching projects:', error);
            res.status(500).json({ error: 'Failed to fetch projects' });
        }
    });

    // Public: Get project by slug
    app.get('/api/projects/slug/:slug', async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }
            const { slug } = req.params;
            const project = await db.collection('projects').findOne({ slug, isActive: { $ne: false } });
            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }
            res.json(project);
        } catch (error) {
            console.error('Error fetching project by slug:', error);
            res.status(500).json({ error: 'Failed to fetch project' });
        }
    });

    // ===== Admin News API =====
    // List news (admin)
    app.get('/api/admin/news', authenticateAdmin, async (req, res) => {
        try {
            if (!db) return res.status(500).json({ error: 'Database not connected' });
            const items = await db.collection('news').find({}).sort({ createdAt: -1 }).toArray();

            // Add category names
            for (let item of items) {
                if (item.categoryId) {
                    try {
                        const category = await db.collection('news_categories').findOne({ _id: new ObjectId(item.categoryId) });
                        if (category) {
                            item.categoryName = category.name;
                        }
                    } catch (e) {
                        console.log('Could not fetch category name for news:', item._id);
                    }
                }
            }

            res.json(items);
        } catch (error) {
            console.error('Error fetching admin news:', error);
            res.status(500).json({ error: 'Failed to fetch news' });
        }
    });

    // Get single news (admin)
    app.get('/api/admin/news/:id', authenticateAdmin, async (req, res) => {
        try {
            if (!db) return res.status(500).json({ error: 'Database not connected' });
            const { id } = req.params;
            const item = await db.collection('news').findOne({ _id: new ObjectId(id) });
            if (!item) return res.status(404).json({ error: 'News not found' });
            res.json(item);
        } catch (error) {
            console.error('Error fetching news item:', error);
            res.status(500).json({ error: 'Failed to fetch news item' });
        }
    });

    // Create news (admin)
    app.post('/api/admin/news', authenticateAdmin, async (req, res) => {
        try {
            if (!db) return res.status(500).json({ error: 'Database not connected' });
            const { title, slug, excerpt, content, categoryId, author, image, tags, status, isFeatured, seo } = req.body;
            if (!title || !content) return res.status(400).json({ error: 'Có lỗi xảy ra' });

            // Generate slug if not provided
            const finalSlug = slug || (title || '').toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-+|-+$/g, '');

            const item = {
                title,
                slug: finalSlug,
                excerpt: excerpt || '',
                content,
                categoryId: categoryId || null,
                author: author || 'Admin',
                image: image || '',
                tags: Array.isArray(tags) ? tags : [],
                status: status || 'draft',
                isFeatured: Boolean(isFeatured),
                seo: seo || {
                    title: '',
                    description: '',
                    keywords: [],
                    canonical: '',
                    ogTitle: '',
                    ogDescription: '',
                    ogImage: ''
                },
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const result = await db.collection('news').insertOne(item);
            res.status(201).json({ message: 'Thao tác thành công', news: { ...item, _id: result.insertedId } });
        } catch (error) {
            console.error('Error creating news:', error);
            res.status(500).json({ error: 'Failed to create news' });
        }
    });

    // Update news (admin)
    app.put('/api/admin/news/:id', authenticateAdmin, async (req, res) => {
        try {
            if (!db) return res.status(500).json({ error: 'Database not connected' });
            const { id } = req.params;
            const { title, slug, excerpt, content, categoryId, author, image, tags, status, isFeatured, seo } = req.body;
            if (!title || !content) return res.status(400).json({ error: 'Có lỗi xảy ra' });

            const update = {
                title,
                slug: slug || title.toLowerCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-+|-+$/g, ''),
                excerpt: excerpt || '',
                content,
                categoryId: categoryId || null,
                author: author || 'Admin',
                image: image || '',
                tags: Array.isArray(tags) ? tags : [],
                status: status || 'draft',
                isFeatured: Boolean(isFeatured),
                seo: seo || {
                    title: '',
                    description: '',
                    keywords: [],
                    canonical: '',
                    ogTitle: '',
                    ogDescription: '',
                    ogImage: ''
                },
                updatedAt: new Date(),
            };
            const result = await db.collection('news').updateOne({ _id: new ObjectId(id) }, { $set: update });
            if (!result.matchedCount) return res.status(404).json({ error: 'News not found' });
            res.json({ message: 'Thao tác thành công' });
        } catch (error) {
            console.error('Error updating news:', error);
            res.status(500).json({ error: 'Failed to update news' });
        }
    });

    // Delete news (admin)
    app.delete('/api/admin/news/:id', authenticateAdmin, async (req, res) => {
        try {
            if (!db) return res.status(500).json({ error: 'Database not connected' });
            const { id } = req.params;
            const result = await db.collection('news').deleteOne({ _id: new ObjectId(id) });
            if (!result.deletedCount) return res.status(404).json({ error: 'News not found' });
            res.json({ message: 'Thao tác thành công' });
        } catch (error) {
            console.error('Error deleting news:', error);
            res.status(500).json({ error: 'Failed to delete news' });
        }
    });
    // Serve project detail page for pretty URLs
    app.get('/project-detail/:slug', (req, res) => {
        return sendHtmlWithLayout(res, 'project-detail.html', req.path);
    });

    // Get single project by ID
    app.get('/api/admin/projects/:id', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            const { id } = req.params;
            const project = await db.collection('projects').findOne({ _id: new ObjectId(id) });

            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            res.json(project);
        } catch (error) {
            console.error('Error fetching project:', error);
            res.status(500).json({ error: 'Failed to fetch project' });
        }
    });

    // Create new project
    app.post('/api/admin/projects', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            const { name, description, shortDescription, duration, link, category, level, price, slug: providedSlug, tags, seo } = req.body;

            if (!name || !description) {
                return res.status(400).json({ error: 'Có lỗi xảy ra' });
            }

            // Generate slug from provided value or name
            const baseForSlug = (providedSlug && String(providedSlug).trim()) || name;
            const slug = baseForSlug.toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-+|-+$/g, '');

            const project = {
                name,
                description,
                shortDescription: shortDescription || '',
                duration: duration || '2-4 tuần',
                link: link || '',
                category: category || 'Dự án STEAM',
                level: level || 'beginner',
                price: price || 0,
                slug,
                tags: Array.isArray(tags) ? tags : [],
                seo: seo || { title: '', description: '', keywords: [], canonical: '', ogTitle: '', ogDescription: '', ogImage: '' },
                featured: true,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await db.collection('projects').insertOne(project);

            res.status(201).json({
                message: 'Thao tác thành công',
                project: { ...project, _id: result.insertedId }
            });

        } catch (error) {
            console.error('Error creating project:', error);
            res.status(500).json({ error: 'Failed to create project' });
        }
    });

    // Update project
    app.put('/api/admin/projects/:id', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            const { id } = req.params;
            const { name, description, shortDescription, duration, link, category, level, price, slug: providedSlug, tags, seo } = req.body;

            if (!name || !description) {
                return res.status(400).json({ error: 'Có lỗi xảy ra' });
            }

            // Generate slug from provided value or name
            const baseForSlug = (providedSlug && String(providedSlug).trim()) || name;
            const slug = baseForSlug.toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-+|-+$/g, '');

            const updateData = {
                name,
                description,
                shortDescription: shortDescription || '',
                duration: duration || '2-4 tuần',
                link: link || '',
                category: category || 'Dự án STEAM',
                level: level || 'beginner',
                price: price || 0,
                slug,
                tags: Array.isArray(tags) ? tags : [],
                seo: seo || { title: '', description: '', keywords: [], canonical: '', ogTitle: '', ogDescription: '', ogImage: '' },
                updatedAt: new Date()
            };

            const result = await db.collection('projects').updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ error: 'Có lỗi xảy ra' });
            }

            res.json({
                message: 'Thao tác thành công',
                project: { ...updateData, _id: id }
            });

        } catch (error) {
            console.error('Error updating project:', error);
            res.status(500).json({ error: 'Failed to update project' });
        }
    });

    // Delete project
    app.delete('/api/admin/projects/:id', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            const { id } = req.params;

            const result = await db.collection('projects').deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount === 0) {
                return res.status(404).json({ error: 'Có lỗi xảy ra' });
            }

            res.json({
                message: 'Thao tác thành công'
            });

        } catch (error) {
            console.error('Error deleting project:', error);
            res.status(500).json({ error: 'Failed to delete project' });
        }
    });

    // Admin Products API
    app.get('/api/admin/products', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            const products = await db.collection('products').find({}).toArray();

            // Add category names to products
            for (let product of products) {
                if (product.categoryId) {
                    try {
                        const category = await db.collection('categories').findOne({
                            _id: ObjectId.isValid(product.categoryId) ? new ObjectId(product.categoryId) : product.categoryId
                        });
                        if (category) {
                            product.categoryName = category.name;
                        }
                    } catch (e) {
                        console.log('Category not found for product:', product._id);
                    }
                }
            }

            res.json(products);
        } catch (error) {
            console.error('Get products error:', error);
            res.status(500).json({ error: 'Có lỗi xảy ra' });
        }
    });

    // Get single product by ID
    app.get('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            const { id } = req.params;
            const product = await db.collection('products').findOne({ _id: new ObjectId(id) });

            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }

            res.json(product);
        } catch (error) {
            console.error('Get product by ID error:', error);
            res.status(500).json({ error: 'Có lỗi xảy ra' });
        }
    });

    // ============================================================================
    // USER MANAGEMENT API ENDPOINTS
    // ============================================================================

    // Get all users (for admin-main)
    app.get('/api/users', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            const users = await db.collection('users').find({}, {
                projection: {
                    password: 0, // Exclude password from response
                    emailVerificationToken: 0,
                    resetPasswordToken: 0,
                    resetPasswordExpires: 0
                }
            }).toArray();

            res.json({ users });
        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).json({ error: 'Có lỗi xảy ra' });
        }
    });

    // Create new user
    app.post('/api/users', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            const { username, email, password, role, fullName, phone } = req.body;

            // Validate required fields
            if (!username || !email || !password) {
                return res.status(400).json({ error: 'Có lỗi xảy ra' });
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ error: 'Có lỗi xảy ra' });
            }

            // Check if user already exists
            const existingUser = await db.collection('users').findOne({
                $or: [{ email }, { username }]
            });
            if (existingUser) {
                return res.status(409).json({ error: 'Có lỗi xảy ra' });
            }

            // Hash password
            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // Create user object
            const userData = {
                username: username.trim(),
                email: email.toLowerCase().trim(),
                password: hashedPassword,
                role: role || 'user',
                fullName: fullName ? fullName.trim() : '',
                phone: phone ? phone.trim() : '',
                status: 'active',
                isActive: true,
                isEmailVerified: false,
                profile: {
                    avatar: '',
                    bio: '',
                    interests: [],
                    location: '',
                    website: ''
                },
                preferences: {
                    language: 'vi',
                    theme: 'light',
                    notifications: {
                        email: true,
                        push: true,
                        sms: false
                    }
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Insert user into database
            const result = await db.collection('users').insertOne(userData);

            // Remove password from response
            delete userData.password;
            userData._id = result.insertedId;

            console.log('Admin action', userData.email);

            res.status(201).json({
                message: 'Thao tác thành công',
                user: userData
            });

        } catch (error) {
            console.error('Create user error:', error);
            res.status(500).json({ error: 'Có lỗi xảy ra' });
        }
    });

    // Update user
    app.put('/api/users/:id', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            const { id } = req.params;
            const { username, email, password, role, fullName, phone, status } = req.body;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({ error: 'Có lỗi xảy ra' });
            }

            // Build update object
            const updateData = {
                username: username ? username.trim() : undefined,
                email: email ? email.toLowerCase().trim() : undefined,
                role: role || undefined,
                fullName: fullName ? fullName.trim() : undefined,
                phone: phone ? phone.trim() : undefined,
                status: status || undefined,
                updatedAt: new Date()
            };

            // Hash password if provided
            if (password && password.trim()) {
                const saltRounds = 12;
                updateData.password = await bcrypt.hash(password, saltRounds);
            }

            // Remove undefined values
            Object.keys(updateData).forEach(key => {
                if (updateData[key] === undefined) {
                    delete updateData[key];
                }
            });

            // Update user
            const result = await db.collection('users').updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({ error: 'Có lỗi xảy ra' });
            }

            console.log('Admin action', id);

            res.json({
                message: 'Thao tác thành công',
                modified: result.modifiedCount > 0
            });

        } catch (error) {
            console.error('Update user error:', error);
            res.status(500).json({ error: 'Có lỗi xảy ra' });
        }
    });

    // Delete user
    app.delete('/api/users/:id', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            const { id } = req.params;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({ error: 'Có lỗi xảy ra' });
            }

            // Check if user exists
            const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
            if (!user) {
                return res.status(404).json({ error: 'Có lỗi xảy ra' });
            }

            // Prevent deleting admin users (optional security measure)
            if (user.role === 'admin') {
                return res.status(403).json({ error: 'Có lỗi xảy ra' });
            }

            // Delete user
            const result = await db.collection('users').deleteOne({ _id: new ObjectId(id) });

            console.log('Admin action', user.email);

            res.json({
                message: 'Thao tác thành công',
                deleted: result.deletedCount > 0
            });

        } catch (error) {
            console.error('Delete user error:', error);
            res.status(500).json({ error: 'Có lỗi xảy ra' });
        }
    });

    // Get user by ID
    app.get('/api/users/:id', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            const { id } = req.params;

            // Validate ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({ error: 'Có lỗi xảy ra' });
            }

            const user = await db.collection('users').findOne(
                { _id: new ObjectId(id) },
                {
                    projection: {
                        password: 0,
                        emailVerificationToken: 0,
                        resetPasswordToken: 0,
                        resetPasswordExpires: 0
                    }
                }
            );

            if (!user) {
                return res.status(404).json({ error: 'Có lỗi xảy ra' });
            }

            res.json({ user });

        } catch (error) {
            console.error('Get user by ID error:', error);
            res.status(500).json({ error: 'Có lỗi xảy ra' });
        }
    });

    // Admin Users API (Legacy - for existing admin.html)
    app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            const users = await db.collection('users').find({}).toArray();
            res.json(users);
        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).json({ error: 'Có lỗi xảy ra' });
        }
    });

    // Admin Token Verification
    app.get('/api/admin/verify-token', authenticateAdmin, (req, res) => {
        res.json({
            valid: true,
            user: req.user,
            message: 'Thao tác thành công'
        });
    });

    // ============================================================================
    // TEST ENDPOINT
    // ============================================================================

    // Simple test endpoint to verify server is working
    app.get('/api/test', (req, res) => {
        res.json({
            message: 'Server is working!',
            timestamp: new Date().toISOString(),
            endpoints: [
                '/api/products',
                '/api/categories',
                '/api/tutorial-categories',
                '/api/news/featured',
                '/api/tutorials/featured',
                '/api/courses/featured'
            ]
        });
    });

}

module.exports = { registerAdminRoutes, setAdminDb };
