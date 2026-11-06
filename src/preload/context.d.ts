import { NoteMarkApi } from '@shared/types'

declare global {
  interface Window {
    context: NoteMarkApi & { locale: string }
  }
}
