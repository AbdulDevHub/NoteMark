import { AppInfo, NoteInfo, ThemeSetting } from '@shared/models'
import { atom, createStore } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

/** One store for the whole app, so actions.ts can read and write state outside React. */
export const appStore = createStore()

export const appInfoAtom = atom<AppInfo | null>(null)

/** null while the first load is in flight. Always sorted, most recently edited first. */
export const notesAtom = atom<NoteInfo[] | null>(null)

export const selectedTitleAtom = atomWithStorage<string | null>(
  'notemark:selectedTitle',
  null,
  undefined,
  { getOnInit: true }
)

/**
 * The note loaded into the editor. `id` changes only when fresh content must be pushed into the
 * editor (opening a note, or an outside edit); a rename keeps the id so the editor isn't reset.
 */
export const openNoteAtom = atom<{ id: number; title: string; content: string } | null>(null)

/** Latest editor content, for the word count. Updated on every change. */
export const liveContentAtom = atom('')

export type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error'
export const saveStatusAtom = atom<SaveStatus>('saved')

export const themeAtom = atom<ThemeSetting>('system')

export const sidebarOpenAtom = atomWithStorage('notemark:sidebarOpen', true, undefined, {
  getOnInit: true
})
export const focusModeAtom = atom(false)
export const paletteOpenAtom = atom(false)
export const renamingAtom = atom(false)
export const sidebarQueryAtom = atom('')
