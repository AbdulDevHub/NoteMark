import {
  NoteMarkApi,
  beforeCloseChannel,
  ipcChannels,
  notesChangedChannel,
  readyToCloseChannel
} from '@shared/types'
import { IpcRendererEvent, contextBridge, ipcRenderer } from 'electron'

if (!process.contextIsolated) {
  throw new Error('contextIsolation must be enabled in the BrowserWindow')
}

const invokers = Object.fromEntries(
  ipcChannels.map((channel) => [
    channel,
    (...args: unknown[]) => ipcRenderer.invoke(channel, ...args)
  ])
)

let beforeClose: () => Promise<void> = async () => undefined

ipcRenderer.on(beforeCloseChannel, async () => {
  try {
    await beforeClose()
  } finally {
    ipcRenderer.send(readyToCloseChannel)
  }
})

const api = {
  ...invokers,
  onNotesChanged: (callback: (changedTitles: string[]) => void) => {
    const listener = (_event: IpcRendererEvent, titles: string[]) => callback(titles)
    ipcRenderer.on(notesChangedChannel, listener)
    return () => {
      ipcRenderer.removeListener(notesChangedChannel, listener)
    }
  },
  onBeforeClose: (callback: () => Promise<void>) => {
    beforeClose = callback
  }
} as NoteMarkApi

try {
  contextBridge.exposeInMainWorld('context', { ...api, locale: navigator.language })
} catch (error) {
  console.error(error)
}
