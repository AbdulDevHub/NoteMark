# Build Plan

Ordered steps for the NoteMark 2.0 upgrade and what comes after it.
Agents: work through unchecked items top to bottom, tick them off as they land, and keep scope to
what is listed here. Add new ideas to "Later" instead of slipping them into the current milestone.

## Milestone 2.0: from tutorial app to a real notes app

### 1. Foundations

- [x] Switch from Yarn 1 to npm; drop the broken `workspaces.nohoist` block (npm 12 rejects it)
- [x] Electron 28 (end of life) → 45, electron-builder 24 → 26, real app metadata (name, appId, author, repo)
- [x] Remove `fs-extra` and `lodash`; use `node:fs/promises` and small local helpers

### 2. Main process: safe, testable file layer

- [x] Pure note helpers in `src/shared/notes.ts` (title validation, unique "Untitled" names, excerpts, word count, search snippets)
- [x] File operations take the notes folder as an argument so tests can point them at a temp folder
- [x] Block path traversal: every title is validated and resolved inside the notes folder
- [x] Create notes instantly (no save dialog), rename notes, delete moves to the OS trash
- [x] Full-text search across all notes
- [x] Watch the notes folder so edits made outside the app show up
- [x] Settings file: notes folder, theme, window size/position, welcome-note flag
- [x] Export a note to HTML or PDF
- [x] Native right-click menu on notes (rename, reveal, export, delete)

### 3. Renderer: editor and UX

- [x] Select notes by title, not list index (index broke whenever the list re-sorted)
- [x] Debounced autosave keyed by note, flushed on switch/blur/close (old throttle could save into the wrong note)
- [x] Full editor: toolbar, links, tables, code blocks with highlighting, checklists, images, source mode
- [x] Custom title bar (hidden native frame), light/dark/system theme
- [x] Sidebar search, note excerpts, relative times; inline rename of the note title
- [x] Command palette (Ctrl/Cmd+K) for notes, content search and commands
- [x] Keyboard shortcuts, focus mode, status bar (words, reading time, save state), toasts
- [x] Remember the last open note; useful empty states

### 4. Quality and shipping

- [x] Vitest unit tests (shared helpers, file layer on a temp folder, autosave timing)
- [x] Playwright end-to-end smoke test that launches the built app
- [x] GitHub Actions: CI (typecheck, lint, tests) and tag-triggered release builds for Windows/macOS/Linux
- [x] README, repo description/topics, contributing docs, issue templates, social preview image

## Later

- Folders/tags and pinned notes
- Local images stored next to notes (needs a custom protocol for the `file:` paths)
- Auto-update via GitHub Releases (`electron-updater`), code signing for macOS/Windows
- Move to MDXEditor 4, Vite 6+ and ESLint 9 flat config
