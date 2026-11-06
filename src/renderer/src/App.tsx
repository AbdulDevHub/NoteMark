import { useAtomValue } from 'jotai'
import { useEffect } from 'react'
import { Toaster } from 'sonner'
import { CommandPalette } from './components/CommandPalette'
import { Editor } from './components/Editor'
import { EmptyState } from './components/EmptyState'
import { Sidebar } from './components/Sidebar'
import { StatusBar } from './components/StatusBar'
import { TitleBar } from './components/TitleBar'
import { usePrefersDark } from './hooks/usePrefersDark'
import { useShortcuts } from './hooks/useShortcuts'
import { cn } from './lib/utils'
import { handleExternalChanges, init } from './store/actions'
import { focusModeAtom, openNoteAtom, sidebarOpenAtom } from './store/atoms'

const App = () => {
  const sidebarOpen = useAtomValue(sidebarOpenAtom)
  const focusMode = useAtomValue(focusModeAtom)
  const note = useAtomValue(openNoteAtom)
  const dark = usePrefersDark()

  useShortcuts()

  useEffect(() => {
    void init()
    return window.context.onNotesChanged((titles) => void handleExternalChanges(titles))
  }, [])

  const showSidebar = sidebarOpen && !focusMode

  return (
    <div className="flex h-full flex-col">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        {showSidebar && <Sidebar />}
        <main
          className={cn(
            'relative min-w-0 flex-1 overflow-y-auto bg-canvas',
            showSidebar && 'rounded-tl-xl border-l border-t border-fg/[0.07]',
            focusMode && 'focus-mode'
          )}
        >
          {note ? <Editor /> : <EmptyState />}
          {note && !focusMode && <StatusBar />}
        </main>
      </div>
      <CommandPalette />
      <Toaster theme={dark ? 'dark' : 'light'} position="bottom-left" richColors closeButton />
    </div>
  )
}

export default App
