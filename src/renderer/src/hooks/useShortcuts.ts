import { useEffect } from 'react'
import { isModKey } from '../lib/utils'
import { createNote, flushSaves, startRename } from '../store/actions'
import { appStore, focusModeAtom, paletteOpenAtom, sidebarOpenAtom } from '../store/atoms'

type Shortcut = {
  matches: (e: KeyboardEvent, mod: boolean, key: string) => boolean
  run: () => void
}

const shortcuts: Shortcut[] = [
  { matches: (e, mod, key) => mod && !e.shiftKey && key === 'n', run: () => void createNote() },
  {
    matches: (_e, mod, key) => mod && (key === 'p' || key === 'k'),
    run: () => appStore.set(paletteOpenAtom, (open) => !open)
  },
  { matches: (_e, mod, key) => mod && key === 's', run: () => void flushSaves() },
  {
    matches: (_e, mod, key) => mod && key === '\\',
    run: () => appStore.set(sidebarOpenAtom, (open) => !open)
  },
  {
    matches: (e, mod, key) => mod && e.shiftKey && key === 'f',
    run: () => appStore.set(focusModeAtom, (on) => !on)
  },
  { matches: (e) => e.key === 'F2', run: startRename },
  {
    matches: (e) => e.key === 'Escape' && appStore.get(focusModeAtom),
    run: () => appStore.set(focusModeAtom, false)
  }
]

/**
 * App-wide keyboard shortcuts. Listens in the bubble phase and skips events the editor already
 * handled, so editor shortcuts (e.g. Ctrl+K for links while typing) keep working.
 */
export const useShortcuts = () => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      const shortcut = shortcuts.find((s) => s.matches(e, isModKey(e), e.key.toLowerCase()))
      if (!shortcut) return
      e.preventDefault()
      shortcut.run()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
