const nodemailer = require('nodemailer');

let memoryCarts = {};

function registerSystemRoutes(app, deps) {
    const {
        express,
        fs,
        path,
        sharp,
        upload,
        ObjectId,
        authenticateAdmin,
        authenticateUser,
        getDb,
        publicDir,
        convertImageUrlToWebp,
    } = deps;

    function getDbOrRespond(res) {
        const db = getDb();
        if (!db) {
            res.status(503).json({ error: 'Database not available' });
            return null;
        }
        return db;
    }

    function getUserKey(req) {
        const token = req.headers.authorization?.replace('Bearer ', '') || '';
        return token || req.ip;
    }

    function normalizePrice(input) {
        if (typeof input === 'number' && Number.isFinite(input)) {
            return input;
        }
        if (typeof input === 'string') {
            const numeric = input.replace(/[^\d]/g, '');
            if (!numeric) {
                return 0;
            }
            return Number(numeric);
        }
        return 0;
    }

    function buildOrderUserPayload(userDoc = {}) {
        const fullName = [userDoc.firstName, userDoc.lastName].filter(Boolean).join(' ').trim();
        return {
            id: userDoc._id ? String(userDoc._id) : '',
            email: userDoc.email || '',
            name: fullName || userDoc.name || userDoc.email || 'User',
        };
    }

    function parseBoolean(raw, fallback = false) {
        if (typeof raw === 'boolean') {
            return raw;
        }
        if (typeof raw === 'string') {
            const normalized = raw.trim().toLowerCase();
            if (['1', 'true', 'yes', 'on'].includes(normalized)) {
                return true;
            }
            if (['0', 'false', 'no', 'off'].includes(normalized)) {
                return false;
            }
        }
        return fallback;
    }

    function sanitizeLine(raw, maxLength) {
        return String(raw || '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, maxLength);
    }

    function sanitizeMultiline(raw, maxLength) {
        return String(raw || '')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .trim()
            .slice(0, maxLength);
    }

    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(String(email || '').trim().toLowerCase());
    }

    function escapeHtml(raw) {
        return String(raw || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function buildContactMailer() {
        const mailService = String(process.env.MAIL_SERVICE || '').trim();
        const mailHost = String(process.env.MAIL_HOST || '').trim();
        const mailPort = Number(process.env.MAIL_PORT || 587);
        const mailSecure = parseBoolean(process.env.MAIL_SECURE, mailPort === 465);
        const mailUser = String(process.env.MAIL_USER || '').trim();
        const mailPass = String(process.env.MAIL_PASS || '').trim();
        const contactRecipient = String(process.env.CONTACT_EMAIL_TO || '').trim();

        if (!mailUser || !mailPass) {
            return { enabled: false, reason: 'MAIL_USER or MAIL_PASS is missing' };
        }

        let transporter = null;
        if (mailService) {
            transporter = nodemailer.createTransport({
                service: mailService,
                auth: {
                    user: mailUser,
                    pass: mailPass,
                },
            });
        } else if (mailHost) {
            transporter = nodemailer.createTransport({
                host: mailHost,
                port: Number.isFinite(mailPort) ? mailPort : 587,
                secure: mailSecure,
                auth: {
                    user: mailUser,
                    pass: mailPass,
                },
            });
        } else {
            // Fallback to Gmail if host/service was not specified
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: mailUser,
                    pass: mailPass,
                },
            });
        }

        return {
            enabled: true,
            transporter,
            from: String(process.env.MAIL_FROM || '').trim() || `"Smart Steam Contact" <${mailUser}>`,
            to: contactRecipient || mailUser,
        };
    }

    const contactMailer = buildContactMailer();
    if (!contactMailer.enabled) {
        console.warn(`[contact] Email transport disabled: ${contactMailer.reason}`);
    }

    const CONTACT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
    const CONTACT_RATE_LIMIT_MAX = 6;
    const contactRateBucket = new Map();

    function getContactRateKey(req) {
        const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
        return forwarded || req.ip || 'unknown';
    }

    function isContactRateLimited(req) {
        const key = getContactRateKey(req);
        const now = Date.now();
        const bucket = contactRateBucket.get(key);
        const nextRecords = bucket
            ? bucket.filter((timestamp) => now - timestamp < CONTACT_RATE_LIMIT_WINDOW_MS)
            : [];

        if (nextRecords.length >= CONTACT_RATE_LIMIT_MAX) {
            contactRateBucket.set(key, nextRecords);
            return true;
        }

        nextRecords.push(now);
        contactRateBucket.set(key, nextRecords);

        if (contactRateBucket.size > 1000) {
            const threshold = now - CONTACT_RATE_LIMIT_WINDOW_MS;
            for (const [bucketKey, timestamps] of contactRateBucket.entries()) {
                const filtered = timestamps.filter((timestamp) => timestamp > threshold);
                if (filtered.length === 0) {
                    contactRateBucket.delete(bucketKey);
                } else if (filtered.length !== timestamps.length) {
                    contactRateBucket.set(bucketKey, filtered);
                }
            }
        }
        return false;
    }

    async function resolveCatalogItem(db, rawId) {
        if (!rawId) {
            return null;
        }

        let product = null;
        if (ObjectId.isValid(rawId)) {
            product = await db.collection('products').findOne(
                { _id: new ObjectId(rawId) },
                { projection: { name: 1, slug: 1, price: 1, images: 1, image: 1, isActive: 1 } }
            );
        }

        if (!product) {
            product = await db.collection('products').findOne(
                { slug: rawId },
                { projection: { name: 1, slug: 1, price: 1, images: 1, image: 1, isActive: 1 } }
            );
        }

        if (!product) {
            return null;
        }

        if (product.isActive === false) {
            return null;
        }

        return product;
    }

    // Tutorial view counter persisted in local JSON file
    app.post('/api/tutorials/:slug', (req, res) => {
        try {
            const slug = req.params.slug;
            if (!slug) {
                return res.status(400).json({ success: false, error: 'Slug is required' });
            }

            const tutorialsPath = path.join(publicDir, 'data', 'tutorials.json');
            let tutorialsDb = { tutorials: [] };

            if (fs.existsSync(tutorialsPath)) {
                try {
                    const content = fs.readFileSync(tutorialsPath, 'utf8');
                    tutorialsDb = JSON.parse(content);
                } catch (readError) {
                    console.error('Error reading tutorials database:', readError);
                }
            }

            const tutorialIndex = tutorialsDb.tutorials.findIndex((t) => t.slug === slug);
            if (tutorialIndex === -1) {
                return res.status(404).json({ success: false, error: 'Tutorial not found' });
            }

            const currentViews = Number(tutorialsDb.tutorials[tutorialIndex].views || 0);
            tutorialsDb.tutorials[tutorialIndex].views = currentViews + 1;
            fs.writeFileSync(tutorialsPath, JSON.stringify(tutorialsDb, null, 2));

            return res.json({ success: true, slug, views: tutorialsDb.tutorials[tutorialIndex].views });
        } catch (error) {
            console.error('Error incrementing tutorial view:', error);
            return res.status(500).json({ success: false, error: 'Internal server error' });
        }
    });

    // Legacy pretty URL for a single tutorial
    app.get('/tutorials/nut-nhan-lap-trinh-arduino', (req, res) => {
        try {
            const slug = 'nut-nhan-lap-trinh-arduino';
            const tutorialsPath = path.join(publicDir, 'data', 'tutorials.json');
            let tutorialsDb = { tutorials: [] };

            if (fs.existsSync(tutorialsPath)) {
                try {
                    const content = fs.readFileSync(tutorialsPath, 'utf8');
                    tutorialsDb = JSON.parse(content);
                } catch (readError) {
                    console.error('Error reading tutorials database:', readError);
                }
            }

            const tutorialIndex = tutorialsDb.tutorials.findIndex((t) => t.slug === slug);
            if (tutorialIndex !== -1) {
                const currentViews = Number(tutorialsDb.tutorials[tutorialIndex].views || 0);
                tutorialsDb.tutorials[tutorialIndex].views = currentViews + 1;
                try {
                    fs.writeFileSync(tutorialsPath, JSON.stringify(tutorialsDb, null, 2));
                } catch (writeError) {
                    console.error('Error writing tutorials database:', writeError);
                }
            }

            return res.status(200).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                    <title>Redirecting...</title>
                </head>
                <body>
                    <script>window.location.href = '/tutorial-detail.html?slug=${slug}';</script>
                </body>
                </html>
            `);
        } catch (error) {
            console.error('Error handling pretty URL:', error);
            return res.status(500).send('<h1>Error loading tutorial</h1>');
        }
    });

    // Cart and orders demo endpoints
    app.post('/api/cart', (req, res) => {
        try {
            const userKey = getUserKey(req);
            const { id, name, price, image, quantity } = req.body || {};
            if (!id) {
                return res.status(400).json({ error: 'Missing id' });
            }

            const qty = Math.max(1, Number(quantity || 1));
            const item = { id, name, price: Number(price || 0), image, quantity: qty };
            const cart = memoryCarts[userKey] || [];
            const idx = cart.findIndex((x) => x.id === id);
            if (idx >= 0) {
                cart[idx].quantity += qty;
            } else {
                cart.push(item);
            }
            memoryCarts[userKey] = cart;
            return res.json({ success: true, cart });
        } catch (_) {
            return res.status(500).json({ error: 'Cart error' });
        }
    });

    app.get('/api/cart', (req, res) => {
        const userKey = getUserKey(req);
        return res.json(memoryCarts[userKey] || []);
    });

    app.put('/api/cart', (req, res) => {
        const userKey = getUserKey(req);
        const items = Array.isArray(req.body) ? req.body : [];
        memoryCarts[userKey] = items;
        return res.json({ success: true });
    });

    app.post('/api/contact', async (req, res) => {
        try {
            const rawName = sanitizeLine(req.body?.name, 120);
            const rawEmail = sanitizeLine(req.body?.email, 180).toLowerCase();
            const rawPhone = sanitizeLine(req.body?.phone, 40);
            const rawSubject = sanitizeLine(req.body?.subject, 180);
            const rawMessage = sanitizeMultiline(req.body?.message, 2500);

            if (!rawName || rawName.length < 2) {
                return res.status(400).json({ error: 'Họ tên không hợp lệ' });
            }
            if (!isValidEmail(rawEmail)) {
                return res.status(400).json({ error: 'Email không hợp lệ' });
            }
            if (!rawMessage || rawMessage.length < 10) {
                return res.status(400).json({ error: 'Nội dung cần ít nhất 10 ký tự' });
            }

            if (isContactRateLimited(req)) {
                return res.status(429).json({ error: 'Bạn gửi quá nhanh. Vui lòng thử lại sau ít phút.' });
            }

            if (!contactMailer.enabled || !contactMailer.transporter) {
                return res.status(503).json({
                    error: 'Chức năng gửi email chưa được cấu hình trên máy chủ.',
                });
            }

            const subject = rawSubject || 'Liên hệ mới từ website Smart Steam';
            const textBody = [
                'Bạn nhận được một liên hệ mới từ website Smart Steam.',
                '',
                `Họ tên: ${rawName}`,
                `Email: ${rawEmail}`,
                `Điện thoại: ${rawPhone || '(không cung cấp)'}`,
                `Tiêu đề: ${subject}`,
                '',
                'Nội dung:',
                rawMessage,
                '',
                `IP: ${getContactRateKey(req)}`,
                `Thời gian: ${new Date().toISOString()}`,
            ].join('\n');

            const htmlBody = `
                <div style="font-family: Arial, Helvetica, sans-serif; color: #0f172a; line-height: 1.6;">
                    <h2 style="margin: 0 0 12px;">Liên hệ mới từ website Smart Steam</h2>
                    <table style="border-collapse: collapse; width: 100%; max-width: 680px;">
                        <tr><td style="padding: 6px 0; width: 120px;"><strong>Họ tên</strong></td><td style="padding: 6px 0;">${escapeHtml(rawName)}</td></tr>
                        <tr><td style="padding: 6px 0;"><strong>Email</strong></td><td style="padding: 6px 0;">${escapeHtml(rawEmail)}</td></tr>
                        <tr><td style="padding: 6px 0;"><strong>Điện thoại</strong></td><td style="padding: 6px 0;">${escapeHtml(rawPhone || '(không cung cấp)')}</td></tr>
                        <tr><td style="padding: 6px 0;"><strong>Tiêu đề</strong></td><td style="padding: 6px 0;">${escapeHtml(subject)}</td></tr>
                    </table>
                    <div style="margin-top: 14px;">
                        <strong>Nội dung:</strong>
                        <div style="padding: 12px; margin-top: 8px; border-radius: 8px; border: 1px solid #e2e8f0; white-space: pre-wrap;">${escapeHtml(rawMessage)}</div>
                    </div>
                    <p style="margin-top: 14px; font-size: 12px; color: #64748b;">
                        IP: ${escapeHtml(getContactRateKey(req))}<br/>
                        Thời gian: ${escapeHtml(new Date().toISOString())}
                    </p>
                </div>
            `;

            await contactMailer.transporter.sendMail({
                from: contactMailer.from,
                to: contactMailer.to,
                replyTo: rawEmail,
                subject: `[Contact] ${subject}`,
                text: textBody,
                html: htmlBody,
            });

            const db = getDb();
            if (db) {
                try {
                    await db.collection('contact_messages').insertOne({
                        name: rawName,
                        email: rawEmail,
                        phone: rawPhone || '',
                        subject,
                        message: rawMessage,
                        ip: getContactRateKey(req),
                        createdAt: new Date(),
                    });
                } catch (dbError) {
                    console.error('Contact message save error:', dbError);
                }
            }

            return res.json({
                success: true,
                message: 'Đã gửi liên hệ thành công. Chúng tôi sẽ phản hồi sớm nhất.',
            });
        } catch (error) {
            console.error('Contact send error:', error);
            return res.status(500).json({ error: 'Không thể gửi liên hệ lúc này. Vui lòng thử lại sau.' });
        }
    });

    app.post('/api/newsletter', async (req, res) => {
        try {
            const db = getDbOrRespond(res);
            if (!db) {
                return;
            }

            const email = String(req.body?.email || '').trim().toLowerCase();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ error: 'Invalid email address' });
            }

            await db.collection('newsletter_subscribers').updateOne(
                { email },
                {
                    $set: { email, updatedAt: new Date() },
                    $setOnInsert: { createdAt: new Date(), isActive: true },
                },
                { upsert: true }
            );

            return res.json({ success: true, message: 'Subscribed successfully' });
        } catch (error) {
            console.error('Newsletter subscribe error:', error);
            return res.status(500).json({ error: 'Failed to subscribe' });
        }
    });

    app.get('/api/orders', authenticateUser, async (req, res) => {
        try {
            const db = getDbOrRespond(res);
            if (!db) {
                return;
            }

            const email = req.user?.user?.email || '';
            const userId = req.user?.userId || (req.user?.user?._id ? String(req.user.user._id) : '');
            const filters = [];
            if (email) {
                filters.push({ 'user.email': email });
            }
            if (userId) {
                filters.push({ 'user.id': userId });
            }
            if (filters.length === 0) {
                return res.status(401).json({ error: 'Invalid user context' });
            }

            const query = { $or: filters };

            const orders = await db.collection('orders').find(query).sort({ createdAt: -1 }).toArray();
            return res.json(orders);
        } catch (error) {
            console.error('Error fetching user orders:', error);
            return res.status(500).json({ error: 'Failed to fetch orders' });
        }
    });

    app.post('/api/orders', authenticateUser, async (req, res) => {
        try {
            const db = getDbOrRespond(res);
            if (!db) {
                return;
            }

            const { items } = req.body || {};
            if (!Array.isArray(items) || items.length === 0) {
                return res.status(400).json({ error: 'No items in order' });
            }

            const normalizedItems = [];
            for (const rawItem of items) {
                const rawId = String(rawItem?.id || rawItem?.productId || rawItem?.slug || '').trim();
                if (!rawId) {
                    return res.status(400).json({ error: 'Each order item must include id, productId, or slug' });
                }

                const product = await resolveCatalogItem(db, rawId);
                if (!product) {
                    return res.status(400).json({ error: `Invalid or inactive product: ${rawId}` });
                }

                const parsedQuantity = Number(rawItem.quantity || 1);
                const quantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0
                    ? Math.min(100, Math.floor(parsedQuantity))
                    : 1;
                const unitPrice = normalizePrice(product.price);
                const image = (Array.isArray(product.images) && product.images[0]) || product.image || rawItem.image || '';

                normalizedItems.push({
                    id: String(product._id),
                    slug: product.slug || '',
                    name: product.name || rawItem.name || 'Product',
                    price: unitPrice,
                    image,
                    quantity,
                });
            }

            const serverTotal = normalizedItems.reduce(
                (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
                0
            );

            const orderCode = 'SS-' + Date.now().toString(36).toUpperCase();
            const orderDoc = {
                code: orderCode,
                user: buildOrderUserPayload(req.user?.user || {}),
                items: normalizedItems,
                total: serverTotal,
                status: 'pending',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const result = await db.collection('orders').insertOne(orderDoc);
            delete memoryCarts[getUserKey(req)];

            return res.json({
                success: true,
                orderId: result.insertedId,
                orderCode,
                total: serverTotal,
                message: 'Order created successfully',
            });
        } catch (error) {
            console.error('Order creation error:', error);
            return res.status(500).json({ error: 'Failed to create order' });
        }
    });

    app.get('/api/admin/orders', authenticateAdmin, async (req, res) => {
        try {
            const db = getDbOrRespond(res);
            if (!db) {
                return;
            }
            const orders = await db.collection('orders').find({}).sort({ createdAt: -1 }).toArray();
            return res.json(orders);
        } catch (error) {
            console.error('Error fetching orders:', error);
            return res.status(500).json({ error: 'Failed to fetch orders' });
        }
    });

    app.put('/api/admin/orders/:id', authenticateAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body || {};
            if (!status) {
                return res.status(400).json({ error: 'Status is required' });
            }

            const db = getDbOrRespond(res);
            if (!db) {
                return;
            }

            const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
            const result = await db.collection('orders').updateOne(query, { $set: { status, updatedAt: new Date() } });
            if (result.matchedCount === 0) {
                return res.status(404).json({ error: 'Order not found' });
            }

            return res.json({ success: true, message: 'Order status updated' });
        } catch (error) {
            console.error('Error updating order:', error);
            return res.status(500).json({ error: 'Failed to update order' });
        }
    });

    app.delete('/api/admin/orders/:id', authenticateAdmin, async (req, res) => {
        try {
            const { id } = req.params;
            const db = getDbOrRespond(res);
            if (!db) {
                return;
            }

            const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
            const result = await db.collection('orders').deleteOne(query);
            if (result.deletedCount === 0) {
                return res.status(404).json({ error: 'Order not found' });
            }

            return res.json({ success: true, message: 'Order deleted successfully' });
        } catch (error) {
            console.error('Error deleting order:', error);
            return res.status(500).json({ error: 'Failed to delete order' });
        }
    });

    // Static assets
    app.get('/favicon.ico', (req, res) => {
        return res.sendFile(path.join(publicDir, 'images', 'favicon.ico'));
    });

    app.get('/robots.txt', (req, res) => {
        return res.sendFile(path.join(publicDir, 'robots.txt'));
    });

    app.get('/site.webmanifest', (req, res) => {
        return res.sendFile(path.join(publicDir, 'site.webmanifest'));
    });

    app.use('/uploads', express.static(path.join(publicDir, 'uploads')));
    app.use('/images', express.static(path.join(publicDir, 'images')));

    // Image library
    app.post('/api/admin/images/upload', authenticateAdmin, upload.single('image'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            const imagesDir = path.join(publicDir, 'images');
            if (!fs.existsSync(imagesDir)) {
                fs.mkdirSync(imagesDir, { recursive: true });
            }

            const providedName = (req.body && req.body.filename ? String(req.body.filename) : '').trim();
            const safeProvided = providedName.replace(/[^a-zA-Z0-9-_]/g, '');
            const baseName = safeProvided || path.parse(req.file.originalname).name.replace(/[^a-zA-Z0-9-_]/g, '') || 'image';
            const finalFilename = `${baseName}-${Date.now()}.webp`;
            const targetPath = path.join(imagesDir, finalFilename);

            await sharp(req.file.path).rotate().toFormat('webp', { quality: 80 }).toFile(targetPath);
            try {
                fs.unlinkSync(req.file.path);
            } catch (_) {}

            return res.json({
                success: true,
                filename: finalFilename,
                url: `/images/${finalFilename}`,
                savedPath: targetPath,
            });
        } catch (error) {
            console.error('Image upload error:', error);
            return res.status(500).json({ error: 'Upload failed' });
        }
    });

    app.post('/api/admin/images/convert', authenticateAdmin, async (req, res) => {
        try {
            const { url } = req.body || {};
            if (!url || typeof url !== 'string') {
                return res.status(400).json({ error: 'No url provided' });
            }

            const convertedUrl = await convertImageUrlToWebp(url);
            return res.json({
                success: true,
                url: convertedUrl,
            });
        } catch (error) {
            console.error('Convert error:', error);
            return res.status(500).json({ error: 'Convert failed' });
        }
    });

    app.get('/api/admin/images', authenticateAdmin, async (req, res) => {
        try {
            const imagesDir = path.join(publicDir, 'images');
            if (!fs.existsSync(imagesDir)) {
                return res.json([]);
            }
            const files = fs.readdirSync(imagesDir)
                .filter((f) => f.toLowerCase().endsWith('.webp'))
                .map((f) => ({ filename: f, url: `/images/${f}` }))
                .sort((a, b) => b.filename.localeCompare(a.filename));
            return res.json(files);
        } catch (error) {
            return res.status(500).json({ error: 'Cannot list images' });
        }
    });

    app.delete('/api/admin/images/:filename', authenticateAdmin, async (req, res) => {
        try {
            const filename = req.params.filename;
            const imagesRoot = path.resolve(path.join(publicDir, 'images'));
            const filePath = path.resolve(imagesRoot, filename);
            if (!filePath.startsWith(imagesRoot + path.sep) && filePath !== imagesRoot) {
                return res.status(400).json({ error: 'Invalid path' });
            }

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            return res.json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: 'Delete failed' });
        }
    });

    // Hero slides
    app.get('/api/hero-slides', async (req, res) => {
        try {
            const db = getDbOrRespond(res);
            if (!db) {
                return;
            }

            const slides = await db.collection('hero_slides')
                .find({ isActive: true })
                .sort({ order: 1 })
                .toArray();
            return res.json(slides);
        } catch (error) {
            console.error('Error fetching hero slides:', error);
            return res.status(500).json({ error: 'Failed to fetch hero slides' });
        }
    });

    app.post('/api/hero-slides', authenticateAdmin, async (req, res) => {
        try {
            const db = getDbOrRespond(res);
            if (!db) {
                return;
            }

            const slideData = { ...req.body, updatedAt: new Date() };
            if (!slideData.createdAt) {
                slideData.createdAt = new Date();
            }

            if (slideData.id || slideData._id) {
                const updateId = slideData._id || slideData.id;
                const updateData = { ...slideData };
                delete updateData.id;
                delete updateData._id;

                await db.collection('hero_slides').updateOne(
                    { _id: new ObjectId(updateId) },
                    { $set: updateData },
                );
            } else {
                await db.collection('hero_slides').insertOne(slideData);
            }

            return res.json({ success: true });
        } catch (error) {
            console.error('Error saving hero slide:', error);
            return res.status(500).json({ error: 'Failed to save hero slide' });
        }
    });

    app.delete('/api/hero-slides/:id', authenticateAdmin, async (req, res) => {
        try {
            const db = getDbOrRespond(res);
            if (!db) {
                return;
            }

            const { id } = req.params;
            await db.collection('hero_slides').deleteOne({ _id: new ObjectId(id) });
            return res.json({ success: true });
        } catch (error) {
            console.error('Error deleting hero slide:', error);
            return res.status(500).json({ error: 'Failed to delete hero slide' });
        }
    });

    app.get('/api/admin/hero-slides', authenticateAdmin, async (req, res) => {
        try {
            const db = getDbOrRespond(res);
            if (!db) {
                return;
            }

            const slides = await db.collection('hero_slides')
                .find({})
                .sort({ order: 1 })
                .toArray();
            return res.json(slides);
        } catch (error) {
            console.error('Error fetching admin hero slides:', error);
            return res.status(500).json({ error: 'Failed to fetch hero slides' });
        }
    });

    app.post('/api/admin/seed-hero-slides', authenticateAdmin, async (req, res) => {
        try {
            const db = getDbOrRespond(res);
            if (!db) {
                return;
            }

            const existingSlides = await db.collection('hero_slides').countDocuments();
            if (existingSlides > 0) {
                return res.json({ success: true, message: 'Hero slides already exist' });
            }

            const now = new Date();
            const sampleSlides = [
                {
                    title: 'Welcome to Smart Steam',
                    subtitle: 'Modern STEAM education platform for students and parents.',
                    image: 'https://images.unsplash.com/photo-1581726690015-c9861fa5057f?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
                    buttonText: 'View products',
                    buttonLink: '/products',
                    button2Text: 'View tutorials',
                    button2Link: '/tutorials',
                    order: 1,
                    isActive: true,
                    createdAt: now,
                    updatedAt: now,
                },
                {
                    title: 'Learn by building',
                    subtitle: 'Hands-on courses and projects for STEM and robotics.',
                    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
                    buttonText: 'Explore courses',
                    buttonLink: '/courses',
                    button2Text: 'Explore projects',
                    button2Link: '/projects',
                    order: 2,
                    isActive: true,
                    createdAt: now,
                    updatedAt: now,
                },
                {
                    title: 'Tools for modern labs',
                    subtitle: 'Curated kits and experiments for schools and makerspaces.',
                    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
                    buttonText: 'Shop now',
                    buttonLink: '/products',
                    button2Text: 'Contact us',
                    button2Link: '/contact',
                    order: 3,
                    isActive: true,
                    createdAt: now,
                    updatedAt: now,
                },
            ];

            await db.collection('hero_slides').insertMany(sampleSlides);
            return res.json({ success: true, message: 'Hero slides seeded successfully' });
        } catch (error) {
            console.error('Error seeding hero slides:', error);
            return res.status(500).json({ error: 'Failed to seed hero slides' });
        }
    });

    // Sitemap
    app.post('/api/admin/sitemap', authenticateAdmin, async (req, res) => {
        try {
            const { sitemap } = req.body;
            if (!sitemap) {
                return res.status(400).json({ error: 'Sitemap content is required' });
            }

            const sitemapPath = path.join(publicDir, 'sitemap.xml');
            fs.writeFileSync(sitemapPath, sitemap, 'utf8');
            return res.json({
                success: true,
                message: 'Sitemap saved successfully',
                path: '/sitemap.xml',
            });
        } catch (error) {
            console.error('Error saving sitemap:', error);
            return res.status(500).json({ error: 'Failed to save sitemap' });
        }
    });

    app.post('/api/admin/submit-sitemap', authenticateAdmin, async (req, res) => {
        try {
            const { sitemapUrl } = req.body;
            if (!sitemapUrl) {
                return res.status(400).json({ error: 'Sitemap URL is required' });
            }

            return res.json({
                success: true,
                message: 'Sitemap submission logged (Search Console integration pending)',
                sitemapUrl,
            });
        } catch (error) {
            console.error('Error submitting sitemap:', error);
            return res.status(500).json({ error: 'Failed to submit sitemap' });
        }
    });

    app.get('/sitemap.xml', (req, res) => {
        try {
            const sitemapPath = path.join(publicDir, 'sitemap.xml');
            if (!fs.existsSync(sitemapPath)) {
                return res.status(404).json({ error: 'Sitemap not found' });
            }

            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('Content-Type', 'application/xml');
            return res.sendFile(sitemapPath);
        } catch (error) {
            console.error('Error serving sitemap:', error);
            return res.status(500).json({ error: 'Failed to serve sitemap' });
        }
    });
}

module.exports = { registerSystemRoutes };
