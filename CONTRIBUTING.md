# Contributing to NoteMark

Thanks for taking the time to help. Bug reports, ideas and pull requests are all welcome.

## Reporting bugs and ideas

Use the [issue templates](https://github.com/AbdulDevHub/NoteMark/issues/new/choose). For bugs, include your OS, the NoteMark version and the steps that trigger the problem.

## Local setup

You need Node.js 22.12 or newer.

```bash
npm install
npm run dev
```

While developing, point the app at a scratch folder so your real notes stay untouched:

```bash
# macOS / Linux
NOTEMARK_NOTES_DIR=/tmp/notemark-dev npm run dev
# Windows (PowerShell)
$env:NOTEMARK_NOTES_DIR="$env:TEMP\notemark-dev"; npm run dev
```

## Before opening a pull request

```bash
npm run verify      # typecheck, lint, unit tests (CI runs the same)
npm run test:e2e    # builds the app and drives it with Playwright
```

- Keep pull requests focused on one change.
- Add or update tests when you change behaviour. Pure logic belongs in `src/shared/` or `src/main/lib/` where it is easy to unit test.
- The renderer must not use Node or Electron APIs directly. Add a typed method to `NoteMarkApi` in `src/shared/types.ts`, handle it in `src/main/lib/ipc.ts`, and call it from `src/renderer/src/store/actions.ts`.
- If you change the UI, regenerate the README screenshots: `npm run build`, then `NOTEMARK_SCREENSHOTS=1 npx playwright test screenshots`.

## Project layout

```
src/main/       Electron main process: window, IPC handlers, file layer, export, watcher
src/preload/    The typed bridge exposed to the page as window.context
src/renderer/   React UI: components, Jotai store, autosave
src/shared/     Types and pure helpers used by both sides
e2e/            Playwright tests that launch the real app
```
