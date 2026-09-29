# Changelog

All notable changes to this project are documented here.

## [Unreleased]

### Added

- Added an account page with sign-in methods: connect Yandex ID to an existing account, or disconnect it when a password remains.
- Added 404 and 500 pages for unknown addresses, missing or unpublished widgets, failed widget loads, and unexpected rendering errors.
- Added live SVG image export URLs and README-ready HTML snippets for public widgets.
- Added proportional `width` and `height` query scaling for SVG image URLs.
- Extracted shared widget SVG-rendering primitives for server-side export.
- Added shared `languageColor` utility used by both client and server.

### Changed

- Split the 1,200-line widget editor into layout rules, state/autosave, drag and preview hooks, and focused UI components, and shared the embed snippet builder between the gallery and the editor.
- Added client tests for widget rendering, scaling, editor layout rules and autosave, the API client token refresh, and the auth store.
- Removed the automatic palette mode; widgets are either light or dark, and existing auto widgets open as light.
- Unified widget rendering: the editor, public page, iframe embed and SVG export now share one geometry and typography module, so widgets look identical everywhere.
- The editor and public page render the widget at its real size and scale it to fit, instead of reflowing it to the screen width.
- Removed the "live widget preview" header and footer from inside the widget on the editor and public page.
- Stat values switch to compact notation (24.3K) when they do not fit their column; ratings are shown without decimals.

### Fixed

- Starting Yandex sign-in when it isn't configured now returns to the app with an error message instead of a raw JSON response.
- Fixed smaller block padding and larger fonts in SVG exports compared to the editor and iframe.
- Fixed widget size differences between the editor, public page, iframe and SVG export caused by viewport-relative padding.
- Removed the drop shadow that tinted the transparent corners of exported SVG and iframe widgets.
- Localized GitHub and LeetCode block labels in the HTML widget.
- Cached failed GitHub/LeetCode lookups for 60 seconds and shortened the SVG CDN cache for widgets with errors, so outages neither hammer external APIs nor stay pinned for 15 minutes.
- Made adding a block and resizing its widget a single database transaction.
- Pinned the server build output layout and added `typecheck:api` to CI so Vercel handlers can't silently lose `server/dist/src/app.js`.
- Localized LeetCode ranking and contest rating labels in Russian and English.
- Added live LeetCode contest rating data to rendered statistics.
- Added skeleton cards for the initial widgets gallery load instead of showing the empty state prematurely.
- Kept public iframe preview skeletons visible until the widget payload and block data are ready.
- Stabilized the public widget loading layout to prevent the decorative background orb from jumping.

### Security

- Rate limits now key on the real client IP behind the Vercel proxy instead of one shared proxy IP.
- Split auth rate limits: login, registration and OAuth stay strict; session refresh, `/me` and logout get a separate, higher limit.
- Yandex sign-in no longer links to an existing email/password account with the same email (which allowed pre-registered account takeover); such users get a clear message to sign in with their password.
- Updated `vitest`, `morgan` and `qs` to fix moderate-severity advisories.
- Resolved `deepmerge-ts` high-severity vulnerability via npm overrides (GHSA-ggr8-5vv4-36mx).

## [0.3.0] - 2026-08-02

### Added

- Added automatic redirects from auth pages for already authenticated users.
- Added localized authentication validation and API error messages in Russian and English.
- Added branded loading states for the editor and skeletons for iframe, public widget, and live previews.
- Added Russian and English project documentation and proprietary licensing terms.

### Changed

- Increased username autosave debounce to 1.5 seconds.
- Prevented stale autosave requests from overwriting newer editor input.
- Renamed project branding, package metadata, Docker Compose project name, API user agent, and auth cookies to WidgeCode.
- Added a stable `widgecode` Docker Compose project name for renamed root folders.

### Fixed

- Prevented auth form layout shifts when validation errors appear.
- Replaced the initial iframe loader with a widget skeleton while public data is loading.
- Kept public widget skeletons at the known widget dimensions instead of stretching them to the viewport.
- Kept private history routes on the authenticated shell when navigating back to the dashboard.

## [0.2.0] - 2026-08-02

### Added

- Added a widget builder with reusable GitHub, LeetCode, and text blocks.
- Added preset-based widget creation with configurable palettes, dimensions, and grid layouts.
- Added drag-and-drop block placement and resize controls in the desktop editor.
- Added live GitHub and LeetCode statistics previews with loading and fallback states.
- Added public widget pages and embeddable widget routes.
- Added GitHub API token support and rate-limit handling for statistics rendering.
- Added implementation prompts for infrastructure, auth, builder, and render phases.

### Changed

- Made public widget grids use square cells and preserve the configured widget width.
- Simplified public widget pages to render only the widget canvas.
- Changed generated slugs to describe the actual block types instead of the selected preset.
- Restricted the widget editor to desktop-sized screens and improved grid interactions.

### Fixed

- Restored reliable block placement, resizing, and layout persistence.
- Fixed LeetCode queries using unsupported GraphQL fields.
- Improved empty username, loading, and API error handling in widget previews.
