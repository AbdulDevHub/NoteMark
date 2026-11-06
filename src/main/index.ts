import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { beforeCloseChannel, readyToCloseChannel } from '@shared/types'
import { BrowserWindow, app, ipcMain, nativeTheme, screen, shell } from 'electron'
import path, { join } from 'node:path'
import icon from '../../resources/icon.png?asset'
import { registerIpc } from './lib/ipc'
import { WindowBounds, createSettingsStore } from './lib/settings'

// Lets tests and screenshots run against a throwaway profile without touching real settings.
if (process.env.NOTEMARK_USER_DATA) app.setPath('userData', process.env.NOTEMARK_USER_DATA)

const settings = createSettingsStore(path.join(app.getPath('userData'), 'settings.json'))
nativeTheme.themeSource = settings.get().theme

let mainWindow: BrowserWindow | null = null
/** Set on Cmd/Ctrl+Q so the app still quits after the window's save-before-close round trip. */
let isQuitting = false
const closeTimeoutMs = 3000

app.on('before-quit', () => {
  isQuitting = true
})

const isMac = process.platform === 'darwin'
const titleBarHeight = 40

// Kept in sync with the --bg-editor token in main.css so the native window controls blend in.
const chromeColors = () =>
  nativeTheme.shouldUseDarkColors
    ? { color: '#1b1c20', symbolColor: '#d4d4d8' }
    : { color: '#ffffff', symbolColor: '#3f3f46' }

/** Drops a saved position that is no longer on any connected display (e.g. unplugged monitor). */
const restoreBounds = (saved?: WindowBounds): WindowBounds => {
  const fallback = { width: 1100, height: 720 }
  if (!saved) return fallback
  const { x, y, width, height } = saved
  if (x === undefined || y === undefined) return { width, height }

  const visible = screen.getAllDisplays().some(({ workArea: a }) => {
    return x < a.x + a.width && x + width > a.x && y < a.y + a.height && y + height > a.y
  })
  return visible ? saved : { width, height }
}

const isSafeExternalUrl = (url: string) => {
  try {
    return ['http:', 'https:', 'mailto:'].includes(new URL(url).protocol)
  } catch {
    return false
  }
}

function createWindow(): void {
  const bounds = restoreBounds(settings.get().windowBounds)

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 640,
    minHeight: 420,
    show: false,
    title: 'NoteMark',
    backgroundColor: isMac ? '#00000000' : chromeColors().color,
    ...(process.platform === 'linux' ? { icon } : {}),
    titleBarStyle: 'hidden',
    ...(isMac
      ? { trafficLightPosition: { x: 16, y: 13 }, vibrancy: 'sidebar', visualEffectState: 'active' }
      : { titleBarOverlay: { ...chromeColors(), height: titleBarHeight } }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      spellcheck: true
    }
  })

  const win = mainWindow

  win.on('ready-to-show', () => {
    if (settings.get().windowBounds?.maximized) win.maximize()
    win.show()
  })

  // Closing waits for the renderer to write unsaved edits (at most closeTimeoutMs), so typing and
  // immediately closing or quitting never loses the last few keystrokes.
  let readyToClose = false
  let closeRequested = false
  win.on('close', (event) => {
    settings.updateSync({
      windowBounds: { ...win.getNormalBounds(), maximized: win.isMaximized() }
    })
    if (readyToClose) return
    event.preventDefault()
    if (closeRequested) return
    closeRequested = true

    const finish = () => {
      clearTimeout(timer)
      ipcMain.removeListener(readyToCloseChannel, onReady)
      readyToClose = true
      win.close()
      if (isQuitting) app.quit()
    }
    const onReady = (e: Electron.IpcMainEvent) => {
      if (e.sender === win.webContents) finish()
    }
    const timer = setTimeout(finish, closeTimeoutMs)
    ipcMain.on(readyToCloseChannel, onReady)
    win.webContents.send(beforeCloseChannel)
  })

  win.on('closed', () => {
    mainWindow = null
  })

  // Links in notes open in the default browser; nothing may navigate the app window itself.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (is.dev && url.startsWith(process.env['ELECTRON_RENDERER_URL'] ?? '\0')) return
    event.preventDefault()
    if (isSafeExternalUrl(url)) shell.openExternal(url)
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

nativeTheme.on('updated', () => {
  if (!mainWindow || isMac) return
  mainWindow.setTitleBarOverlay({ ...chromeColors(), height: titleBarHeight })
  mainWindow.setBackgroundColor(chromeColors().color)
})

// Only one NoteMark window: a second launch focuses the existing one instead.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.abduldevhub.notemark')

    // F12 opens DevTools in development; Ctrl/Cmd+R reload is ignored in production.
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    registerIpc(() => mainWindow, settings)
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('window-all-closed', () => {
  if (!isMac) app.quit()
})
