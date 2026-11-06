/**
 * Pure helpers shared by the main and renderer processes. No Node or DOM APIs here,
 * so everything in this file is unit-tested directly (see notes.test.ts).
 */
import { maxTitleLength, untitledBaseName } from './constants'
import { NoteInfo, Result, SearchResult } from './models'

// Characters that are illegal in file names on at least one of Windows, macOS or Linux.
// eslint-disable-next-line no-control-regex
const illegalChars = /[<>:"/\\|?*\u0000-\u001f]/
const windowsReserved = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i

/**
 * Checks that a note title is safe to use as a file name on every OS NoteMark runs on.
 * Returns the trimmed title, or a message explaining what is wrong.
 */
export const validateTitle = (raw: string): Result<string> => {
  const title = raw.trim()

  if (!title) return { ok: false, error: 'A note needs a title.' }
  if (title.length > maxTitleLength) {
    return { ok: false, error: `Titles can be at most ${maxTitleLength} characters.` }
  }
  if (illegalChars.test(title)) {
    return { ok: false, error: 'Titles cannot contain any of these characters: < > : " / \\ | ? *' }
  }
  if (title.startsWith('.')) return { ok: false, error: 'Titles cannot start with a dot.' }
  if (title.endsWith('.')) return { ok: false, error: 'Titles cannot end with a dot.' }
  // "con.txt" is just as reserved as "con", so check the part before the first dot.
  if (windowsReserved.test(title.split('.')[0].trim())) {
    return { ok: false, error: `"${title}" is a reserved name on Windows.` }
  }

  return { ok: true, value: title }
}

export const titlesEqual = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

/** First free name in the sequence "Untitled", "Untitled 2", "Untitled 3", ... */
export const nextUntitledTitle = (existing: string[]) => {
  const taken = new Set(existing.map((t) => t.toLowerCase()))
  if (!taken.has(untitledBaseName.toLowerCase())) return untitledBaseName

  for (let n = 2; ; n++) {
    const candidate = `${untitledBaseName} ${n}`
    if (!taken.has(candidate.toLowerCase())) return candidate
  }
}

/** Turns Markdown into readable plain text for excerpts, search snippets and word counts. */
export const stripMarkdown = (markdown: string) =>
  markdown
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '') // front matter
    .replace(/^\s*(```|~~~).*$/gm, '') // code fence lines (keep the code itself)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // images → alt text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links → link text
    .replace(/<[^>]+>/g, '') // html tags
    .replace(/^\s{0,3}#{1,6}\s+/gm, '') // headings
    .replace(/^\s{0,3}>\s?/gm, '') // blockquotes
    .replace(/^\s*([-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?/gm, '') // list markers and checkboxes
    .replace(/^\s*([-*_]\s*){3,}$/gm, '') // horizontal rules
    .replace(/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/gm, '') // table separator rows
    .replace(/\|/g, ' ') // table cell borders
    .replace(/(\*\*|__|~~|\*|_|`)/g, '') // emphasis and inline code markers
    .replace(/\\([\\`*_{}[\]()#+\-.!|])/g, '$1') // escapes

const collapseWhitespace = (text: string) => text.replace(/\s+/g, ' ').trim()

/** Drops an opening heading that just repeats the note's title, so excerpts show real content. */
const withoutTitleHeading = (markdown: string, title: string) => {
  const match = markdown.match(/^\s*#{1,6}\s+(.+?)\s*(\r?\n|$)/)
  return match && titlesEqual(match[1], title) ? markdown.slice(match[0].length) : markdown
}

export const makeExcerpt = (markdown: string, maxLength = 140, title?: string) => {
  const body = title ? withoutTitleHeading(markdown, title) : markdown
  const text = collapseWhitespace(stripMarkdown(body))
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text
}

export const countWords = (markdown: string) =>
  stripMarkdown(markdown).match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)?.length ?? 0

/** Minutes at ~230 words per minute; 0 for an empty note. */
export const readingTimeMinutes = (words: number) => (words === 0 ? 0 : Math.ceil(words / 230))

/**
 * Case-insensitive search of one note. Returns null when the query is in neither the title
 * nor the body; otherwise says where it matched and gives a short snippet around the hit.
 */
export const matchNote = (
  title: string,
  content: string,
  query: string
): Pick<SearchResult, 'matchedIn' | 'snippet'> | null => {
  const needle = query.trim().toLowerCase()
  if (!needle) return null

  if (title.toLowerCase().includes(needle)) {
    return { matchedIn: 'title', snippet: makeExcerpt(content, 120, title) }
  }

  const text = collapseWhitespace(stripMarkdown(content))
  const index = text.toLowerCase().indexOf(needle)
  if (index === -1) return null

  const start = Math.max(0, index - 40)
  const end = Math.min(text.length, index + needle.length + 80)
  const snippet = `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`

  return { matchedIn: 'content', snippet }
}

export const sortByLastEdit = <T extends Pick<NoteInfo, 'lastEditTime'>>(notes: T[]) =>
  [...notes].sort((a, b) => b.lastEditTime - a.lastEditTime)

/** "Just now", "5 min ago", "3 h ago", "Yesterday", then a short date. */
export const formatRelativeTime = (ms: number, now = Date.now(), locale?: string) => {
  const diff = now - ms
  const minute = 60_000
  const hour = 60 * minute

  if (diff < minute) return 'Just now'
  if (diff < hour) return `${Math.floor(diff / minute)} min ago`

  const then = new Date(ms)
  const today = new Date(now)
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()

  if (ms >= startOfToday) return `${Math.floor(diff / hour)} h ago`
  if (ms >= startOfToday - 24 * hour) return 'Yesterday'

  return then.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    ...(then.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {})
  })
}
