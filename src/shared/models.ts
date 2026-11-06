export type NoteInfo = {
  title: string
  lastEditTime: number
  excerpt: string
}

export type NoteContent = string

export type SearchResult = {
  title: string
  lastEditTime: number
  /** Where the match was found. Title matches rank above content matches. */
  matchedIn: 'title' | 'content'
  snippet: string
}

export type ThemeSetting = 'system' | 'light' | 'dark'

export type ExportFormat = 'pdf' | 'html'

export type NoteContextAction = 'rename' | 'reveal' | 'export-pdf' | 'export-html' | 'delete'

/** Result of an operation that can fail with a message the user should see. */
export type Result<T> = { ok: true; value: T } | { ok: false; error: string }

export type AppInfo = {
  /** Value of `process.platform` in the main process, e.g. 'win32', 'darwin', 'linux'. */
  platform: string
  version: string
  notesDir: string
  theme: ThemeSetting
}
