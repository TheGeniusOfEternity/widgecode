---
name: release
description: Prepare a WidgeCode release — bump versions in all package.json files, move CHANGELOG Unreleased entries under a dated version, and create the release commit. Use when asked to cut, prepare, or tag a release or bump the version.
argument-hint: '[major|minor|patch|x.y.z]'
disable-model-invocation: true
---

# Release

1. Confirm the target version with the user if not given (semver; pre-1.0 so features bump minor).
2. Make sure `main` is up to date and the `verify` skill passes.
3. Bump `"version"` in `package.json`, `client/package.json`, and `server/package.json` to the same value, then `npm install --package-lock-only` to sync `package-lock.json`.
4. In `CHANGELOG.md`, rename `## [Unreleased]` content into `## [x.y.z] - YYYY-MM-DD` (today's date) and leave an empty `## [Unreleased]` above it. Keep Keep-a-Changelog sections (Added / Changed / Fixed / Security); drop empty ones. Entries are past tense, user-facing, one line each.
5. Commit: `chore(release): prepare vX.Y.Z` on a `chore/release-x.y.z` branch and open a PR — only when the user asks to commit/push.
6. After merge, tagging (`git tag vX.Y.Z && git push --tags`) is done only on explicit request.
