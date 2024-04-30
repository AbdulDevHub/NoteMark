import { useRef } from 'react'
import {
  ActionButtonsRow,
  Content,
  FloatingNoteTitle,
  NotePreviewList,
  RootLayout,
  Sidebar
} from './components'
import MarkdownEditor from './components/MarkdownEditor'

const App = () => {
  const contentContainerRef = useRef<HTMLDivElement>(null)

  const resetScroll = () => {
    contentContainerRef.current?.scrollTo(0, 0)
  }

  return (
    <>
      <RootLayout>
        <Sidebar className="p-2 bg-[#2A2B31]">
          <ActionButtonsRow className="flex justify-between mt-1" />
          <NotePreviewList className="mt-3 space-y-1" onSelect={resetScroll} />
        </Sidebar>
        <Content ref={contentContainerRef} className="border-l bg-[#202226] border-l-white/20">
          <FloatingNoteTitle className="p-2" />
          <MarkdownEditor />
        </Content>
      </RootLayout>
    </>
  )
}

export default App
