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

// ---------------------------------------------------------------------------
// Env loader (for local .env file — production should set real env vars)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Environment detection
// ---------------------------------------------------------------------------
const IS_PRODUCTION = (process.env.NODE_ENV || '').toLowerCase() === 'production';

// ---------------------------------------------------------------------------
// Validate critical env vars in production
// ---------------------------------------------------------------------------
if (IS_PRODUCTION) {
    const required = ['MONGO_URI', 'DB_NAME', 'JWT_SECRET'];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        console.error('=== FATAL: Missing required environment variables ===');
        missing.forEach((key) => console.error(`  • ${key}`));
        console.error('Set these in your Render dashboard under Environment.');
        process.exit(1);
    }
}

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(__dirname, 'public');

// ---------------------------------------------------------------------------
// Media root — persistent disk on Render, local fallback for dev
// ---------------------------------------------------------------------------
// On Render with a persistent disk mounted at e.g. /opt/render/media,
// set MEDIA_ROOT=/opt/render/media. In development this defaults to
// ./media at the project root, keeping public/ for code-only assets.
const MEDIA_ROOT = process.env.MEDIA_ROOT || path.join(__dirname, 'media');

// Ensure media sub-directories exist
const MEDIA_IMAGES_DIR = path.join(MEDIA_ROOT, 'images');
const MEDIA_UPLOADS_DIR = path.join(MEDIA_ROOT, 'uploads');
const MEDIA_AVATARS_DIR = path.join(MEDIA_ROOT, 'images', 'avatars');

[MEDIA_ROOT, MEDIA_IMAGES_DIR, MEDIA_UPLOADS_DIR, MEDIA_AVATARS_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// ---------------------------------------------------------------------------
// Multer — uploads go to persistent MEDIA_ROOT/uploads
// ---------------------------------------------------------------------------
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, MEDIA_UPLOADS_DIR);
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

// ---------------------------------------------------------------------------
// MongoDB
// ---------------------------------------------------------------------------
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/';
const DB_NAME = process.env.DB_NAME || 'stem_steam_education';
let db;

// ---------------------------------------------------------------------------
// Auth and OAuth
// ---------------------------------------------------------------------------
let JWT_SECRET;
if (process.env.JWT_SECRET) {
    JWT_SECRET = process.env.JWT_SECRET;
} else if (IS_PRODUCTION) {
    // Should never reach here due to validation above, but extra safety
    console.error('FATAL: JWT_SECRET is required in production');
    process.exit(1);
} else {
    JWT_SECRET = crypto.randomBytes(64).toString('hex');
    console.warn('WARNING: JWT_SECRET is not set. Using ephemeral secret (dev only).');
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

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(compression());

// Trust Render's reverse proxy so req.ip and X-Forwarded-For work correctly
if (IS_PRODUCTION) {
    app.set('trust proxy', 1);
}

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

const allowedOrigins = [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'https://smartsteam.vn',
];
if (process.env.CORS_ORIGIN) {
    allowedOrigins.push(...process.env.CORS_ORIGIN.split(',').map((s) => s.trim()));
}

app.use(
    cors({
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ---------------------------------------------------------------------------
// Static serving
// ---------------------------------------------------------------------------
// Layout middleware for auto-injecting header/footer into HTML pages
app.use(createHtmlAutoLayoutMiddleware());

// Serve code/static assets from public/
app.use(express.static(PUBLIC_DIR));

// Serve persistent media from MEDIA_ROOT under /media URL prefix
app.use('/media', express.static(MEDIA_ROOT, { maxAge: IS_PRODUCTION ? '7d' : 0 }));

// Backward compat: also serve /images and /uploads from MEDIA_ROOT so old
// database URLs like /images/foo.webp still resolve after migration.
app.use('/images', express.static(MEDIA_IMAGES_DIR, { maxAge: IS_PRODUCTION ? '7d' : 0 }));
app.use('/uploads', express.static(MEDIA_UPLOADS_DIR, { maxAge: IS_PRODUCTION ? '7d' : 0 }));

// ---------------------------------------------------------------------------
// Health check — used by Render to verify the service is alive
// ---------------------------------------------------------------------------
app.get('/healthz', (req, res) => {
    res.status(200).json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        db: db ? 'connected' : 'disconnected',
    });
});

// ---------------------------------------------------------------------------
// Image conversion helper — writes to persistent MEDIA_ROOT
// ---------------------------------------------------------------------------
async function convertImageUrlToWebp(url) {
    if (!fs.existsSync(MEDIA_IMAGES_DIR)) {
        fs.mkdirSync(MEDIA_IMAGES_DIR, { recursive: true });
    }

    const rawName = path.parse((url || '').split('?')[0]).name.replace(/[^a-zA-Z0-9-_]/g, '') || 'image';
    const finalFilename = `${rawName}-${Date.now()}.webp`;
    const targetPath = path.join(MEDIA_IMAGES_DIR, finalFilename);

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
        // Check MEDIA_ROOT first, then PUBLIC_DIR for legacy images
        const mediaPath = path.join(MEDIA_ROOT, url.replace(/^\//, ''));
        const publicPath = path.join(PUBLIC_DIR, url.replace(/^\//, ''));
        const localPath = fs.existsSync(mediaPath) ? mediaPath : publicPath;
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

// ---------------------------------------------------------------------------
// Route modules
// ---------------------------------------------------------------------------
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
    mediaRoot: MEDIA_ROOT,
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
    mediaRoot: MEDIA_ROOT,
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
            ['admin', 'admin-login', 'products', 'news', 'tutorials', 'courses', 'projects', 'about', 'contact', 'resources', 'order', 'orders', 'cart', 'search', 'login', 'register', 'profile', 'forgot-password', 'terms', 'privacy', 'css', 'js', 'images', 'uploads', 'media', 'layout'].includes(slug) ||
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

// ---------------------------------------------------------------------------
// Server startup
// ---------------------------------------------------------------------------
async function startServer() {
    try {
        console.log('=== STARTING SERVER ===');
        console.log('Timestamp:', new Date().toISOString());
        console.log('Environment:', IS_PRODUCTION ? 'production' : 'development');
        console.log('Media root:', MEDIA_ROOT);
        console.log('Connecting to MongoDB...');

        // Never log the full URI in production (it contains credentials)
        if (IS_PRODUCTION) {
            console.log('MongoDB URI:', MONGO_URI.replace(/\/\/[^@]+@/, '//<credentials>@'));
        } else {
            console.log('MongoDB URI:', MONGO_URI);
        }
        console.log('Database name:', DB_NAME);

        const client = new MongoClient(MONGO_URI, {
            serverSelectionTimeoutMS: IS_PRODUCTION ? 15000 : 5000,
            connectTimeoutMS: IS_PRODUCTION ? 20000 : 10000,
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

        app.listen(PORT, '0.0.0.0', () => {
            console.log('=== SERVER STARTED SUCCESSFULLY ===');
            console.log('Server running on port:', PORT);
            if (!IS_PRODUCTION) {
                console.log('Local URL: http://localhost:' + PORT);
                console.log('Admin panel: http://localhost:' + PORT + '/admin');
            }
            console.log('Health check: /healthz');
            console.log('=== SERVER READY ===');

            // -----------------------------------------------------------------
            // Keep-alive self-ping — prevents Render free tier from spinning
            // down the service after 15 minutes of inactivity.
            // Pings /healthz every 14 minutes (only in production).
            // -----------------------------------------------------------------
            if (IS_PRODUCTION) {
                const KEEP_ALIVE_URL = process.env.RENDER_EXTERNAL_URL
                    ? `${process.env.RENDER_EXTERNAL_URL}/healthz`
                    : `https://ssteam.onrender.com/healthz`;
                const KEEP_ALIVE_INTERVAL_MS = 14 * 60 * 1000; // 14 minutes

                setInterval(async () => {
                    try {
                        const res = await fetch(KEEP_ALIVE_URL);
                        console.log(`[keep-alive] pinged ${KEEP_ALIVE_URL} — ${res.status}`);
                    } catch (err) {
                        console.warn('[keep-alive] ping failed:', err.message);
                    }
                }, KEEP_ALIVE_INTERVAL_MS);

                console.log(`[keep-alive] self-ping enabled every ${KEEP_ALIVE_INTERVAL_MS / 60000} min → ${KEEP_ALIVE_URL}`);
            }
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
