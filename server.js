const express = require('express');
const path = require('path');
const compression = require('compression');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const sharp = require('sharp');
const { OAuth2Client } = require('google-auth-library');

const { registerUserAuthRoutes, setUserAuthDb } = require('./src/routes/userAuthRoutes');
const { registerContentRoutes, setContentDb } = require('./src/routes/contentRoutes');
const { registerPageRoutes, setPageRoutesDb } = require('./src/routes/pageRoutes');
const { registerAdminRoutes, setAdminDb } = require('./src/routes/adminRoutes');
const { registerSystemRoutes } = require('./src/routes/systemRoutes');
const { createSharedLayout } = require('./src/layout/sharedLayout');
const { createAuthMiddleware } = require('./src/middleware/auth');

function loadEnvFile(envFilePath) {
    try {
        if (!fs.existsSync(envFilePath)) {
            return;
        }
        const raw = fs.readFileSync(envFilePath, 'utf8');
        raw.split(/\r?\n/).forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) {
                return;
            }

            const separatorIndex = trimmed.indexOf('=');
            if (separatorIndex <= 0) {
                return;
            }

            const key = trimmed.slice(0, separatorIndex).trim();
            if (!key || process.env[key] !== undefined) {
                return;
            }

            let value = trimmed.slice(separatorIndex + 1).trim();
            if (
                (value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))
            ) {
                value = value.slice(1, -1);
            }
            process.env[key] = value;
        });
    } catch (error) {
        console.warn('Could not load .env file:', error.message);
    }
}

loadEnvFile(path.join(__dirname, '.env'));

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(PUBLIC_DIR, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    },
});

// MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/';
const DB_NAME = process.env.DB_NAME || 'stem_steam_education';
let db;

// Auth and OAuth
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
if (!process.env.JWT_SECRET) {
    console.warn('WARNING: JWT_SECRET is not set. Using an ephemeral secret for this process only.');
}
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `http://localhost:${PORT}/api/auth/google/callback`;
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.warn('WARNING: Google OAuth is not fully configured. Google login endpoints will return 503.');
}
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);

const { sendHtmlWithLayout, createHtmlAutoLayoutMiddleware } = createSharedLayout({
    fs,
    path,
    publicDir: PUBLIC_DIR,
});

const { authenticateAdmin, authenticateUser } = createAuthMiddleware({
    jwt,
    JWT_SECRET,
    ObjectId,
    getDb: () => db,
});

// Middleware
app.use(compression());

app.use((req, res, next) => {
    try {
        res.setHeader(
            'Content-Security-Policy',
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://www.gstatic.com https://accounts.google.com https://apis.google.com; " +
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; " +
            "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:; " +
            "img-src 'self' data: https: blob:; " +
            "media-src 'self' data: https: blob:; " +
            "connect-src 'self' https://api.paypal.com https://api.stripe.com https://accounts.google.com; " +
            "frame-src 'self' https://www.google.com https://accounts.google.com; " +
            "object-src 'none'; " +
            "base-uri 'self'; " +
            "form-action 'self' https://accounts.google.com; " +
            "frame-ancestors 'none';"
        );

        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        next();
    } catch (error) {
        console.error('Error setting security headers:', error);
        next();
    }
});

app.use(
    cors({
        origin: ['http://localhost:8080', 'http://127.0.0.1:8080', 'https://smartsteam.vn'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(createHtmlAutoLayoutMiddleware());
app.use(express.static(PUBLIC_DIR));

// Shared helper for image conversion
async function convertImageUrlToWebp(url) {
    const imagesDir = path.join(PUBLIC_DIR, 'images');
    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
    }

    const rawName = path.parse((url || '').split('?')[0]).name.replace(/[^a-zA-Z0-9-_]/g, '') || 'image';
    const finalFilename = `${rawName}-${Date.now()}.webp`;
    const targetPath = path.join(imagesDir, finalFilename);

    const isRemote = /^https?:\/\//i.test(url || '');
    const isData = /^data:image\//i.test(url || '');
    const isLocalPublic = url && url.startsWith('/');

    if (isData) {
        const base64 = (url.split(',')[1] || '').trim();
        const buffer = Buffer.from(base64, 'base64');
        await sharp(buffer).rotate().toFormat('webp', { quality: 80 }).toFile(targetPath);
    } else if (isRemote) {
        const resp = await fetch(url);
        if (!resp.ok) {
            throw new Error(`Failed to fetch source image (${resp.status})`);
        }
        const arrayBuf = await resp.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        await sharp(buffer).rotate().toFormat('webp', { quality: 80 }).toFile(targetPath);
    } else if (isLocalPublic) {
        const localPath = path.join(PUBLIC_DIR, url.replace(/^\//, ''));
        if (!fs.existsSync(localPath)) {
            throw new Error('Local source image not found');
        }
        await sharp(localPath).rotate().toFormat('webp', { quality: 80 }).toFile(targetPath);
    } else {
        const relPath = path.join(PUBLIC_DIR, url);
        if (!fs.existsSync(relPath)) {
            throw new Error('Unsupported url format');
        }
        await sharp(relPath).rotate().toFormat('webp', { quality: 80 }).toFile(targetPath);
    }

    return `/images/${finalFilename}`;
}

// Route modules
registerUserAuthRoutes(app, {
    ObjectId,
    jwt,
    JWT_SECRET,
    bcrypt,
    sharp,
    upload,
    fs,
    path,
    publicDir: PUBLIC_DIR,
    googleClient,
    GOOGLE_CLIENT_ID,
    authenticateUser,
});

registerContentRoutes(app, {
    ObjectId,
    authenticateAdmin,
});

registerSystemRoutes(app, {
    express,
    fs,
    path,
    sharp,
    upload,
    ObjectId,
    authenticateAdmin,
    authenticateUser,
    getDb: () => db,
    publicDir: PUBLIC_DIR,
    convertImageUrlToWebp,
});

registerPageRoutes(app, {
    sendHtmlWithLayout,
});

registerAdminRoutes(app, {
    ObjectId,
    jwt,
    JWT_SECRET,
    authenticateAdmin,
    upload,
    convertImageUrlToWebp,
    sendHtmlWithLayout,
});

// Slug-based product route (must be last)
app.get('/:slug', async (req, res) => {
    try {
        const slug = req.params.slug;
        if (
            req.url.startsWith('/api/') ||
            req.url.startsWith('/news/') ||
            ['admin', 'admin-login', 'products', 'news', 'tutorials', 'courses', 'projects', 'about', 'contact', 'resources', 'order', 'orders', 'cart', 'search', 'login', 'register', 'profile', 'forgot-password', 'terms', 'privacy', 'css', 'js', 'images', 'uploads', 'layout'].includes(slug) ||
            slug.includes('.') ||
            slug === ''
        ) {
            return res.status(404).send('Page not found');
        }

        if (!db) {
            return res.status(500).send('Database not connected');
        }

        const product = await db.collection('products').findOne({ slug });
        if (!product) {
            return res.status(404).send('Page not found');
        }

        return sendHtmlWithLayout(res, 'product-detail.html', req.path);
    } catch (error) {
        console.error('Error in product slug route:', error);
        return res.status(500).send('Internal Server Error');
    }
});

async function startServer() {
    try {
        console.log('=== STARTING SERVER ===');
        console.log('Timestamp:', new Date().toISOString());
        console.log('Connecting to MongoDB...');
        console.log('MongoDB URI:', MONGO_URI);
        console.log('Database name:', DB_NAME);

        const client = new MongoClient(MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
        });

        await client.connect();
        db = client.db(DB_NAME);
        setUserAuthDb(db);
        setContentDb(db);
        setPageRoutesDb(db);
        setAdminDb(db);

        console.log('Connected to MongoDB successfully');
        const collections = await db.listCollections().toArray();
        console.log('Available collections:', collections.map((c) => c.name));

        app.listen(PORT, () => {
            console.log('=== SERVER STARTED SUCCESSFULLY ===');
            console.log('Server running on port:', PORT);
            console.log('Local URL: http://localhost:' + PORT);
            console.log('Network URL: http://0.0.0.0:' + PORT);
            console.log('Admin panel: http://localhost:' + PORT + '/admin');
            console.log('Environment:', process.env.NODE_ENV || 'development');
            console.log('=== SERVER READY ===');
        });
    } catch (error) {
        console.error('=== SERVER STARTUP FAILED ===');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

process.on('SIGINT', () => {
    console.log('Shutting down server gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Shutting down server gracefully...');
    process.exit(0);
});

startServer();
