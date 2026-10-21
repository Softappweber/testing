# soloDS Box Pro — Feature Expansion v4 (testing release)

Deploy `public/` under your existing GitHub testing folder and open `public/dashboard.html?user=sushant`.

## Implemented in this release
- Existing tabs, 20 themes, statistics, quick actions and backend kept.
- Photo auto-compression (Canvas, max 1920px, JPEG .85) for dashboard photo uploads, plus camera capture.
- File/photo preview iframe, authenticated Drive download, explicit-confirmation public share link (only if Google scope and file permissions allow).
- Google Drive storage meter, live search in loaded collections, favicon and copy-link actions.
- PDF generation with jsPDF and upload through existing Apps Script (20 MB limit).
- ZIP up to 20 loaded Drive files with JSZip and upload through existing Apps Script (20 MB limit).
- Optional local 4-digit screen lock, NOT server-side protection.

## Not implemented / not claimed
- Server-enforced private-file PIN access and reliable Google reauthentication for PIN reset.
- Full metadata editing/deletion for notes/bookmarks/links: existing backend endpoints not provided/verified.
- Voice recording to Drive: v3 voice tool is still local download only.
- Folder hierarchy browser and cross-device sync validation.
- Production certification or end-to-end Google Drive testing.

## Google Cloud Console Setup
Check Google Drive API is enabled, OAuth consent configured, and the JavaScript origin of your *testing* site is listed under the existing OAuth client. Do not expose client secrets. The existing `drive.file` scope may not permit operations on files not created/opened by this app.

## Verification
`node --check` for both JS files and local static integrity checks. Browser and live API tests are required.
