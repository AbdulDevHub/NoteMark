# Architecture

How NoteMark is split across Electron's processes and where each kind of code belongs.
Read this before adding a feature that touches files, IPC or app state. Update it when a layer,
data flow or file location changes.

## Processes and layers

```
renderer (React, sandboxed)          preload                main (Node)
components ─▶ store/actions.ts ─▶ window.context ─IPC─▶ lib/ipc.ts ─▶ lib/notes.ts ─▶ disk
                ▲                                         │   lib/export.ts (marked → HTML/PDF)
                └──── notesChanged (external edits) ◀──── lib/watcher.ts (fs.watch, debounced)
```

| Path | Role |
| --- | --- |
| `src/shared/types.ts` | `NoteMarkApi` (the whole IPC surface) and channel names |
| `src/shared/models.ts` | `NoteInfo`, `SearchResult`, `Result<T>`, settings enums |
| `src/shared/notes.ts` | Pure helpers: title validation, Untitled naming, excerpts, word count, search match, relative time |
| `src/main/index.ts` | Window (hidden title bar + overlay), theme, bounds, single instance, save-before-close handshake |
| `src/main/lib/ipc.ts` | One handler per API method; dialogs, menus, shell, trash, welcome note |
| `src/main/lib/notes.ts` | File I/O on `<root>/<title>.md`; `notePath()` blocks traversal |
| `src/main/lib/settings.ts` | `settings.json` in userData (notesDir, theme, windowBounds, welcomeNoteCreated) |
| `src/main/lib/watcher.ts` | Reports external edits; ignores titles NoteMark wrote in the last 1.5 s |
| `src/preload/index.ts` | Builds `window.context` from `ipcChannels`; close handshake listener |
| `src/renderer/src/store/atoms.ts` | Single jotai `appStore` and all atoms |
| `src/renderer/src/store/actions.ts` | All UI operations (open, create, rename, delete, export, external reload) |
| `src/renderer/src/lib/autosave.ts` | Debounced, per-note, serialised save queue |

## Key flows

- **Open note**: `openNote(title)` sets the selection, awaits pending saves, reads the file, then sets `openNoteAtom` with a new `id`. The editor is keyed by `id`, so it remounts only for new content (not on rename).
- **Edit**: MDXEditor `onChange` → `onEditorChange` → `autosaver.schedule(title, md)` → `writeNote` after 800 ms idle, or immediately on note switch, blur, `Ctrl+S`, or window close.
- **Rename/delete**: `holdEdits(title)` flushes, then buffers edits until the file operation finishes; `releaseEdits(newTitle | null)` saves or drops them.
- **External edit**: watcher → `notesChanged(titles)` → `handleExternalChanges` refreshes the list and reloads the open note only if the user has no unsaved edits.
- **Close**: main prevents `close`, sends `beforeClose`, the renderer flushes and replies `readyToClose` (3 s timeout).
- **Theme**: `setTheme` → `nativeTheme.themeSource` in main → CSS `prefers-color-scheme` in the renderer (Tailwind `darkMode: 'media'`).

## Environment overrides
`NOTEMARK_NOTES_DIR` (notes folder) and `NOTEMARK_USER_DATA` (settings/profile) are used by tests
and screenshots; they win over saved settings.
