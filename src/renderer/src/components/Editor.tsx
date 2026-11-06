import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeToggle,
  CreateLink,
  DiffSourceToggleWrapper,
  InsertCodeBlock,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  MDXEditor,
  Separator,
  UndoRedo,
  codeBlockPlugin,
  codeMirrorPlugin,
  diffSourcePlugin,
  frontmatterPlugin,
  headingsPlugin,
  imagePlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin
} from '@mdxeditor/editor'
import { useAtomValue } from 'jotai'
import { useMemo } from 'react'
import { usePrefersDark } from '../hooks/usePrefersDark'
import { editorHandle } from '../lib/editorHandle'
import { cn } from '../lib/utils'
import { flushSaves, onEditorChange } from '../store/actions'
import { focusModeAtom, openNoteAtom } from '../store/atoms'

const codeBlockLanguages = {
  '': 'Plain text',
  txt: 'Plain text',
  js: 'JavaScript',
  jsx: 'JSX',
  ts: 'TypeScript',
  tsx: 'TSX',
  py: 'Python',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  cs: 'C#',
  go: 'Go',
  rust: 'Rust',
  sql: 'SQL',
  bash: 'Shell',
  json: 'JSON',
  yaml: 'YAML',
  html: 'HTML',
  css: 'CSS',
  md: 'Markdown'
}

const Toolbar = () => (
  <DiffSourceToggleWrapper options={['rich-text', 'source']}>
    <UndoRedo />
    <Separator />
    <BlockTypeSelect />
    <Separator />
    <BoldItalicUnderlineToggles />
    <CodeToggle />
    <Separator />
    <ListsToggle />
    <Separator />
    <CreateLink />
    <InsertTable />
    <InsertCodeBlock />
    <InsertThematicBreak />
  </DiffSourceToggleWrapper>
)

export const Editor = () => {
  const note = useAtomValue(openNoteAtom)
  const focusMode = useAtomValue(focusModeAtom)
  const dark = usePrefersDark()

  // Plugins are created once; recreating them on every render would reset the editor.
  const plugins = useMemo(
    () => [
      headingsPlugin(),
      listsPlugin(),
      quotePlugin(),
      thematicBreakPlugin(),
      linkPlugin(),
      linkDialogPlugin(),
      tablePlugin(),
      imagePlugin(),
      frontmatterPlugin(),
      codeBlockPlugin({ defaultCodeBlockLanguage: '' }),
      codeMirrorPlugin({ codeBlockLanguages }),
      diffSourcePlugin({ viewMode: 'rich-text' }),
      markdownShortcutPlugin(),
      toolbarPlugin({ toolbarContents: Toolbar })
    ],
    []
  )

  if (!note) return null

  return (
    <MDXEditor
      key={note.id}
      ref={editorHandle}
      markdown={note.content}
      onChange={(markdown, initialNormalize) => {
        // MDXEditor may "normalise" the file on load; that isn't a user edit, so don't save it.
        if (!initialNormalize) onEditorChange(markdown)
      }}
      onBlur={() => void flushSaves()}
      onError={({ error }) => console.warn('Markdown parse issue:', error)}
      plugins={plugins}
      className={cn(dark && 'dark-theme', focusMode && 'focus-mode')}
      contentEditableClassName="note-prose"
      placeholder="Start writing…"
      spellCheck
    />
  )
}
