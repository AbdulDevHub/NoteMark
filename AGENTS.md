# AGENTS.md

Instructions for AI coding agents working on NoteMark. Read this first, then `context/` as needed.
After any meaningful change to this project, update this file, `context/PROGRESS_TRACKER.md`, and the
"Project Overview" section of `README.md` to reflect the current state. Do this proactively, without being asked.

## Overview

Electron desktop app for local-first Markdown notes. Each note is `<title>.md` directly inside the
notes folder (`~/NoteMark` by default); there is no database.

## Tech stack

Electron 45 + electron-vite 2 (Vite 5), React 18, TypeScript, Jotai, MDXEditor 3 (Lexical), cmdk,
Sonner, Tailwind CSS 3 + Typography, marked (export), Vitest 3, Playwright (Electron e2e). npm, Node ≥ 22.12.

## Commands

- Install: `npm install` (this machine has npm `ignore-scripts=true`; afterwards run `node node_modules/electron/install.js`)
- Dev: `npm run dev` · set `NOTEMARK_NOTES_DIR` / `NOTEMARK_USER_DATA` to keep real notes and settings out of it
- Verify: `npm run verify` (typecheck + lint + unit tests; same as CI)
- E2E: `npm run test:e2e` (builds first) · screenshots: `NOTEMARK_SCREENSHOTS=1 npx playwright test screenshots`
- Package: `npm run build:win` / `build:mac` / `build:linux`; release = push a `v*` tag (draft GitHub Release)
- Icon/social preview: `node scripts/render-assets.mjs` (sources: `build/icon.svg`, `scripts/social-preview.html`)

## Conventions

- Renderer never calls Node/Electron. New capability = method on `NoteMarkApi` (`src/shared/types.ts`) + channel in `ipcChannels` + handler in `src/main/lib/ipc.ts` + action in `src/renderer/src/store/actions.ts`.
- Components call actions, not `window.context`. State lives in the single jotai `appStore` (`store/atoms.ts`).
- File logic in `src/main/lib/notes.ts` takes the notes folder as its first argument and must not import Electron (it is unit-tested on temp dirs). Every path goes through `notePath()`.
- Pure helpers go in `src/shared/notes.ts` with tests in `notes.test.ts`.
- Autosave: always via `createAutosaver`; never write a note directly from a component. Rename/delete use `holdEdits`/`releaseEdits`.
- Colours only via tokens (`bg-canvas`, `text-muted`, `fg/10`, `accent`); see `context/UI_TOKENS.md`.
- Commits use gitmoji + conventional type (`✨ feat: ...`).
- Shell gotcha: a local guard hook blocks commands containing the word "format".

## Boundaries

- Don't loosen the CSP in `src/renderer/index.html`, `sandbox: true`, or the `isSafeExternalUrl` checks.
- Don't change the default notes folder name (`appDirectoryName`): existing users' notes live there.
- `docs/screenshots/*` and `build/icon.png` are generated; regenerate rather than hand-edit.

## More

- `README.md`: plain-language overview, features, shortcuts
- `context/PROGRESS_TRACKER.md`: current state and session log
- `context/ARCHITECTURE.md`, `context/LIBRARY_DOCS.md`, `context/UI_TOKENS.md`, `context/BUILD_PLAN.md`
