/**
 * Small JSON settings store kept in Electron's userData folder. Reads are synchronous and cached
 * (they happen once at startup); writes are atomic so a crash can't leave half a file behind.
 */
import { ThemeSetting } from '@shared/models'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

export type WindowBounds = {
  x?: number
  y?: number
  width: number
  height: number
  maximized?: boolean
}

export type Settings = {
  /** Custom notes folder. When unset, ~/NoteMark is used. */
  notesDir?: string
  theme: ThemeSetting
  windowBounds?: WindowBounds
  /** The welcome note is only created on the very first run, not every time the folder is empty. */
  welcomeNoteCreated?: boolean
}

const defaults: Settings = { theme: 'system' }

export const createSettingsStore = (file: string) => {
  let cache: Settings | null = null
  let writing = Promise.resolve()

  const get = (): Settings => {
    if (!cache) {
      try {
        cache = { ...defaults, ...JSON.parse(readFileSync(file, 'utf8')) }
      } catch {
        cache = { ...defaults }
      }
    }
    return cache as Settings
  }

  const update = (patch: Partial<Settings>) => {
    cache = { ...get(), ...patch }
    const snapshot = JSON.stringify(cache, null, 2)
    // Serialise writes so an older snapshot can never land after a newer one.
    writing = writing
      .then(async () => {
        await mkdir(path.dirname(file), { recursive: true })
        const tmp = `${file}.tmp`
        await writeFile(tmp, snapshot, 'utf8')
        await rename(tmp, file)
      })
      .catch((error) => console.error('Failed to save settings', error))
    return writing
  }

  /** For the window 'close' handler: the process may exit before an async write finishes. */
  const updateSync = (patch: Partial<Settings>) => {
    cache = { ...get(), ...patch }
    try {
      mkdirSync(path.dirname(file), { recursive: true })
      writeFileSync(file, JSON.stringify(cache, null, 2), 'utf8')
    } catch (error) {
      console.error('Failed to save settings', error)
    }
  }

  return { get, update, updateSync }
}

export type SettingsStore = ReturnType<typeof createSettingsStore>
