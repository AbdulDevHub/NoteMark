import { SearchResult } from '@shared/models'
import { Command } from 'cmdk'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import { IconType } from 'react-icons'
import {
  LuFileCode,
  LuFileDown,
  LuFileText,
  LuFocus,
  LuFolderCog,
  LuFolderOpen,
  LuMonitor,
  LuMoon,
  LuPanelLeft,
  LuPencil,
  LuSquarePen,
  LuSun,
  LuTrash2
} from 'react-icons/lu'
import { modKey } from '../lib/utils'
import {
  chooseNotesFolder,
  createNote,
  deleteNote,
  exportNote,
  openNote,
  openNotesFolder,
  revealNote,
  setTheme,
  startRename
} from '../store/actions'
import {
  focusModeAtom,
  notesAtom,
  openNoteAtom,
  paletteOpenAtom,
  sidebarOpenAtom
} from '../store/atoms'

type CommandItem = {
  id: string
  label: string
  icon: IconType
  shortcut?: string
  run: () => unknown
  /** Hidden when no note is open. */
  needsNote?: boolean
}

/** Searches note bodies in the main process, debounced so typing stays smooth. */
const useContentSearch = (query: string) => {
  const [results, setResults] = useState<SearchResult[]>([])

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      const found = await window.context.searchNotes(query)
      if (!cancelled) setResults(found.filter((r) => r.matchedIn === 'content'))
    }, 120)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  return results
}

const Highlight = ({ text, query }: { text: string; query: string }) => {
  const q = query.trim()
  const index = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1
  if (index === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-accent/25 text-inherit">
        {text.slice(index, index + q.length)}
      </mark>
      {text.slice(index + q.length)}
    </>
  )
}

const Row = ({
  icon: Icon,
  children,
  hint
}: {
  icon: IconType
  children: ReactNode
  hint?: ReactNode
}) => (
  <>
    <Icon size={15} className="shrink-0 text-muted" />
    <div className="min-w-0 flex-1">{children}</div>
    {hint && <span className="shrink-0 text-[11px] text-muted">{hint}</span>}
  </>
)

export const CommandPalette = () => {
  const [open, setOpen] = useAtom(paletteOpenAtom)
  const notes = useAtomValue(notesAtom) ?? []
  const openNoteState = useAtomValue(openNoteAtom)
  const setSidebarOpen = useSetAtom(sidebarOpenAtom)
  const setFocusMode = useSetAtom(focusModeAtom)
  const [query, setQuery] = useState('')
  const contentResults = useContentSearch(open ? query : '')

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const current = openNoteState?.title

  const commands: CommandItem[] = useMemo(
    () => [
      { id: 'new', label: 'New note', icon: LuSquarePen, shortcut: `${modKey} N`, run: createNote },
      {
        id: 'rename',
        label: 'Rename note',
        icon: LuPencil,
        shortcut: 'F2',
        run: startRename,
        needsNote: true
      },
      {
        id: 'pdf',
        label: 'Export note as PDF',
        icon: LuFileDown,
        run: () => current && exportNote(current, 'pdf'),
        needsNote: true
      },
      {
        id: 'html',
        label: 'Export note as HTML',
        icon: LuFileCode,
        run: () => current && exportNote(current, 'html'),
        needsNote: true
      },
      {
        id: 'reveal',
        label: 'Show note in folder',
        icon: LuFolderOpen,
        run: () => current && revealNote(current),
        needsNote: true
      },
      {
        id: 'delete',
        label: 'Delete note',
        icon: LuTrash2,
        run: () => current && deleteNote(current),
        needsNote: true
      },
      {
        id: 'sidebar',
        label: 'Toggle sidebar',
        icon: LuPanelLeft,
        shortcut: `${modKey} \\`,
        run: () => setSidebarOpen((v) => !v)
      },
      {
        id: 'focus',
        label: 'Toggle focus mode',
        icon: LuFocus,
        shortcut: `${modKey} ⇧ F`,
        run: () => setFocusMode((v) => !v)
      },
      { id: 'folder', label: 'Open notes folder', icon: LuFolderOpen, run: openNotesFolder },
      { id: 'choose', label: 'Change notes folder…', icon: LuFolderCog, run: chooseNotesFolder },
      { id: 'light', label: 'Theme: Light', icon: LuSun, run: () => setTheme('light') },
      { id: 'dark', label: 'Theme: Dark', icon: LuMoon, run: () => setTheme('dark') },
      { id: 'system', label: 'Theme: Match system', icon: LuMonitor, run: () => setTheme('system') }
    ],
    [current, setSidebarOpen, setFocusMode]
  )

  const q = query.trim().toLowerCase()
  const titleMatches = q
    ? notes.filter((n) => n.title.toLowerCase().includes(q))
    : notes.slice(0, 6)
  const commandMatches = commands.filter(
    (c) => (!c.needsNote || current) && (!q || c.label.toLowerCase().includes(q))
  )

  const run = (fn: () => unknown) => {
    setOpen(false)
    // Let the dialog close (and return focus) before the action moves focus elsewhere.
    setTimeout(() => void fn(), 0)
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      shouldFilter={false}
      loop
      overlayClassName="fixed inset-0 z-40 bg-black/30 animate-fade-in"
      contentClassName="fixed left-1/2 top-[12vh] z-50 w-[min(620px,calc(100vw-32px))] -translate-x-1/2 animate-pop-in overflow-hidden rounded-xl border border-fg/10 bg-canvas shadow-2xl"
    >
      <Command.Input
        value={query}
        onValueChange={setQuery}
        placeholder="Search notes or type a command…"
        className="w-full border-b border-fg/[0.08] bg-transparent px-4 py-3.5 text-[15px] text-fg outline-none placeholder:text-muted"
      />
      <Command.List className="max-h-[min(440px,60vh)] overflow-y-auto pb-2">
        <Command.Empty>Nothing found for &ldquo;{query}&rdquo;</Command.Empty>

        {titleMatches.length > 0 && (
          <Command.Group heading={q ? 'Notes' : 'Recent notes'}>
            {titleMatches.map((note) => (
              <Command.Item
                key={`note:${note.title}`}
                value={`note:${note.title}`}
                onSelect={() => run(() => openNote(note.title))}
              >
                <Row icon={LuFileText}>
                  <div className="truncate">
                    <Highlight text={note.title} query={query} />
                  </div>
                  {note.excerpt && (
                    <div className="truncate text-[12px] text-muted">{note.excerpt}</div>
                  )}
                </Row>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {contentResults.length > 0 && (
          <Command.Group heading="Found in note text">
            {contentResults.map((r) => (
              <Command.Item
                key={`content:${r.title}`}
                value={`content:${r.title}`}
                onSelect={() => run(() => openNote(r.title))}
              >
                <Row icon={LuFileText}>
                  <div className="truncate">{r.title}</div>
                  <div className="line-clamp-2 text-[12px] text-muted">
                    <Highlight text={r.snippet} query={query} />
                  </div>
                </Row>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {commandMatches.length > 0 && (
          <Command.Group heading="Commands">
            {commandMatches.map((c) => (
              <Command.Item key={c.id} value={`cmd:${c.id}`} onSelect={() => run(c.run)}>
                <Row icon={c.icon} hint={c.shortcut && <span className="kbd">{c.shortcut}</span>}>
                  {c.label}
                </Row>
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  )
}
