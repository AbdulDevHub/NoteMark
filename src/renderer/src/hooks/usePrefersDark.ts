import { useEffect, useState } from 'react'

const query = () => window.matchMedia('(prefers-color-scheme: dark)')

/** Follows the effective theme, which the main process controls via nativeTheme.themeSource. */
export const usePrefersDark = () => {
  const [dark, setDark] = useState(() => query().matches)

  useEffect(() => {
    const media = query()
    const update = () => setDark(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return dark
}
