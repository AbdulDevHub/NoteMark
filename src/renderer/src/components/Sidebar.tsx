import { NoteInfo } from '@shared/models'
import { formatRelativeTime } from '@shared/notes'
import { useAtom, useAtomValue } from 'jotai'
import { memo, useEffect, useMemo, useState } from 'react'
import { LuFolderOpen, LuMonitor, LuMoon, LuSearch, LuSun, LuX } from 'react-icons/lu'
import { cn } from '../lib/utils'
import { handleNoteContextMenu, openNote, openNotesFolder, setTheme } from '../store/actions'
import {
  appInfoAtom,
  notesAtom,
  selectedTitleAtom,
  sidebarQueryAtom,
  themeAtom
} from '../store/atoms'

/** Re-renders once a minute so "5 min ago" labels stay current. */
const useNow = () => {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])
  return now
}

const NoteItem = memo(function NoteItem({
  note,
  active,
  now
}: {
  note: NoteInfo
  active: boolean
  now: number
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => void openNote(note.title)}
        onContextMenu={(e) => {
          e.preventDefault()
          void handleNoteContextMenu(note.title)
        }}
        aria-current={active ? 'true' : undefined}
        className={cn(
          'group relative w-full rounded-lg px-3 py-2.5 text-left transition-colors',
          active ? 'bg-surface' : 'hover:bg-fg/[0.045]'
        )}
      >
        {active && (
          <span
            className="absolute inset-y-2.5 left-0 w-[3px] rounded-full bg-accent"
            aria-hidden
          />
        )}
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate text-[13.5px] font-semibold text-fg">{note.title}</h3>
          <time
            className="shrink-0 text-[11px] text-muted"
            dateTime={new Date(note.lastEditTime).toISOString()}
          >
            {formatRelativeTime(note.lastEditTime, now, window.context.locale)}
          </time>
        </div>
        <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-muted">
          {note.excerpt || <span className="italic opacity-70">Empty note</span>}
        </p>
      </button>
    </li>
  )
})

const ThemeSwitcher = () => {
  const theme = useAtomValue(themeAtom)
  const options = [
    { value: 'light', icon: LuSun, label: 'Light' },
    { value: 'dark', icon: LuMoon, label: 'Dark' },
    { value: 'system', icon: LuMonitor, label: 'System' }
  ] as const

  return (
    <div className="flex rounded-md bg-fg/[0.05] p-0.5" role="radiogroup" aria-label="Theme">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          title={`${label} theme`}
          onClick={() => void setTheme(value)}
          className={cn(
            'flex h-6 w-7 items-center justify-center rounded text-muted transition-colors hover:text-fg',
            theme === value && 'bg-canvas text-fg shadow-sm'
          )}
        >
          <Icon size={13} />
        </button>
      ))}
    </div>
  )
}

export const Sidebar = () => {
  const notes = useAtomValue(notesAtom)
  const selectedTitle = useAtomValue(selectedTitleAtom)
  const appInfo = useAtomValue(appInfoAtom)
  const [query, setQuery] = useAtom(sidebarQueryAtom)
  const now = useNow()

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!notes || !q) return notes
    return notes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.excerpt.toLowerCase().includes(q)
    )
  }, [notes, query])

  return (
    <aside className="flex w-[var(--sidebar-width)] shrink-0 select-none flex-col bg-sidebar/95">
      <div className="px-3 pb-2 pt-1">
        <label className="flex items-center gap-2 rounded-md bg-fg/[0.05] px-2.5 py-1.5 text-muted focus-within:ring-2 focus-within:ring-accent/50">
          <LuSearch size={14} className="shrink-0" />
          <input
            id="sidebar-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
            placeholder="Filter notes"
            spellCheck={false}
            className="w-full bg-transparent text-[13px] text-fg outline-none placeholder:text-muted"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear filter"
              className="hover:text-fg"
            >
              <LuX size={13} />
            </button>
          )}
        </label>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2" aria-label="Notes">
        {visible === null ? null : visible.length === 0 ? (
          <p className="px-3 py-8 text-center text-[13px] text-muted">
            {query ? `No notes match "${query}"` : 'No notes yet'}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {visible.map((note) => (
              <NoteItem
                key={note.title}
                note={note}
                active={note.title === selectedTitle}
                now={now}
              />
            ))}
          </ul>
        )}
      </nav>

      <div className="flex items-center gap-2 border-t border-fg/[0.06] px-3 py-2">
        <button
          type="button"
          onClick={() => void openNotesFolder()}
          title={appInfo?.notesDir}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-[12px] text-muted transition-colors hover:bg-fg/[0.05] hover:text-fg"
        >
          <LuFolderOpen size={14} className="shrink-0" />
          <span className="truncate">
            {notes ? `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}` : 'Loading…'}
          </span>
        </button>
        <ThemeSwitcher />
      </div>
    </aside>
  )
}
