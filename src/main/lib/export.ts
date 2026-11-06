/**
 * Turns a note into a standalone HTML page or a PDF. PDFs are printed from a hidden window
 * with JavaScript disabled, so raw HTML inside a note can't run code during export.
 */
import { BrowserWindow } from 'electron'
import { marked } from 'marked'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

const styles = `
  :root { color-scheme: light; }
  body {
    font: 16px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1d1d1f; max-width: 760px; margin: 48px auto; padding: 0 24px;
  }
  h1, h2, h3, h4 { line-height: 1.25; margin: 1.6em 0 0.6em; }
  h1 { font-size: 2em; } h2 { font-size: 1.5em; border-bottom: 1px solid #e5e5e5; padding-bottom: .3em; }
  a { color: #b7791f; }
  code { font: 0.9em ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background: #f3f3f1; padding: .15em .35em; border-radius: 4px; }
  pre { background: #f6f6f4; padding: 14px 16px; border-radius: 8px; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  blockquote { margin: 1em 0; padding: 0 1em; color: #555; border-left: 3px solid #e2b04a; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  th, td { border: 1px solid #ddd; padding: 6px 12px; text-align: left; }
  th { background: #f6f6f4; }
  img { max-width: 100%; }
  hr { border: none; border-top: 1px solid #e5e5e5; margin: 2em 0; }
  li > input[type=checkbox] { margin-right: .5em; }
  .doc-title { font-size: 2.3em; margin-top: 0; }
  @media print { body { margin: 0 auto; } a { color: inherit; } }
`

export const renderNoteHtml = (title: string, markdown: string) => {
  const withoutFrontMatter = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
  const body = marked.parse(withoutFrontMatter, { gfm: true, async: false })

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="NoteMark">
<title>${escapeHtml(title)}</title>
<style>${styles}</style>
</head>
<body>
<h1 class="doc-title">${escapeHtml(title)}</h1>
${body}
</body>
</html>`
}

export const renderNotePdf = async (html: string) => {
  const tmpDir = await mkdtemp(path.join(tmpdir(), 'notemark-export-'))
  const tmpFile = path.join(tmpDir, 'note.html')
  await writeFile(tmpFile, html, 'utf8')

  const win = new BrowserWindow({
    show: false,
    webPreferences: { javascript: false, sandbox: true, contextIsolation: true }
  })

  try {
    await win.loadFile(tmpFile)
    return await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { top: 0.6, bottom: 0.6, left: 0.6, right: 0.6 }
    })
  } finally {
    win.destroy()
    await rm(tmpDir, { recursive: true, force: true })
  }
}
