import { GetNotes } from '@shared/types'

declare global {
  interface Window {
    context: {
      locale: string
      getLocale: GetNotes
    }
  }
}
