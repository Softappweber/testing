# soloDS Box Pro — Premium UI Redesign

## Deploy
This archive preserves the original `public/` application and customer configuration files.
For GitHub Pages at `/testing/public/dashboard.html?user=sushant`, upload the archive
contents to the repository root so `public/dashboard.html` remains in place.
Back up the existing repository first. Do not overwrite your live production deployment
until the testing branch works.

## Changed files
- `public/dashboard.html`: retains original Apps Script + OAuth business logic and
  the existing Photos, Notes, Links, Bookmarks and Files forms. Removes duplicate
  theme selector and loads new UI files.
- `public/solods-ui.css`: responsive premium design, sidebar, dashboard and popup.
- `public/solods-pro.js`: single theme popup (20 themes), overview, search of loaded
  collections, responsive gallery/file list toggle, local voice recorder, text-to-PDF
  browser print and local ZIP maker.
- Other original files and per-customer `config.js` are preserved.

## Known limitations
- This is a frontend redesign. Google OAuth must separately authorize the hosting
  origin; no frontend code can override an `origin_mismatch` response.
- Opening the dashboard requires no PIN. Existing backend authorization still
  determines which items can be listed or opened.
- PIN-only security for private Google Drive files is **not** implemented: it
  requires backend authentication/authorization. Do not use a browser-only PIN as
  a substitute for secure server-side checks.
- Search covers collections loaded in this browser session, not an entire Drive
  account. ZIP maker uses JSZip CDN; PDF uses browser print / Save as PDF.
- Browser recording is downloaded locally, not automatically uploaded to Drive.
- Original Apps Script backend, OAuth, and file operations are preserved but
  have not been verified end-to-end against the live Google services.
