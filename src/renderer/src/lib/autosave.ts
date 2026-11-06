/**
 * Debounced autosave that always knows which note a change belongs to.
 *
 * - `schedule` restarts the idle timer; switching to another note's content first flushes the
 *   previous note immediately, so edits can never be written under the wrong title.
 * - Saves run one at a time in order, so an older snapshot can never overwrite a newer one.
 */
export type SaveFn = (title: string, content: string) => Promise<void>

export const createAutosaver = (save: SaveFn, delayMs: number) => {
  let pending: { title: string; content: string } | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let queue: Promise<void> = Promise.resolve()

  const clearTimer = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }

  /** Writes any pending change now. Resolves when every queued save has finished. */
  const flush = (): Promise<void> => {
    clearTimer()
    if (!pending) return queue

    const { title, content } = pending
    pending = null
    const run = queue.then(() => save(title, content))
    queue = run.catch(() => undefined) // keep the queue alive after a failed save
    return run
  }

  const schedule = (title: string, content: string) => {
    if (pending && pending.title !== title) void flush().catch(() => undefined)
    pending = { title, content }
    clearTimer()
    timer = setTimeout(() => void flush().catch(() => undefined), delayMs)
  }

  const hasPending = (title?: string) =>
    pending !== null && (title === undefined || pending.title === title)

  return { schedule, flush, hasPending }
}

export type Autosaver = ReturnType<typeof createAutosaver>
