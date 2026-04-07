/**
 * fix-image-urls.js
 * 
 * Fixes all image URLs in the database by converting absolute smartsteam.vn
 * URLs to relative paths that work on any host (including Render).
 * 
 * Examples:
 *   https://smartsteam.vn/images/foo.webp  →  /images/foo.webp
 *   https://smartsteam.vn/uploads/bar.png  →  /uploads/bar.png
 *   http://smartsteam.vn/images/foo.webp   →  /images/foo.webp
 * 
 * Also fixes references inside HTML content fields.
 * 
 * Usage: node scripts/fix-image-urls.js
 */

const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');

// Load .env
function loadEnv() {
    try {
        const envPath = path.join(__dirname, '..', '.env');
        if (!fs.existsSync(envPath)) return;
        fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            const idx = trimmed.indexOf('=');
            if (idx <= 0) return;
            const key = trimmed.slice(0, idx).trim();
            if (process.env[key] !== undefined) return;
            let value = trimmed.slice(idx + 1).trim();
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            process.env[key] = value;
        });
    } catch (e) { /* ignore */ }
}

loadEnv();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/';
const DB_NAME = process.env.DB_NAME || 'stem_steam_education';

// Regex to match smartsteam.vn URLs (http or https)
const SMARTSTEAM_URL_RE = /https?:\/\/(?:www\.)?smartsteam\.vn\/(images|uploads)\//g;

function fixUrl(url) {
    if (!url || typeof url !== 'string') return url;
    return url.replace(SMARTSTEAM_URL_RE, '/$1/');
}

function fixHtmlContent(html) {
    if (!html || typeof html !== 'string') return html;
    return html.replace(SMARTSTEAM_URL_RE, '/$1/');
}

async function main() {
    console.log('=== FIX IMAGE URLS ===');
    console.log('Connecting to MongoDB...');
    console.log('DB:', DB_NAME);

    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    
    let totalFixed = 0;

    // --- 1. Fix tutorials ---
    console.log('\n--- Fixing tutorials ---');
    const tutorials = await db.collection('tutorials').find({}).toArray();
    for (const t of tutorials) {
        const updates = {};
        
        // featuredImage
        const fixedImage = fixUrl(t.featuredImage);
        if (fixedImage !== t.featuredImage) {
            updates.featuredImage = fixedImage;
            console.log(`  [tutorial] "${t.title}" featuredImage: ${t.featuredImage} → ${fixedImage}`);
        }
        
        // content (HTML)
        const fixedContent = fixHtmlContent(t.content);
        if (fixedContent !== t.content) {
            updates.content = fixedContent;
            console.log(`  [tutorial] "${t.title}" content: fixed smartsteam.vn URLs`);
        }
        
        if (Object.keys(updates).length > 0) {
            await db.collection('tutorials').updateOne({ _id: t._id }, { $set: updates });
            totalFixed++;
        }
    }
    console.log(`Tutorials checked: ${tutorials.length}`);

    // --- 2. Fix news ---
    console.log('\n--- Fixing news ---');
    const news = await db.collection('news').find({}).toArray();
    for (const n of news) {
        const updates = {};
        
        // image field
        const fixedImage = fixUrl(n.image);
        if (fixedImage !== n.image) {
            updates.image = fixedImage;
            console.log(`  [news] "${n.title}" image: ${n.image} → ${fixedImage}`);
        }
        
        // content (HTML)
        const fixedContent = fixHtmlContent(n.content);
        if (fixedContent !== n.content) {
            updates.content = fixedContent;
            console.log(`  [news] "${n.title}" content: fixed smartsteam.vn URLs`);
        }
        
        if (Object.keys(updates).length > 0) {
            await db.collection('news').updateOne({ _id: n._id }, { $set: updates });
            totalFixed++;
        }
    }
    console.log(`News checked: ${news.length}`);

    // --- 3. Fix projects ---
    console.log('\n--- Fixing projects ---');
    const projects = await db.collection('projects').find({}).toArray();
    for (const p of projects) {
        const updates = {};
        
        // image / featuredImage / thumbnail - check common fields
        for (const field of ['image', 'featuredImage', 'thumbnail']) {
            if (p[field]) {
                const fixed = fixUrl(p[field]);
                if (fixed !== p[field]) {
                    updates[field] = fixed;
                    console.log(`  [project] "${p.name}" ${field}: ${p[field]} → ${fixed}`);
                }
            }
        }
        
        // description (HTML content)
        const fixedDesc = fixHtmlContent(p.description);
        if (fixedDesc !== p.description) {
            updates.description = fixedDesc;
            console.log(`  [project] "${p.name}" description: fixed smartsteam.vn URLs`);
        }
        
        if (Object.keys(updates).length > 0) {
            await db.collection('projects').updateOne({ _id: p._id }, { $set: updates });
            totalFixed++;
        }
    }
    console.log(`Projects checked: ${projects.length}`);

    // --- 4. Fix products ---
    console.log('\n--- Fixing products ---');
    const products = await db.collection('products').find({}).toArray();
    for (const p of products) {
        const updates = {};
        
        // images array
        if (Array.isArray(p.images)) {
            const fixedImages = p.images.map(img => fixUrl(img));
            if (JSON.stringify(fixedImages) !== JSON.stringify(p.images)) {
                updates.images = fixedImages;
                console.log(`  [product] "${p.name}" images: fixed ${p.images.length} URLs`);
            }
        }
        
        // image field
        if (p.image) {
            const fixed = fixUrl(p.image);
            if (fixed !== p.image) {
                updates.image = fixed;
                console.log(`  [product] "${p.name}" image: ${p.image} → ${fixed}`);
            }
        }
        
        // description (HTML content)
        if (p.description) {
            const fixedDesc = fixHtmlContent(p.description);
            if (fixedDesc !== p.description) {
                updates.description = fixedDesc;
                console.log(`  [product] "${p.name}" description: fixed smartsteam.vn URLs`);
            }
        }
        
        if (Object.keys(updates).length > 0) {
            await db.collection('products').updateOne({ _id: p._id }, { $set: updates });
            totalFixed++;
        }
    }
    console.log(`Products checked: ${products.length}`);

    // --- 5. Fix hero_slides ---
    console.log('\n--- Fixing hero_slides ---');
    const slides = await db.collection('hero_slides').find({}).toArray();
    for (const s of slides) {
        const updates = {};
        
        for (const field of ['image', 'backgroundImage', 'mobileImage']) {
            if (s[field]) {
                const fixed = fixUrl(s[field]);
                if (fixed !== s[field]) {
                    updates[field] = fixed;
                    console.log(`  [hero_slide] ${field}: ${s[field]} → ${fixed}`);
                }
            }
        }
        
        if (Object.keys(updates).length > 0) {
            await db.collection('hero_slides').updateOne({ _id: s._id }, { $set: updates });
            totalFixed++;
        }
    }
    console.log(`Hero slides checked: ${slides.length}`);

    // --- Summary ---
    console.log('\n=== DONE ===');
    console.log(`Total documents fixed: ${totalFixed}`);
    
    await client.close();
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
