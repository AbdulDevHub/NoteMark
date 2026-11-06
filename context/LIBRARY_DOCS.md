# Library Notes

Project-specific rules and gotchas for the third-party libraries NoteMark depends on, learned the
hard way. Check here before changing how a library is used; add an entry whenever a library
surprises you. Versions: MDXEditor 3.55, cmdk 1.1, jotai 2, Electron 45, Playwright 1.65.

## MDXEditor (`@mdxeditor/editor`)
- `onChange(markdown, initialMarkdownNormalize)`: ignore calls where the second argument is true; they are load-time normalisation, not edits.
- Plugins must be created once (`useMemo`); new plugin instances reset the editor.
- Remount with `key={note.id}` to load new content; `setMarkdown` would add to undo history.
- Theme: add the `dark-theme` class; colours are remapped to our tokens via `--base*`/`--accent*` variables on `.mdxeditor, .mdxeditor-popup-container` in `main.css`.
- Public class hooks: `mdxeditor-toolbar`, `mdxeditor-root-contenteditable`, `mdxeditor-popup-container`, `mdxeditor-rich-text-editor`, `mdxeditor-source-editor`. Other class names are hashed.
- Checklists draw the box with `li[role=checkbox]::before/::after`; Tailwind Typography list padding breaks this, hence the overrides in `main.css`.
- `Ctrl/⌘+K` opens the link dialog inside the editor. Our global shortcut handler skips `defaultPrevented` events so this keeps working.
- The placeholder element also gets `contentEditableClassName`; in tests select the editor with `getByRole('textbox', { name: 'editable markdown' })`.

## Tailwind Typography
- In `.note-prose`, `@apply prose` must come before our `--tw-prose-*` overrides or the defaults win (dark mode text turns black).

## cmdk
- The palette uses `shouldFilter={false}` and filters manually so content search results (from IPC) aren't hidden by cmdk's fuzzy filter.

## jotai
- Use the shared `appStore` (`store/atoms.ts`) for reads/writes outside React; `Provider store={appStore}` wraps the app.
- `atomWithStorage(..., { getOnInit: true })` so the remembered note/sidebar state is available on first render.

## Electron
- `titleBarOverlay` colours must be updated on `nativeTheme` `updated` (`setTitleBarOverlay`); not on macOS.
- `webContents.printToPDF` margins are in inches (`{ top, bottom, left, right }`); `marginType` no longer exists.
- Sandboxed preload can only `require('electron')`; shared code is fine because electron-vite bundles it.
- TypeScript ignores `index.d.ts` next to `index.ts`; the preload global typings live in `src/preload/context.d.ts`.

## Playwright (Electron)
- Playwright forces `prefers-color-scheme: light`; call `page.emulateMedia({ colorScheme: null })` to see the app's real theme.
- Native dialogs can be stubbed from the main process with `app.evaluate(({ dialog }) => ...)` (see the export test).
- Hidden/offscreen `BrowserWindow`s are clamped to the screen size, so `scripts/render-assets.mjs` uses Playwright + system Chrome/Edge instead.
