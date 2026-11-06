/**
 * File-system layer for notes. Every function takes the notes folder as its first argument and
 * never imports Electron, so the whole module runs under Vitest against a temp folder.
 * A note is a `<title>.md` file directly inside the notes folder.
 */
import { fileEncoding, noteExtension } from '@shared/constants'
import { NoteInfo, Result, SearchResult } from '@shared/models'
import {
  makeExcerpt,
  matchNote,
  nextUntitledTitle,
  sortByLastEdit,
  titlesEqual,
  validateTitle
} from '@shared/notes'
import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Resolves a title to its file path, refusing anything that is not a plain file name directly
 * inside `rootDir`. This is the guard against path traversal from the renderer.
 */
export const notePath = (rootDir: string, title: string) => {
  const result = validateTitle(title)
  if (!result.ok) throw new Error(result.error)

  const resolvedRoot = path.resolve(rootDir)
  const file = path.resolve(resolvedRoot, `${result.value}${noteExtension}`)
  if (path.dirname(file) !== resolvedRoot) throw new Error('Invalid note title.')

  return file
}

const isNoteFile = (name: string) => name.endsWith(noteExtension) && !name.startsWith('.')

const titleFromFile = (name: string) => name.slice(0, -noteExtension.length)

export const ensureNotesDir = (rootDir: string) => mkdir(rootDir, { recursive: true })

export const listTitles = async (rootDir: string) => {
  await ensureNotesDir(rootDir)
  const entries = await readdir(rootDir, { withFileTypes: true })
  return entries.filter((e) => e.isFile() && isNoteFile(e.name)).map((e) => titleFromFile(e.name))
}

export const getNoteInfo = async (rootDir: string, title: string): Promise<NoteInfo> => {
  const file = notePath(rootDir, title)
  const [stats, content] = await Promise.all([stat(file), readFile(file, fileEncoding)])
  return { title, lastEditTime: stats.mtimeMs, excerpt: makeExcerpt(content, 140, title) }
}

/** All notes, most recently edited first. Unreadable files are skipped rather than failing the list. */
export const getNotes = async (rootDir: string): Promise<NoteInfo[]> => {
  const titles = await listTitles(rootDir)
  const infos = await Promise.allSettled(titles.map((t) => getNoteInfo(rootDir, t)))
  return sortByLastEdit(infos.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : [])))
}

export const readNote = (rootDir: string, title: string) =>
  readFile(notePath(rootDir, title), fileEncoding)

export const writeNote = async (rootDir: string, title: string, content: string) => {
  await writeFile(notePath(rootDir, title), content, fileEncoding)
  return getNoteInfo(rootDir, title)
}

export const createNote = async (rootDir: string, content = '') => {
  const title = nextUntitledTitle(await listTitles(rootDir))
  // 'wx' fails instead of overwriting if a file appeared since we listed the folder.
  await writeFile(notePath(rootDir, title), content, { encoding: fileEncoding, flag: 'wx' })
  return getNoteInfo(rootDir, title)
}

export const renameNote = async (
  rootDir: string,
  oldTitle: string,
  newTitle: string
): Promise<Result<NoteInfo>> => {
  const validated = validateTitle(newTitle)
  if (!validated.ok) return validated
  const title = validated.value

  if (title === oldTitle) return { ok: true, value: await getNoteInfo(rootDir, oldTitle) }

  // A case-only rename ("todo" → "Todo") is fine; anything else must not clash with another note.
  const clash = (await listTitles(rootDir)).find(
    (t) => titlesEqual(t, title) && !titlesEqual(t, oldTitle)
  )
  if (clash) return { ok: false, error: `A note called "${clash}" already exists.` }

  await rename(notePath(rootDir, oldTitle), notePath(rootDir, title))
  return { ok: true, value: await getNoteInfo(rootDir, title) }
}

/** Title matches first, then content matches; most recent first within each group. */
export const searchNotes = async (rootDir: string, query: string): Promise<SearchResult[]> => {
  if (!query.trim()) return []

  const notes = await getNotes(rootDir)
  const results = await Promise.all(
    notes.map(async (note): Promise<SearchResult | null> => {
      const content = await readNote(rootDir, note.title).catch(() => '')
      const match = matchNote(note.title, content, query)
      return match && { title: note.title, lastEditTime: note.lastEditTime, ...match }
    })
  )

  const found = results.filter((r): r is SearchResult => r !== null)
  return [
    ...found.filter((r) => r.matchedIn === 'title'),
    ...found.filter((r) => r.matchedIn === 'content')
  ]
}
