import { MDXEditorMethods } from '@mdxeditor/editor'

/** The mounted editor instance, so actions and shortcuts can focus it without prop drilling. */
export const editorHandle: { current: MDXEditorMethods | null } = { current: null }

export const focusEditor = () =>
  editorHandle.current?.focus(undefined, { defaultSelection: 'rootEnd' })
