# Changelog

All notable changes to this project are documented here.

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
