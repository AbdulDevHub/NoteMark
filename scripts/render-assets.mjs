/**
 * Renders the app icon and the GitHub social preview from their SVG/HTML sources, using an
 * installed Chrome or Edge through Playwright. Run from the repo root: `node scripts/render-assets.mjs`
 *
 * Outputs: build/icon.png (1024², electron-builder derives the .ico/.icns from it),
 * resources/icon.png (512², Linux window icon) and docs/social-preview.png (1280×640).
 */
import { chromium } from '@playwright/test'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const url = (file) => pathToFileURL(path.join(root, file)).href

const launch = async () => {
  for (const channel of ['chrome', 'msedge', undefined]) {
    try {
      return await chromium.launch({ channel })
    } catch {
      // try the next browser
    }
  }
  throw new Error('No Chromium-based browser found. Run `npx playwright install chromium`.')
}

const browser = await launch()

const shoot = async (file, width, height, outputs, transparent = false) => {
  for (const [target, size] of outputs) {
    const scale = size ? size / width : 1
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: scale
    })
    await page.goto(url(file))
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: path.join(root, target), omitBackground: transparent })
    await page.close()
    console.log('wrote', target)
  }
}

await shoot(
  'build/icon.svg',
  1024,
  1024,
  [
    ['build/icon.png', 1024],
    ['resources/icon.png', 512]
  ],
  true
)
await shoot('scripts/social-preview.html', 1280, 640, [['docs/social-preview.png', 0]])
await browser.close()
