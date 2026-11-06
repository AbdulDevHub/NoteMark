import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAutosaver } from './autosave'

describe('createAutosaver', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('saves only the latest content after the user stops typing', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const autosaver = createAutosaver(save, 500)

    autosaver.schedule('Note', 'a')
    await vi.advanceTimersByTimeAsync(300)
    autosaver.schedule('Note', 'ab')
    await vi.advanceTimersByTimeAsync(300)
    expect(save).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(300)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith('Note', 'ab')
  })

  it('flushes the previous note immediately when another note is edited', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const autosaver = createAutosaver(save, 500)

    autosaver.schedule('First', 'one')
    autosaver.schedule('Second', 'two')
    await vi.advanceTimersByTimeAsync(0)
    expect(save).toHaveBeenNthCalledWith(1, 'First', 'one')

    await vi.advanceTimersByTimeAsync(500)
    expect(save).toHaveBeenNthCalledWith(2, 'Second', 'two')
  })

  it('runs saves one after another, in order', async () => {
    const order: string[] = []
    let release!: () => void
    const save = vi.fn((_title: string, content: string) => {
      order.push(`start ${content}`)
      return content === 'slow'
        ? new Promise<void>((r) => (release = () => (order.push('end slow'), r())))
        : Promise.resolve(void order.push(`end ${content}`))
    })
    const autosaver = createAutosaver(save, 100)

    autosaver.schedule('Note', 'slow')
    const first = autosaver.flush()
    autosaver.schedule('Note', 'fast')
    const second = autosaver.flush()

    await vi.advanceTimersByTimeAsync(0)
    expect(order).toEqual(['start slow'])
    release()
    await Promise.all([first, second])
    expect(order).toEqual(['start slow', 'end slow', 'start fast', 'end fast'])
  })

  it('keeps working after a failed save and reports pending state', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('disk full')).mockResolvedValue(undefined)
    const autosaver = createAutosaver(save, 100)

    autosaver.schedule('Note', 'x')
    expect(autosaver.hasPending('Note')).toBe(true)
    expect(autosaver.hasPending('Other')).toBe(false)
    await expect(autosaver.flush()).rejects.toThrow('disk full')
    expect(autosaver.hasPending()).toBe(false)

    autosaver.schedule('Note', 'y')
    await expect(autosaver.flush()).resolves.toBeUndefined()
    expect(save).toHaveBeenLastCalledWith('Note', 'y')
  })
})
