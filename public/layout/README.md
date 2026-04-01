# Shared Layout

This folder is the single source of truth for global shell UI:

- `header.html`: global header fragment (injected once per page).
- `footer.html`: global footer fragment (injected once per page).
- `layout.css`: optional shared shell styles (only if your pages need it).

## How it works

Layout injection is handled by `src/layout/sharedLayout.js` and wired in `server.js`.

- Static page routes (`/about`, `/products`, `/news`, etc.) are rendered through `sendHtmlWithLayout(...)`.
- Direct `*.html` requests are handled by auto layout middleware.
- Existing page-level header/footer blocks are not re-injected.

## Opt out per page

If a page should not use global shell, add one of these markers:

- `<!-- layout:off -->`
- `data-layout-disabled="true"`
