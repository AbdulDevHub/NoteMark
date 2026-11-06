import { useAtom, useAtomValue } from 'jotai'
import { useEffect, useRef, useState } from 'react'
import { LuPanelLeftClose, LuPanelLeftOpen, LuSearch, LuSquarePen } from 'react-icons/lu'
import { focusEditor } from '../lib/editorHandle'
import { cn, isMac, modKey } from '../lib/utils'
import { createNote, renameOpenNote, startRename } from '../store/actions'
import {
  focusModeAtom,
  openNoteAtom,
  paletteOpenAtom,
  renamingAtom,
  sidebarOpenAtom
} from '../store/atoms'
import { SaveIndicator } from './StatusBar'

const NoteTitle = () => {
  const note = useAtomValue(openNoteAtom)
  const [renaming, setRenaming] = useAtom(renamingAtom)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const committing = useRef(false)

  useEffect(() => {
    if (!renaming || !note) return
    setDraft(note.title)
    // Wait a frame so the input exists before selecting its text.
    requestAnimationFrame(() => inputRef.current?.select())
  }, [renaming, note?.title])

  if (!note) return null

  if (renaming) {
    const commit = async () => {
      // Enter commits, then unmounting the input can fire blur; only commit once.
      if (committing.current) return
      committing.current = true
      try {
        if (await renameOpenNote(draft)) focusEditor()
      } finally {
        committing.current = false
      }
    }
    return (
      <input
        ref={inputRef}
        value={draft}
        aria-label="Note title"
        spellCheck={false}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            void commit()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            setRenaming(false)
            focusEditor()
          }
        }}
        className="no-drag w-full max-w-[420px] rounded-md bg-fg/[0.06] px-2 py-1 text-center text-[13px] font-medium text-fg outline-none ring-2 ring-accent/50"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={startRename}
      title="Rename (F2)"
      className="no-drag max-w-[420px] truncate rounded-md px-2 py-1 text-[13px] font-medium text-fg/80 transition-colors hover:bg-fg/[0.06] hover:text-fg"
    >
      {note.title}
    </button>
  )
}

export const TitleBar = () => {
  const [sidebarOpen, setSidebarOpen] = useAtom(sidebarOpenAtom)
  const focusMode = useAtomValue(focusModeAtom)
  const [, setPaletteOpen] = useAtom(paletteOpenAtom)
  const showSidebar = sidebarOpen && !focusMode

  return (
    <header
      className={cn(
        'drag-region relative flex h-[var(--titlebar-height)] shrink-0 select-none items-center',
        // Windows/Linux draw their window controls over the right ~140px.
        !isMac && 'pr-[140px]'
      )}
    >
      <div
        className={cn(
          'flex h-full shrink-0 items-center gap-1 px-2 transition-[width] duration-200',
          isMac && 'pl-[78px]',
          showSidebar ? 'w-[var(--sidebar-width)] bg-sidebar/95' : 'w-auto'
        )}
      >
        {!isMac && showSidebar && (
          <span className="ml-1.5 mr-auto text-[13px] font-semibold tracking-tight text-fg/90">
            NoteMark
          </span>
        )}
        {isMac && showSidebar && <span className="mr-auto" />}
        <button
          type="button"
          className="icon-button"
          onClick={() => setSidebarOpen((open) => !open)}
          title={`${showSidebar ? 'Hide' : 'Show'} sidebar (${modKey}+\\)`}
          aria-label={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
          disabled={focusMode}
        >
          {showSidebar ? <LuPanelLeftClose size={16} /> : <LuPanelLeftOpen size={16} />}
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={() => void createNote()}
          title={`New note (${modKey}+N)`}
          aria-label="New note"
        >
          <LuSquarePen size={16} />
        </button>
      </div>

      <div className="flex h-full min-w-0 flex-1 items-center justify-center gap-2 px-3">
        <NoteTitle />
      </div>

      <div className="flex shrink-0 items-center gap-2 pr-2">
        <SaveIndicator />
        <button
          type="button"
          className="no-drag flex items-center gap-2 rounded-md border border-fg/10 px-2 py-1 text-[12px] text-muted transition-colors hover:border-fg/20 hover:text-fg"
          onClick={() => setPaletteOpen(true)}
          aria-label="Search notes and commands"
        >
          <LuSearch size={13} />
          <span className="hidden md:inline">Search</span>
          <span className="kbd">{modKey} P</span>
        </button>
      </div>
    </header>
  )
}
