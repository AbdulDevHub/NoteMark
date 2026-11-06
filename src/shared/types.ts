import {
  AppInfo,
  ExportFormat,
  NoteContent,
  NoteContextAction,
  NoteInfo,
  Result,
  SearchResult,
  ThemeSetting
} from './models'

/**
 * Everything the renderer can ask the main process to do. The preload script exposes it as
 * `window.context`; each method maps 1:1 to an IPC channel of the same name (see ipcChannels).
 */
export interface NoteMarkApi {
  getAppInfo: () => Promise<AppInfo>
  getNotes: () => Promise<NoteInfo[]>
  readNote: (title: string) => Promise<NoteContent>
  writeNote: (title: string, content: NoteContent) => Promise<NoteInfo>
  /** Creates an empty note with the next free "Untitled" name and returns it. */
  createNote: () => Promise<NoteInfo>
  renameNote: (oldTitle: string, newTitle: string) => Promise<Result<NoteInfo>>
  /** Asks for confirmation, then moves the note to the OS trash. */
  deleteNote: (title: string) => Promise<boolean>
  searchNotes: (query: string) => Promise<SearchResult[]>
  /** Returns the saved file path, or null if the user cancelled. */
  exportNote: (title: string, format: ExportFormat) => Promise<Result<string | null>>
  revealNote: (title: string) => Promise<void>
  openNotesFolder: () => Promise<void>
  /** Lets the user pick a new notes folder. Returns the new path, or null if cancelled. */
  chooseNotesFolder: () => Promise<string | null>
  setTheme: (theme: ThemeSetting) => Promise<void>
  showNoteContextMenu: (title: string) => Promise<NoteContextAction | null>
  /**
   * Subscribes to changes made to the notes folder outside NoteMark. The callback gets the
   * affected titles. Returns an unsubscribe function.
   */
  onNotesChanged: (callback: (changedTitles: string[]) => void) => () => void
  /**
   * Registers the work to finish before the window closes (writing unsaved edits). The main
   * process waits for it, with a timeout, before letting the window close.
   */
  onBeforeClose: (callback: () => Promise<void>) => void
}

export type InvokeChannel = Exclude<keyof NoteMarkApi, 'onNotesChanged' | 'onBeforeClose'>

export const ipcChannels: InvokeChannel[] = [
  'getAppInfo',
  'getNotes',
  'readNote',
  'writeNote',
  'createNote',
  'renameNote',
  'deleteNote',
  'searchNotes',
  'exportNote',
  'revealNote',
  'openNotesFolder',
  'chooseNotesFolder',
  'setTheme',
  'showNoteContextMenu'
]

export const notesChangedChannel = 'notesChanged'
export const beforeCloseChannel = 'beforeClose'
export const readyToCloseChannel = 'readyToClose'
