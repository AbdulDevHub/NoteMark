/**
 * Everything the UI can do, as plain async functions over the shared jotai store.
 * Components call these; they never talk to `window.context` directly.
 */
import { autoSaveDelayMs } from '@shared/constants'
import { ExportFormat, NoteInfo, Result, ThemeSetting } from '@shared/models'
import { sortByLastEdit } from '@shared/notes'
import { toast } from 'sonner'
import { createAutosaver } from '../lib/autosave'
import { focusEditor } from '../lib/editorHandle'
import {
  appInfoAtom,
  appStore as store,
  liveContentAtom,
  notesAtom,
  openNoteAtom,
  renamingAtom,
  saveStatusAtom,
  selectedTitleAtom,
  themeAtom
} from './atoms'

const api = window.context

let nextEditorId = 1
/** What we believe is on disk for the open note, to tell our own writes from outside edits. */
let lastKnownContent: string | null = null

const upsertNote = (info: NoteInfo, replaceTitle = info.title) => {
  const notes = store.get(notesAtom) ?? []
  store.set(
    notesAtom,
    sortByLastEdit([
      info,
      ...notes.filter((n) => n.title !== replaceTitle && n.title !== info.title)
    ])
  )
}

const autosaver = createAutosaver(async (title, content) => {
  store.set(saveStatusAtom, 'saving')
  try {
    const info = await api.writeNote(title, content)
    if (store.get(openNoteAtom)?.title === title) lastKnownContent = content
    upsertNote(info)
    if (!autosaver.hasPending()) store.set(saveStatusAtom, 'saved')
  } catch (error) {
    store.set(saveStatusAtom, 'error')
    toast.error(`Couldn't save "${title}"`, { description: String(error) })
    throw error
  }
}, autoSaveDelayMs)

export const flushSaves = () => autosaver.flush().catch(() => undefined)

// The main process asks for this before closing the window, and waits for it to finish.
api.onBeforeClose(flushSaves)

/**
 * While a note is being renamed or deleted, its file is about to move. Edits made in that window
 * are held here instead of being saved under the old title (which would recreate the old file).
 */
let held: { title: string; content: string | null } | null = null

const holdEdits = async (title: string) => {
  await flushSaves()
  held = { title, content: null }
}

/** Ends a hold; edits made meanwhile are saved under `saveAs`, or dropped when it is null. */
const releaseEdits = (saveAs: string | null) => {
  const content = held?.content ?? null
  held = null
  if (saveAs && content !== null) autosaver.schedule(saveAs, content)
}

export const onEditorChange = (markdown: string) => {
  const note = store.get(openNoteAtom)
  if (!note) return
  store.set(liveContentAtom, markdown)
  if (held?.title === note.title) {
    held.content = markdown
    store.set(saveStatusAtom, 'unsaved')
    return
  }
  // Clicking around can fire a change event with identical text; don't rewrite the file for it.
  if (markdown === lastKnownContent && !autosaver.hasPending(note.title)) return
  store.set(saveStatusAtom, 'unsaved')
  autosaver.schedule(note.title, markdown)
}

export const refreshNotes = async () => {
  const notes = await api.getNotes()
  store.set(notesAtom, notes)
  return notes
}

let openRequest = 0

export const openNote = async (title: string | null) => {
  const request = ++openRequest
  store.set(renamingAtom, false)
  store.set(selectedTitleAtom, title)
  // Finish writing the previous note first, so reopening it can't read stale text from disk.
  await flushSaves()
  if (request !== openRequest) return

  if (!title) {
    store.set(openNoteAtom, null)
    store.set(liveContentAtom, '')
    lastKnownContent = null
    return
  }

  try {
    const content = await api.readNote(title)
    if (request !== openRequest) return // a newer click won
    lastKnownContent = content
    store.set(openNoteAtom, { id: nextEditorId++, title, content })
    store.set(liveContentAtom, content)
    store.set(saveStatusAtom, 'saved')
  } catch {
    if (request !== openRequest) return
    toast.error(`Couldn't open "${title}"`)
    store.set(selectedTitleAtom, null)
    store.set(openNoteAtom, null)
  }
}

export const init = async () => {
  const info = await api.getAppInfo()
  store.set(appInfoAtom, info)
  store.set(themeAtom, info.theme)

  const notes = await refreshNotes()
  const remembered = store.get(selectedTitleAtom)
  const initial = notes.find((n) => n.title === remembered) ?? notes[0]
  await openNote(initial?.title ?? null)
}

export const createNote = async () => {
  await flushSaves()
  const info = await api.createNote()
  upsertNote(info)
  await openNote(info.title)
  // Start with the title selected so the user can type a name straight away.
  store.set(renamingAtom, true)
}

export const renameOpenNote = async (newTitle: string) => {
  const note = store.get(openNoteAtom)
  store.set(renamingAtom, false)
  if (!note || newTitle.trim() === note.title) return true

  await holdEdits(note.title)
  const result = await api
    .renameNote(note.title, newTitle)
    .catch((error): Result<NoteInfo> => ({ ok: false, error: String(error) }))
  if (!result.ok) {
    releaseEdits(note.title)
    toast.error("Couldn't rename note", { description: result.error })
    return false
  }

  upsertNote(result.value, note.title)
  // Keep the editor id so the editor isn't reset; only the title changes.
  const current = store.get(openNoteAtom)
  if (current?.title === note.title) {
    store.set(openNoteAtom, { ...current, title: result.value.title })
  }
  if (store.get(selectedTitleAtom) === note.title) {
    store.set(selectedTitleAtom, result.value.title)
  }
  releaseEdits(result.value.title)
  return true
}

export const deleteNote = async (title: string) => {
  await holdEdits(title)
  const deleted = await api.deleteNote(title).catch(() => false)
  if (!deleted) {
    releaseEdits(title)
    return
  }
  releaseEdits(null)

  const notes = store.get(notesAtom) ?? []
  const index = notes.findIndex((n) => n.title === title)
  const remaining = notes.filter((n) => n.title !== title)
  store.set(notesAtom, remaining)

  if (store.get(selectedTitleAtom) === title) {
    const next = remaining[Math.min(index, remaining.length - 1)]
    await openNote(next?.title ?? null)
  }
  toast.success(`Moved "${title}" to the trash`)
}

export const exportNote = async (title: string, format: ExportFormat) => {
  await flushSaves()
  const id = toast.loading(`Exporting "${title}"…`)
  const result = await api.exportNote(title, format)
  if (!result.ok) toast.error(result.error, { id })
  else if (result.value === null) toast.dismiss(id)
  else toast.success(`Exported to ${result.value}`, { id })
}

export const revealNote = (title: string) => api.revealNote(title)
export const openNotesFolder = () => api.openNotesFolder()

export const chooseNotesFolder = async () => {
  await flushSaves()
  const dir = await api.chooseNotesFolder()
  if (!dir) return
  const info = store.get(appInfoAtom)
  if (info) store.set(appInfoAtom, { ...info, notesDir: dir })
  const notes = await refreshNotes()
  await openNote(notes[0]?.title ?? null)
  toast.success('Notes folder changed', { description: dir })
}

export const setTheme = async (theme: ThemeSetting) => {
  store.set(themeAtom, theme)
  await api.setTheme(theme)
}

export const startRename = () => {
  if (store.get(openNoteAtom)) store.set(renamingAtom, true)
}

export const handleNoteContextMenu = async (title: string) => {
  const action = await api.showNoteContextMenu(title)
  switch (action) {
    case 'rename':
      if (store.get(openNoteAtom)?.title !== title) await openNote(title)
      startRename()
      break
    case 'reveal':
      await revealNote(title)
      break
    case 'export-pdf':
      await exportNote(title, 'pdf')
      break
    case 'export-html':
      await exportNote(title, 'html')
      break
    case 'delete':
      await deleteNote(title)
      break
  }
}

/** Reacts to edits made outside NoteMark (another editor, sync tools, Git). */
export const handleExternalChanges = async (changedTitles: string[]) => {
  const notes = await refreshNotes()
  const open = store.get(openNoteAtom)
  if (!open || !changedTitles.includes(open.title)) return

  if (!notes.some((n) => n.title === open.title)) {
    toast.info(`"${open.title}" was moved or deleted outside NoteMark`)
    await openNote(notes[0]?.title ?? null)
    return
  }

  // Our unsaved edits win; the next autosave will overwrite the file.
  if (autosaver.hasPending(open.title)) return

  const content = await api.readNote(open.title).catch(() => null)
  if (content === null || content === lastKnownContent) return
  // The user may have typed, or switched notes, while the file was being read.
  if (store.get(openNoteAtom)?.id !== open.id || autosaver.hasPending(open.title)) return
  if (store.get(liveContentAtom) !== lastKnownContent) return

  lastKnownContent = content
  store.set(openNoteAtom, { id: nextEditorId++, title: open.title, content })
  store.set(liveContentAtom, content)
  toast.info(`Reloaded "${open.title}"`, { description: 'It was changed outside NoteMark.' })
  focusEditor()
}
