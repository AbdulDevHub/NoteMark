/**
 * Watches the notes folder for changes made outside NoteMark (another editor, Git, Dropbox...)
 * and reports the affected titles in debounced batches. Writes NoteMark makes itself are
 * announced with `ignoreNextChange` so they don't bounce back as "external" edits.
 */
import { noteExtension } from '@shared/constants'
import { FSWatcher, watch } from 'node:fs'

const debounceMs = 250
const selfWriteWindowMs = 1500

export const createNotesWatcher = (onChange: (changedTitles: string[]) => void) => {
  let watcher: FSWatcher | null = null
  let timer: NodeJS.Timeout | null = null
  const pending = new Set<string>()
  const selfWrites = new Map<string, number>()

  const flush = () => {
    timer = null
    const now = Date.now()
    const external = [...pending].filter((title) => {
      const at = selfWrites.get(title)
      return at === undefined || now - at > selfWriteWindowMs
    })
    pending.clear()
    for (const [title, at] of selfWrites) if (now - at > selfWriteWindowMs) selfWrites.delete(title)
    if (external.length) onChange(external)
  }

  const start = (dir: string) => {
    stop()
    try {
      watcher = watch(dir, (_event, filename) => {
        if (!filename || !filename.endsWith(noteExtension)) return
        pending.add(filename.slice(0, -noteExtension.length))
        if (timer) clearTimeout(timer)
        timer = setTimeout(flush, debounceMs)
      })
      watcher.on('error', (error) => console.error('Notes watcher error', error))
    } catch (error) {
      // Watching is a nice-to-have; the app works without it.
      console.error('Could not watch notes folder', error)
    }
  }

  const stop = () => {
    watcher?.close()
    watcher = null
    if (timer) clearTimeout(timer)
    timer = null
    pending.clear()
  }

  const ignoreNextChange = (...titles: string[]) => {
    const now = Date.now()
    titles.forEach((t) => selfWrites.set(t, now))
  }

  return { start, stop, ignoreNextChange }
}
