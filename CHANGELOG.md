# Changelog

All notable changes to NoteMark. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [2.0.0] - 2026-11-05

A rewrite of almost every part of the app.

### Added

- Full Markdown editor toolbar: tables, code blocks with syntax highlighting, links, images, checklists, horizontal rules and a raw source mode.
- Command palette (`Ctrl/⌘ + P`) to open notes, search inside every note and run commands.
- Instant note creation with inline naming, and rename from the title bar (`F2`).
- Export notes to PDF or HTML.
- Right-click menu on notes: rename, show in folder, export, delete.
- Light, dark and system themes; a custom title bar; focus mode.
- Sidebar filter, note previews, relative edit times, word count and reading time, save status.
- Changes made to the notes folder by other apps appear automatically.
- Choose a different notes folder. Window size, position, theme and last open note are remembered.
- Unit tests (Vitest), end-to-end tests (Playwright), CI and tag-based release builds for Windows, macOS and Linux.
- A new app icon.

### Changed

- Deleting a note moves it to the system trash instead of removing it permanently.
- Autosave waits until you pause typing, is tied to the note being edited, and finishes before the window closes.
- Upgraded to Electron 45 and switched from Yarn to npm.

### Fixed

- Edits could be saved into the wrong note when switching notes quickly.
- The selected note could change when the list re-sorted.
- Note titles could point outside the notes folder.
- Edit times were shown in UTC instead of local time.
- The welcome note reappeared whenever the folder was empty.

## [1.0.0] - 2024-04-30

- First release: a sidebar of Markdown notes with a WYSIWYG editor and autosave.

[2.0.0]: https://github.com/AbdulDevHub/NoteMark/releases/tag/v2.0.0
[1.0.0]: https://github.com/AbdulDevHub/NoteMark/commits/main
