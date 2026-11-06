import { useAtomValue, useSetAtom } from 'jotai'
import { LuSquarePen } from 'react-icons/lu'
import { modKey } from '../lib/utils'
import { createNote } from '../store/actions'
import { notesAtom, paletteOpenAtom } from '../store/atoms'

const shortcuts = [
  ['New note', `${modKey} N`],
  ['Search & commands', `${modKey} P`],
  ['Rename note', 'F2'],
  ['Toggle sidebar', `${modKey} \\`],
  ['Focus mode', `${modKey} ⇧ F`]
]

export const EmptyState = () => {
  const notes = useAtomValue(notesAtom)
  const setPaletteOpen = useSetAtom(paletteOpenAtom)
  if (notes === null) return null

  const hasNotes = notes.length > 0

  return (
    <div className="flex h-full animate-fade-in select-none flex-col items-center justify-center gap-6 px-6 text-center">
      <div>
        <h2 className="text-xl font-semibold text-fg">
          {hasNotes ? 'No note open' : 'Start writing'}
        </h2>
        <p className="mt-1.5 text-[13.5px] text-muted">
          {hasNotes
            ? 'Pick a note from the sidebar, or search everything at once.'
            : 'Notes are saved as plain Markdown files you can open anywhere.'}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void createNote()}
          className="flex items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-[13px] font-medium text-black/85 transition hover:brightness-105"
        >
          <LuSquarePen size={15} /> New note
        </button>
        {hasNotes && (
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="rounded-lg border border-fg/15 px-3.5 py-2 text-[13px] text-fg/90 transition hover:bg-fg/[0.05]"
          >
            Search notes
          </button>
        )}
      </div>

      <dl className="grid grid-cols-[auto_auto] gap-x-6 gap-y-2 text-[12.5px]">
        {shortcuts.map(([label, keys]) => (
          <div key={label} className="contents">
            <dt className="text-left text-muted">{label}</dt>
            <dd className="text-right">
              <span className="kbd">{keys}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
