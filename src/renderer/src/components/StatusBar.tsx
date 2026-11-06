import { countWords, readingTimeMinutes } from '@shared/notes'
import { useAtomValue } from 'jotai'
import { useDeferredValue, useMemo } from 'react'
import { LuCheck, LuCircleAlert, LuLoaderCircle } from 'react-icons/lu'
import { liveContentAtom, openNoteAtom, saveStatusAtom } from '../store/atoms'

export const SaveIndicator = () => {
  const status = useAtomValue(saveStatusAtom)
  const note = useAtomValue(openNoteAtom)
  if (!note) return null

  const view = {
    saved: { icon: <LuCheck size={13} />, label: 'Saved', className: 'text-muted' },
    unsaved: {
      icon: <span className="h-1.5 w-1.5 rounded-full bg-accent" />,
      label: 'Editing',
      className: 'text-muted'
    },
    saving: {
      icon: <LuLoaderCircle size={13} className="animate-spin" />,
      label: 'Saving',
      className: 'text-muted'
    },
    error: { icon: <LuCircleAlert size={13} />, label: 'Not saved', className: 'text-red-500' }
  }[status]

  return (
    <span
      className={`flex items-center gap-1.5 text-[12px] ${view.className}`}
      role="status"
      aria-live="polite"
    >
      {view.icon}
      <span className="hidden lg:inline">{view.label}</span>
    </span>
  )
}

export const StatusBar = () => {
  const content = useAtomValue(liveContentAtom)
  const note = useAtomValue(openNoteAtom)
  // Counting words on every keystroke is cheap, but defer it so typing never waits on it.
  const deferred = useDeferredValue(content)
  const words = useMemo(() => countWords(deferred), [deferred])

  if (!note) return null

  const minutes = readingTimeMinutes(words)

  return (
    <footer className="pointer-events-none absolute bottom-0 right-0 z-10 flex select-none items-center gap-3 rounded-tl-lg bg-canvas/85 px-3 py-1.5 text-[11.5px] text-muted backdrop-blur">
      <span>
        {words.toLocaleString()} {words === 1 ? 'word' : 'words'}
      </span>
      <span>{deferred.length.toLocaleString()} chars</span>
      {minutes > 0 && <span>{minutes} min read</span>}
    </footer>
  )
}
