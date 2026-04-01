function createSharedLayout({ fs, path, publicDir }) {
    const resolvedPublicDir = path.resolve(publicDir);
    const sharedLayoutDir = path.join(resolvedPublicDir, 'layout');
    const sharedHeaderPath = path.join(sharedLayoutDir, 'header.html');
    const sharedFooterPath = path.join(sharedLayoutDir, 'footer.html');
    const sharedLayoutCache = {
        header: '',
        footer: '',
        headerMtimeMs: -1,
        footerMtimeMs: -1,
    };

    function readSharedPartialCached(filePath, key) {
        const mtimeKey = key === 'header' ? 'headerMtimeMs' : 'footerMtimeMs';

        try {
            const stat = fs.statSync(filePath);
            if (sharedLayoutCache[mtimeKey] !== stat.mtimeMs) {
                sharedLayoutCache[key] = fs.readFileSync(filePath, 'utf8');
                sharedLayoutCache[mtimeKey] = stat.mtimeMs;
            }
            return sharedLayoutCache[key];
        } catch (_) {
            sharedLayoutCache[key] = '';
            sharedLayoutCache[mtimeKey] = -1;
            return '';
        }
    }

    function buildSharedLayoutPartials(requestPath = '/') {
        let header = readSharedPartialCached(sharedHeaderPath, 'header');
        let footer = readSharedPartialCached(sharedFooterPath, 'footer');
        const currentPath = requestPath || '/';
        const currentYear = String(new Date().getFullYear());

        if (header) {
            header = header.replace(/\{\{CURRENT_PATH\}\}/g, currentPath);
        }

        if (footer) {
            footer = footer
                .replace(/\{\{CURRENT_PATH\}\}/g, currentPath)
                .replace(/\{\{CURRENT_YEAR\}\}/g, currentYear);
        }

        return { header, footer };
    }

    function injectSharedLayout(html, requestPath = '/') {
        const content = String(html || '');
        if (!content) {
            return content;
        }

        const normalizedPath = String(requestPath || '/').toLowerCase();
        if (
            normalizedPath === '/admin' ||
            normalizedPath === '/admin-login' ||
            normalizedPath.startsWith('/admin/')
        ) {
            return content;
        }

        if (content.includes('<!-- layout:off -->') || content.includes('data-layout-disabled="true"')) {
            return content;
        }

        const { header, footer } = buildSharedLayoutPartials(requestPath);
        if (!header && !footer) {
            return content;
        }

        function injectLayoutStylesheet(input) {
            const cssHrefRegex = /href=["']\/layout\/layout\.css["']/i;
            if (cssHrefRegex.test(input)) {
                return input;
            }

            if (/<\/head>/i.test(input)) {
                return input.replace(
                    /<\/head>/i,
                    '    <link rel="stylesheet" href="/layout/layout.css">\n</head>'
                );
            }

            return `<link rel="stylesheet" href="/layout/layout.css">\n${input}`;
        }

        let rendered = content;
        const hasExistingHeader = /<header(\s|>)/i.test(rendered);
        const hasExistingFooter = /<footer(\s|>)/i.test(rendered);
        const shouldInjectHeader = header && !rendered.includes('data-global-header') && !hasExistingHeader;
        const shouldInjectFooter = footer && !rendered.includes('data-global-footer') && !hasExistingFooter;

        if (!shouldInjectHeader && !shouldInjectFooter) {
            return injectLayoutStylesheet(content);
        }

        if (shouldInjectHeader) {
            if (/<body[^>]*>/i.test(rendered)) {
                rendered = rendered.replace(/<body([^>]*)>/i, (match) => `${match}\n${header}`);
            } else {
                rendered = `${header}\n${rendered}`;
            }
        }

        if (shouldInjectFooter) {
            if (/<\/body>/i.test(rendered)) {
                rendered = rendered.replace(/<\/body>/i, `${footer}\n</body>`);
            } else {
                rendered = `${rendered}\n${footer}`;
            }
        }

        return injectLayoutStylesheet(rendered);
    }

    function resolvePublicHtmlRelativePath(requestPath = '/') {
        const cleanPath = (requestPath || '/').split('?')[0];
        const normalizedPath = cleanPath === '/' ? '/index.html' : cleanPath;

        if (!normalizedPath.toLowerCase().endsWith('.html')) {
            return null;
        }

        return normalizedPath.replace(/^\/+/, '');
    }

    function sendHtmlWithLayout(res, relativeHtmlPath, requestPath = '/') {
        try {
            const safeRelative = String(relativeHtmlPath || '').replace(/^\/+/, '');
            if (!safeRelative || !safeRelative.toLowerCase().endsWith('.html')) {
                return res.status(400).send('Invalid HTML path');
            }

            const fullPath = path.resolve(resolvedPublicDir, safeRelative);
            if (!fullPath.startsWith(resolvedPublicDir + path.sep) && fullPath !== resolvedPublicDir) {
                return res.status(400).send('Invalid path');
            }

            if (!fs.existsSync(fullPath)) {
                return res.status(404).send('Page not found');
            }

            const rawHtml = fs.readFileSync(fullPath, 'utf8');
            const renderedHtml = injectSharedLayout(rawHtml, requestPath);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.send(renderedHtml);
        } catch (error) {
            console.error('Error rendering HTML with shared layout:', error);
            return res.status(500).send('Internal Server Error');
        }
    }

    function createHtmlAutoLayoutMiddleware() {
        return (req, res, next) => {
            if (req.method !== 'GET' && req.method !== 'HEAD') {
                return next();
            }

            if (req.path.startsWith('/api/') || req.path.startsWith('/layout/')) {
                return next();
            }

            const htmlRelativePath = resolvePublicHtmlRelativePath(req.path);
            if (!htmlRelativePath) {
                return next();
            }

            const fullPath = path.resolve(resolvedPublicDir, htmlRelativePath);
            if (!fs.existsSync(fullPath)) {
                return next();
            }

            return sendHtmlWithLayout(res, htmlRelativePath, req.path);
        };
    }

    return {
        sendHtmlWithLayout,
        createHtmlAutoLayoutMiddleware,
        injectSharedLayout,
        resolvePublicHtmlRelativePath,
    };
}

module.exports = { createSharedLayout };
