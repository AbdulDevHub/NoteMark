# Progress Tracker

Running record of where NoteMark stands, so a new session can pick up without rediscovering it.
Update "Current state", "In progress" and "Next steps" after each meaningful change, and add a
dated entry to the session log (newest first). Fold stale log entries into "Earlier history".

## Current state
- Version 2.0.0: full editor (tables, code, checklists, source mode), command palette with full-text search, inline rename, PDF/HTML export, trash-based delete, external-edit sync, themes, focus mode, custom title bar, new icon.
- `npm run verify` passes (typecheck, lint, 41 unit tests). 5 Playwright e2e tests pass against the built app, and the packaged Windows build (`electron-builder --dir`) launches cleanly.
- Released: v2.0.0 is published on GitHub Releases (Windows .exe, macOS x64/arm64 .dmg, Linux .AppImage/.deb), merged via PR #5. CI and release workflows are green.

## In progress
- Nothing.

## Next steps
- Upload `docs/social-preview.png` in the repo's Settings → Social preview (no API for this).
- See `context/BUILD_PLAN.md` → "Later" (folders/tags, local images, auto-update, signing).
- Dev-only `npm audit` findings (Vite 5/esbuild dev server, vitest 3) clear with a Vite 6+/Vitest 4 upgrade; production deps have 0 known issues.

## Session log

### 2026-11-05: NoteMark 2.0 upgrade
- Moved Yarn 1 → npm (npm 12 rejected the old `workspaces.nohoist` block); Electron 28 → 45; dropped fs-extra and lodash.
- Rebuilt the main process into testable modules (notes, ipc, settings, watcher, export) with path-traversal protection.
- Rewrote the renderer: title-based selection, a per-note debounced autosave queue, MDXEditor with all plugins, cmdk palette, new design with light/dark tokens.
- A review pass found 4 data-loss races (close before save, edits during rename/delete, external reload vs. typing, stale read on quick switch). All fixed; the close case has an e2e test.
- Added Vitest, Playwright e2e and screenshot specs, GitHub workflows, issue templates, README/CHANGELOG/CONTRIBUTING/SECURITY, an app icon and a social preview.
- Running the dev app once created `~/NoteMark/Welcome.md` (normal first-run behaviour).

## Earlier history
- 2024: built from an Electron + React tutorial (v1.0.0). Notes saved in `~/NoteMark`. A Nov 2026 fix (#4) made saving work on any OS.
