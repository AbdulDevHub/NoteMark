# Security Policy

NoteMark reads and writes files on your computer, so security reports are taken seriously.

## Reporting a vulnerability

Please **do not** open a public issue. Use GitHub's [private vulnerability reporting](https://github.com/AbdulDevHub/NoteMark/security/advisories/new) instead, and include steps to reproduce. You should hear back within a week.

## Supported versions

Only the latest release receives fixes.

## How NoteMark protects your files

- The page that renders your notes runs sandboxed, with context isolation and no Node.js access.
- Every file operation goes through a small, typed IPC API. Note titles are validated in the main process, so they cannot point outside the notes folder.
- Links open in your default browser; only `http`, `https` and `mailto` links are allowed, and the app window cannot be navigated away.
- PDF export renders notes in a hidden window with JavaScript disabled.
