/**
 * IPC handlers: the only bridge between the renderer and the file system. Anything that needs a
 * native dialog, menu or shell call lives here; plain file work is delegated to notes.ts.
 */
import { appDirectoryName, fileEncoding, welcomeNoteTitle } from '@shared/constants'
import { ExportFormat, NoteContextAction, ThemeSetting } from '@shared/models'
import { InvokeChannel, NoteMarkApi, notesChangedChannel } from '@shared/types'
import { BrowserWindow, Menu, app, dialog, ipcMain, nativeTheme, shell } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import welcomeNoteFile from '../../../resources/welcomeNote.md?asset'
import { renderNoteHtml, renderNotePdf } from './export'
import * as notes from './notes'
import { SettingsStore } from './settings'
import { createNotesWatcher } from './watcher'

type Handlers = { [K in InvokeChannel]: NoteMarkApi[K] }

export const registerIpc = (getWindow: () => BrowserWindow | null, settings: SettingsStore) => {
  const rootDir = () =>
    process.env.NOTEMARK_NOTES_DIR ??
    settings.get().notesDir ??
    path.join(homedir(), appDirectoryName)

  const watcher = createNotesWatcher((changedTitles) => {
    getWindow()?.webContents.send(notesChangedChannel, changedTitles)
  })

  const ensureWelcomeNote = async () => {
    if (settings.get().welcomeNoteCreated) return
    if ((await notes.listTitles(rootDir())).length === 0) {
      const content = await readFile(welcomeNoteFile, fileEncoding)
      watcher.ignoreNextChange(welcomeNoteTitle)
      await writeFile(notes.notePath(rootDir(), welcomeNoteTitle), content, fileEncoding)
    }
    await settings.update({ welcomeNoteCreated: true })
  }

  const parentWindowOptions = () => getWindow() ?? undefined

  const handlers: Handlers = {
    getAppInfo: async () => ({
      platform: process.platform,
      version: app.getVersion(),
      notesDir: rootDir(),
      theme: settings.get().theme
    }),

    getNotes: async () => {
      await ensureWelcomeNote()
      return notes.getNotes(rootDir())
    },

    readNote: (title) => notes.readNote(rootDir(), title),

    writeNote: (title, content) => {
      watcher.ignoreNextChange(title)
      return notes.writeNote(rootDir(), title, content)
    },

    createNote: async () => {
      // Watcher events are debounced, so marking the title right after creating it is in time.
      const info = await notes.createNote(rootDir())
      watcher.ignoreNextChange(info.title)
      return info
    },

    renameNote: (oldTitle, newTitle) => {
      watcher.ignoreNextChange(oldTitle, newTitle.trim())
      return notes.renameNote(rootDir(), oldTitle, newTitle)
    },

    deleteNote: async (title) => {
      const win = parentWindowOptions()
      const options: Electron.MessageBoxOptions = {
        type: 'warning',
        title: 'Delete note',
        message: `Move "${title}" to the trash?`,
        detail: 'You can restore it from your system trash.',
        buttons: ['Move to Trash', 'Cancel'],
        defaultId: 1,
        cancelId: 1
      }
      const { response } = win
        ? await dialog.showMessageBox(win, options)
        : await dialog.showMessageBox(options)
      if (response !== 0) return false

      watcher.ignoreNextChange(title)
      await shell.trashItem(notes.notePath(rootDir(), title))
      return true
    },

    searchNotes: (query) => notes.searchNotes(rootDir(), query),

    exportNote: async (title, format: ExportFormat) => {
      try {
        const content = await notes.readNote(rootDir(), title)
        const win = parentWindowOptions()
        const options: Electron.SaveDialogOptions = {
          title: `Export "${title}"`,
          defaultPath: path.join(app.getPath('documents'), `${title}.${format}`),
          filters:
            format === 'pdf'
              ? [{ name: 'PDF', extensions: ['pdf'] }]
              : [{ name: 'HTML', extensions: ['html'] }]
        }
        const { canceled, filePath } = win
          ? await dialog.showSaveDialog(win, options)
          : await dialog.showSaveDialog(options)
        if (canceled || !filePath) return { ok: true, value: null }

        const html = renderNoteHtml(title, content)
        await writeFile(filePath, format === 'pdf' ? await renderNotePdf(html) : html)
        return { ok: true, value: filePath }
      } catch (error) {
        console.error('Export failed', error)
        return { ok: false, error: 'Export failed. Check that the file is not open elsewhere.' }
      }
    },

    revealNote: async (title) => shell.showItemInFolder(notes.notePath(rootDir(), title)),

    openNotesFolder: async () => {
      await notes.ensureNotesDir(rootDir())
      await shell.openPath(rootDir())
    },

    chooseNotesFolder: async () => {
      const win = parentWindowOptions()
      const options: Electron.OpenDialogOptions = {
        title: 'Choose notes folder',
        defaultPath: rootDir(),
        buttonLabel: 'Use this folder',
        properties: ['openDirectory', 'createDirectory']
      }
      const { canceled, filePaths } = win
        ? await dialog.showOpenDialog(win, options)
        : await dialog.showOpenDialog(options)
      if (canceled || !filePaths[0]) return null

      await settings.update({ notesDir: filePaths[0] })
      watcher.start(rootDir())
      return rootDir()
    },

    setTheme: async (theme: ThemeSetting) => {
      nativeTheme.themeSource = theme
      await settings.update({ theme })
    },

    showNoteContextMenu: (title) =>
      new Promise<NoteContextAction | null>((resolve) => {
        const pick = (action: NoteContextAction) => () => resolve(action)
        const reveal =
          process.platform === 'darwin'
            ? 'Reveal in Finder'
            : process.platform === 'win32'
              ? 'Show in File Explorer'
              : 'Show in Folder'

        const menu = Menu.buildFromTemplate([
          { label: 'Rename', click: pick('rename') },
          { label: reveal, click: pick('reveal') },
          { type: 'separator' },
          { label: 'Export as PDF…', click: pick('export-pdf') },
          { label: 'Export as HTML…', click: pick('export-html') },
          { type: 'separator' },
          { label: `Delete "${title}"`, click: pick('delete') }
        ])
        // The close callback can fire before the click handler; give the click a moment to win.
        menu.popup({
          window: getWindow() ?? undefined,
          callback: () => setTimeout(() => resolve(null), 150)
        })
      })
  }

  for (const [channel, handler] of Object.entries(handlers)) {
    ipcMain.handle(channel, (_event, ...args) => (handler as (...a: unknown[]) => unknown)(...args))
  }

  notes
    .ensureNotesDir(rootDir())
    .then(() => watcher.start(rootDir()))
    .catch((error) => console.error('Could not create notes folder', error))

  app.on('will-quit', () => watcher.stop())

  return { rootDir }
}
