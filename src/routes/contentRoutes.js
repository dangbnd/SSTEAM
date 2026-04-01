let db = null;

function setContentDb(nextDb) {
    db = nextDb;
}

function registerContentRoutes(app, deps) {
    const {
        ObjectId,
        authenticateAdmin,
    } = deps;

    // ============================================================================
    // PUBLIC ROUTES
    // ============================================================================
    
    // Get all products (public — only active)
    app.get('/api/products', async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }
    
            const { categoryId, limit, exclude } = req.query;
            let query = { isActive: { $ne: false } };
    
            if (categoryId) {
                if (ObjectId.isValid(categoryId)) {
                    query.categoryId = { 
                        $in: [new ObjectId(categoryId), categoryId] 
                    };
                } else {
                    query.categoryId = categoryId;
                }
            }
    
            if (exclude && ObjectId.isValid(exclude)) {
                query._id = { $ne: new ObjectId(exclude) };
            }
    
            let products = db.collection('products').find(query);
    
            if (limit) {
                products = products.limit(parseInt(limit));
            }
    
            const result = await products.toArray();
            res.json(result);
    
        } catch (error) {
            console.error('Error fetching products:', error);
            res.status(500).json({ error: 'Failed to fetch products' });
        }
    });
    
    // Get product by ID (public — only active)
    app.get('/api/products/:id', async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }
            
            const productId = req.params.id;
            
            let product;
            try {
                if (ObjectId.isValid(productId)) {
                    product = await db.collection('products').findOne({ _id: new ObjectId(productId), isActive: { $ne: false } });
                }
                
                if (!product) {
                    product = await db.collection('products').findOne({ _id: productId, isActive: { $ne: false } });
                }
                
                if (!product) {
                    product = await db.collection('products').findOne({ slug: productId, isActive: { $ne: false } });
                }
            } catch (findError) {
                console.error('Error finding product:', findError);
            }
            
            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }
            
            // Get category name if categoryId exists
            if (product.categoryId) {
                try {
                    const category = await db.collection('categories').findOne({ 
                        _id: ObjectId.isValid(product.categoryId) ? new ObjectId(product.categoryId) : product.categoryId
                    });
                    if (category) {
                        product.categoryName = category.name;
                    }
                } catch (categoryError) {
                    console.error('Error fetching category:', categoryError);
                }
            }
            
            res.json(product);
            
        } catch (error) {
            console.error('Error fetching product by ID:', error);
            res.status(500).json({ error: 'Failed to fetch product' });
        }
    });
    
    // Get product by slug (public — only active)
    app.get('/api/products/slug/:slug', async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }
            
            const slug = req.params.slug;
            
            const product = await db.collection('products').findOne({ slug: slug, isActive: { $ne: false } });
            
            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }
            
            // Get category name if categoryId exists
            if (product.categoryId) {
                try {
                    const category = await db.collection('categories').findOne({ 
                        _id: ObjectId.isValid(product.categoryId) ? new ObjectId(product.categoryId) : product.categoryId
                    });
                    if (category) {
                        product.categoryName = category.name;
                    }
                } catch (categoryError) {
                    console.error('Error fetching category:', categoryError);
                }
            }
            
            res.json(product);
            
        } catch (error) {
            console.error('Error fetching product by slug:', error);
            res.status(500).json({ error: 'Failed to fetch product' });
        }
    });
    
    // Get all categories
    app.get('/api/categories', async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }
    
            const categoriesCollection = db.collection('categories');
            const categoryCount = await categoriesCollection.countDocuments();
            
            if (categoryCount === 0) {
                const sampleCategories = [
                    {
                        name: 'Điện tử cơ bản',
                        description: 'Các linh kiện điện tử cơ bản cho người mới bắt đầu',
                        icon: '⚡',
                        color: '#3B82F6',
                        slug: 'dien-tu-co-ban',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    },
                    {
                        name: 'Robot và tự động hóa',
                        description: 'Bộ kit robot và thiết bị tự động hóa',
                        icon: '🤖',
                        color: '#10B981',
                        slug: 'robot-va-tu-dong-hoa',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    },
                    {
                        name: 'Lập trình và phát triển',
                        description: 'Thiết bị và phần mềm lập trình',
                        icon: '💻',
                        color: '#8B5CF6',
                        slug: 'lap-trinh-va-phat-trien',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    },
                    {
                        name: 'Khoa học và thí nghiệm',
                        description: 'Bộ thí nghiệm khoa học STEM',
                        icon: '🔬',
                        color: '#F59E0B',
                        slug: 'khoa-hoc-va-thi-nghiem',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                ];
                
                await categoriesCollection.insertMany(sampleCategories);
                console.log('✅ Sample categories initialized');
            }
    
            const categories = await categoriesCollection.find({}).toArray();
            res.json(categories);
    
        } catch (error) {
            console.error('Error fetching categories:', error);
            res.json([]);
        }
    });
    
    // Get featured products
    app.get('/api/products/featured', async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }
            
            const featuredProducts = await db.collection('products')
                .find({ isActive: true })
                .sort({ createdAt: -1 })
                .limit(4)
                .toArray();
            
            res.json(featuredProducts);
    
        } catch (error) {
            console.error('Error fetching featured products:', error);
            res.status(500).json({ error: 'Failed to fetch featured products' });
        }
    });
    
    // Get featured news
    app.get('/api/news/featured', async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }
    
            res.json([]);
            
        } catch (error) {
            console.error('Error fetching featured news:', error);
            res.status(500).json({ error: 'Failed to fetch featured news' });
        }
    });
    
    // Get featured tutorials
    app.get('/api/tutorials/featured', async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }
    
            const tutorials = await db.collection('tutorials').find({ 
                isActive: { $ne: false },
                featured: true 
            }).limit(8).toArray();
    
            if (!tutorials || tutorials.length === 0) {
                const latestTutorials = await db.collection('tutorials').find({ 
                    isActive: { $ne: false }
                }).sort({ createdAt: -1 }).limit(8).toArray();
                return res.json(latestTutorials || []);
            }
    
            res.json(tutorials);
    
        } catch (error) {
            console.error('Error fetching featured tutorials:', error);
            res.status(500).json({ error: 'Failed to fetch featured tutorials' });
        }
    });
    
    // Get all projects (public — only active)
    app.get('/api/projects', async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }
    
            const { page = 1, limit = 20, categoryId } = req.query;
            
            let query = { isActive: { $ne: false } };
            
            if (categoryId) {
                query.categoryId = categoryId;
            }
    
            let projectsQuery = db.collection('projects').find(query).sort({ createdAt: -1 });
    
            if (limit) {
                projectsQuery = projectsQuery.limit(parseInt(limit));
            }
    
            if (page && page > 1) {
                const skip = (parseInt(page) - 1) * (limit ? parseInt(limit) : 10);
                projectsQuery = projectsQuery.skip(skip);
            }
    
            const projects = await projectsQuery.toArray();
            const total = await db.collection('projects').countDocuments(query);
    
            const transformedProjects = projects.map(project => ({
                _id: project._id,
                title: project.name || project.title,
                description: project.description,
                featuredImage: project.coverImage || project.featuredImage || project.image,
                slug: project.slug,
                createdAt: project.createdAt,
                categoryId: project.categoryId,
                category: project.category,
                difficulty: project.difficulty || project.level || 'beginner',
                duration: project.duration || '2 tuần'
            }));
    
            res.json(transformedProjects);
    
        } catch (error) {
            console.error('Error fetching projects:', error);
            res.status(500).json({ error: 'Failed to fetch projects' });
        }
    });
    
    // Get project categories
    app.get('/api/project-categories', async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            let categories = await db.collection('categories')
                .find({
                    type: { $in: ['project', 'projects'] },
                    isActive: { $ne: false },
                })
                .sort({ sortOrder: 1, name: 1 })
                .toArray();

            if (!categories || categories.length === 0) {
                const distinctCategoryIds = await db.collection('projects').distinct('categoryId', {
                    isActive: { $ne: false },
                });
                categories = (distinctCategoryIds || [])
                    .filter(Boolean)
                    .map((value) => ({
                        _id: String(value),
                        name: String(value),
                        slug: String(value),
                        icon: '',
                        color: '',
                    }));
            }

            return res.json(categories.map((category) => ({
                _id: category._id,
                name: category.name || 'Danh mục dự án',
                slug: category.slug || '',
                icon: category.icon || '',
                color: category.color || '',
            })));
        } catch (error) {
            console.error('Error fetching project categories:', error);
            return res.status(500).json({ error: 'Failed to fetch project categories' });
        }
    });

    // Get featured projects
    app.get('/api/projects/featured', async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }
            
            const projects = await db.collection('projects').find({ 
                isActive: { $ne: false }
            }).limit(4).toArray();
            
            const transformedProjects = projects.map(project => ({
                _id: project._id,
                title: project.name,
                description: project.description,
                image: project.image || project.images?.[0],
                category: project.category,
                level: project.level || 'beginner',
                duration: project.duration || '2-4 tuần',
                price: project.price,
                slug: project.slug,
                featured: true,
                rating: project.rating || 4.5,
                ratingCount: project.ratingCount || 0,
                type: 'project'
            }));
            
            res.json(transformedProjects);
    
        } catch (error) {
            console.error('Error fetching featured projects:', error);
            res.status(500).json({ error: 'Failed to fetch featured projects' });
        }
    });
    
    // Get featured courses
    app.get('/api/courses/featured', async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            const courses = await db.collection('courses')
                .find({
                    isActive: { $ne: false },
                    isPublished: { $ne: false },
                    $or: [{ isFeatured: true }, { featured: true }],
                })
                .sort({ updatedAt: -1, createdAt: -1 })
                .limit(4)
                .toArray();

            const transformedCourses = courses.map((course) => ({
                _id: course._id,
                title: course.title || course.name || 'Khóa học',
                description: course.description || course.shortDescription || '',
                image: course.thumbnail || course.banner || course.image_url || course.image || '',
                category: course.category || '',
                level: course.level || course.difficulty || 'beginner',
                duration: course.duration || '',
                price: course.price || 0,
                slug: course.slug || '',
                featured: Boolean(course.isFeatured || course.featured),
                rating: course.rating || 0,
                ratingCount: course.reviewCount || course.ratingCount || 0,
            }));

            res.json(transformedCourses);

        } catch (error) {
            console.error('Error fetching featured courses:', error);
            res.status(500).json({ error: 'Failed to fetch featured courses' });
        }
    });

    // Get all news (public — only published)
    app.get('/api/news', async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }
    
            const { limit, category, categoryId, page = 1 } = req.query;
            let query = { status: 'published' };
    
            if (category) {
                query.category = category;
            }
            
            if (categoryId) {
                if (ObjectId.isValid(categoryId)) {
                    query.categoryId = { 
                        $in: [new ObjectId(categoryId), categoryId] 
                    };
                } else {
                    query.categoryId = categoryId;
                }
            }
    
            let newsQuery = db.collection('news').find(query).sort({ createdAt: -1 });
    
            if (limit) {
                newsQuery = newsQuery.limit(parseInt(limit));
            }
    
            if (page && page > 1) {
                const skip = (parseInt(page) - 1) * (limit ? parseInt(limit) : 10);
                newsQuery = newsQuery.skip(skip);
            }
    
            const news = await newsQuery.toArray();
    
            res.json(news);
    
        } catch (error) {
            console.error('Error fetching news:', error);
            res.status(500).json({ error: 'Failed to fetch news' });
        }
    });
    
    // Get news categories
    app.get('/api/news/categories', async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }
    
            const categories = await db.collection('news_categories').find({ isActive: { $ne: false } }).toArray();
            
            if (categories.length === 0) {
                const defaultCategories = [
                    { name: 'Công nghệ', slug: 'cong-nghe', isActive: true },
                    { name: 'Giáo dục', slug: 'giao-duc', isActive: true },
                    { name: 'STEAM', slug: 'steam', isActive: true },
                    { name: 'Tin tức', slug: 'tin-tuc', isActive: true }
                ];
                return res.json(defaultCategories);
            }
    
            res.json(categories);
    
        } catch (error) {
            console.error('Error fetching news categories:', error);
            res.status(500).json({ error: 'Failed to fetch news categories' });
        }
    });
    
    // Admin: Get news categories
    app.get('/api/admin/news-categories', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }
    
            const categories = await db.collection('news_categories').find({}).toArray();
            res.json(categories);
    
        } catch (error) {
            console.error('Error fetching news categories:', error);
            res.status(500).json({ error: 'Failed to fetch news categories' });
        }
    });
    
    // Admin: Get single news category
    app.get('/api/admin/news-categories/:id', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }
    
            const { id } = req.params;
            const category = await db.collection('news_categories').findOne({ _id: new ObjectId(id) });
    
            if (!category) {
                return res.status(404).json({ error: 'News category not found' });
            }
    
            res.json(category);
    
        } catch (error) {
            console.error('Error fetching news category:', error);
            res.status(500).json({ error: 'Failed to fetch news category' });
        }
    });
    
    // Admin: Create news category
    app.post('/api/admin/news-categories', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }
    
            const { name, slug, description, icon, color, isActive } = req.body;
    
            if (!name || !slug) {
                return res.status(400).json({ error: 'Name and slug are required' });
            }
    
            const existingCategory = await db.collection('news_categories').findOne({ slug });
            if (existingCategory) {
                return res.status(400).json({ error: 'Slug already exists' });
            }
    
            const categoryData = {
                name,
                slug,
                description: description || '',
                icon: icon || '📰',
                color: color || '#10b981',
                isActive: isActive !== false,
                createdAt: new Date(),
                updatedAt: new Date()
            };
    
            const result = await db.collection('news_categories').insertOne(categoryData);
            categoryData._id = result.insertedId;
    
            res.status(201).json(categoryData);
    
        } catch (error) {
            console.error('Error creating news category:', error);
            res.status(500).json({ error: 'Failed to create news category' });
        }
    });
    
    // Admin: Update news category
    app.put('/api/admin/news-categories/:id', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }
    
            const { id } = req.params;
            const { name, slug, description, icon, color, isActive } = req.body;
    
            if (!name || !slug) {
                return res.status(400).json({ error: 'Name and slug are required' });
            }
    
            const existingCategory = await db.collection('news_categories').findOne({ 
                slug, 
                _id: { $ne: new ObjectId(id) } 
            });
            if (existingCategory) {
                return res.status(400).json({ error: 'Slug already exists' });
            }
    
            const updateData = {
                name,
                slug,
                description: description || '',
                icon: icon || '📰',
                color: color || '#10b981',
                isActive: isActive !== false,
                updatedAt: new Date()
            };
    
            const result = await db.collection('news_categories').updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );
    
            if (result.matchedCount === 0) {
                return res.status(404).json({ error: 'News category not found' });
            }
    
            res.json({ ...updateData, _id: id });
    
        } catch (error) {
            console.error('Error updating news category:', error);
            res.status(500).json({ error: 'Failed to update news category' });
        }
    });
    
    // Admin: Delete news category
    app.delete('/api/admin/news-categories/:id', authenticateAdmin, async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }
    
            const { id } = req.params;
    
            const result = await db.collection('news_categories').deleteOne({ _id: new ObjectId(id) });
    
            if (result.deletedCount === 0) {
                return res.status(404).json({ error: 'News category not found' });
            }
    
            res.json({ message: 'News category deleted successfully' });
    
        } catch (error) {
            console.error('Error deleting news category:', error);
            res.status(500).json({ error: 'Failed to delete news category' });
        }
    });
    
    // Get news by slug (public — only published)
    app.get('/api/news/slug/:slug', async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }
    
            const { slug } = req.params;
            const news = await db.collection('news').findOne({ slug, status: 'published' });
    
            if (!news) {
                return res.status(404).json({ error: 'News not found' });
            }
    
            // Get category name
            if (news.categoryId) {
                try {
                    const category = await db.collection('news_categories').findOne({ _id: new ObjectId(news.categoryId) });
                    if (category) {
                        news.categoryName = category.name;
                    }
                } catch (e) {
                    console.log('Could not fetch category name');
                }
            }
    
            res.json(news);
    
        } catch (error) {
            console.error('Error fetching news by slug:', error);
            res.status(500).json({ error: 'Failed to fetch news' });
        }
    });
    
    // Get related news
    app.get('/api/news/related', async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }
    
            const { limit = 3, categoryId, excludeId } = req.query;
            let query = { status: 'published' };
    
            if (categoryId) {
                query.categoryId = categoryId;
            }
    
            if (excludeId) {
                query._id = { $ne: new ObjectId(excludeId) };
            }
    
            const news = await db.collection('news')
                .find(query)
                .sort({ createdAt: -1 })
                .limit(parseInt(limit))
                .toArray();
    
            res.json(news);
    
        } catch (error) {
            console.error('Error fetching related news:', error);
            res.status(500).json({ error: 'Failed to fetch related news' });
        }
    });
    
    // Get all tutorials (public — only active)
    app.get('/api/tutorials', async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }
    
            const { limit, category, categoryId, level, page = 1 } = req.query;
            let query = {
                isActive: { $ne: false }
            };
    
            if (category) {
                query.category = category;
            }
    
            if (categoryId) {
                if (ObjectId.isValid(categoryId)) {
                    query.categoryId = { 
                        $in: [new ObjectId(categoryId), categoryId] 
                    };
                } else {
                    query.categoryId = categoryId;
                }
            }
    
            if (level) {
                query.level = level;
            }
    
            let tutorialsQuery = db.collection('tutorials').find(query).sort({ createdAt: -1 });
    
            if (limit) {
                tutorialsQuery = tutorialsQuery.limit(parseInt(limit));
            }
    
            if (page && page > 1) {
                const skip = (parseInt(page) - 1) * (limit ? parseInt(limit) : 10);
                tutorialsQuery = tutorialsQuery.skip(skip);
            }
    
            const tutorials = await tutorialsQuery.toArray();
            const total = await db.collection('tutorials').countDocuments(query);
    
            res.json({
                tutorials,
                pagination: {
                    page: parseInt(page),
                    limit: limit ? parseInt(limit) : 10,
                    total,
                    pages: Math.ceil(total / (limit ? parseInt(limit) : 10))
                }
            });
    
        } catch (error) {
            console.error('Error fetching tutorials:', error);
            res.status(500).json({ error: 'Failed to fetch tutorials' });
        }
    });
    
    // Get tutorial by slug (public — only active)
    app.get('/api/tutorials/:slug', async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }
    
            const { slug } = req.params;
            const tutorial = await db.collection('tutorials').findOne({ slug, isActive: { $ne: false } });
    
            if (!tutorial) {
                return res.status(404).json({ error: 'Tutorial not found' });
            }
    
            res.json(tutorial);
    
        } catch (error) {
            console.error('Error fetching tutorial by slug:', error);
            res.status(500).json({ error: 'Failed to fetch tutorial' });
        }
    });
    
    // Get all courses (public — only active and published)
    app.get('/api/courses', async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }

            const { limit, category, level } = req.query;
            const query = {
                isActive: { $ne: false },
                isPublished: { $ne: false },
            };

            if (category) {
                query.category = category;
            }

            if (level) {
                query.level = level;
            }

            let coursesQuery = db.collection('courses').find(query).sort({ updatedAt: -1, createdAt: -1 });

            if (limit && Number.isFinite(Number(limit))) {
                coursesQuery = coursesQuery.limit(Math.max(1, Number(limit)));
            }

            const courses = await coursesQuery.toArray();

            const normalizedCourses = courses.map((course) => ({
                _id: course._id,
                title: course.title || course.name || 'Khóa học',
                description: course.description || course.shortDescription || '',
                image: course.thumbnail || course.banner || course.image_url || course.image || '',
                category: course.category || '',
                level: course.level || course.difficulty || 'beginner',
                duration: course.duration || '',
                price: course.price || 0,
                slug: course.slug || '',
                featured: Boolean(course.isFeatured || course.featured),
                rating: course.rating || 0,
                ratingCount: course.reviewCount || course.ratingCount || 0,
            }));

            return res.json(normalizedCourses);
    
        } catch (error) {
            console.error('Error fetching courses:', error);
            return res.status(500).json({ error: 'Failed to fetch courses' });
        }
    });
    
    // Get course by slug
    app.get('/api/courses/:slug', async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }
    
            const { slug } = req.params;
            const course = await db.collection('courses').findOne({ slug });
    
            if (!course) {
                return res.status(404).json({ error: 'Course not found' });
            }
    
            res.json(course);
    
        } catch (error) {
            console.error('Error fetching course by slug:', error);
            res.status(500).json({ error: 'Failed to fetch course' });
        }
    });
    
    
    // Get about page content
    app.get('/api/about', async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }
    
            const about = await db.collection('pages').findOne({ type: 'about' });
            
            if (!about) {
                res.json({
                    title: 'Về chúng tôi',
                    content: 'Nội dung về trang giới thiệu sẽ được cập nhật sớm.',
                    updatedAt: new Date()
                });
            } else {
                res.json(about);
            }
    
        } catch (error) {
            console.error('Error fetching about page:', error);
            res.status(500).json({ error: 'Failed to fetch about page' });
        }
    });
    
    // Get contact page content
    app.get('/api/contact', async (req, res) => {
        try {
            if (!db) {
                return res.status(500).json({ error: 'Database not connected' });
            }
    
            const contact = await db.collection('pages').findOne({ type: 'contact' });
            
            if (!contact) {
                res.json({
                    title: 'Liên hệ',
                    content: 'Thông tin liên hệ sẽ được cập nhật sớm.',
                    updatedAt: new Date()
                });
            } else {
                res.json(contact);
            }
    
        } catch (error) {
            console.error('Error fetching contact page:', error);
            res.status(500).json({ error: 'Failed to fetch contact page' });
        }
    });
    
}

module.exports = { registerContentRoutes, setContentDb };
