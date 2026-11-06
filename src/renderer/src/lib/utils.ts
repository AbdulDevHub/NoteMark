import clsx, { ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...args: ClassValue[]) => twMerge(clsx(...args))

export const isMac = navigator.userAgent.includes('Mac')

/** Label for the platform's primary modifier key. */
export const modKey = isMac ? '⌘' : 'Ctrl'

/** True for Ctrl on Windows/Linux and Cmd on macOS. */
export const isModKey = (e: KeyboardEvent | React.KeyboardEvent) => (isMac ? e.metaKey : e.ctrlKey)
