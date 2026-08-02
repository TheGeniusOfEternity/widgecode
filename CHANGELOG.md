# Changelog

All notable changes to this project are documented here.

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
