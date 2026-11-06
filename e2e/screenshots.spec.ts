/**
 * Regenerates the README screenshots in docs/screenshots with a set of demo notes.
 * Run with: NOTEMARK_SCREENSHOTS=1 npx playwright test screenshots   (after `npm run build`)
 */
import { _electron as electron, expect, test } from '@playwright/test'
import { mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

test.skip(!process.env.NOTEMARK_SCREENSHOTS, 'Set NOTEMARK_SCREENSHOTS=1 to regenerate screenshots')

const out = path.resolve('docs/screenshots')
const hours = (n: number) => new Date(Date.now() - n * 3_600_000)

const demoNotes: [string, string, Date][] = [
  [
    'Product launch plan',
    `# Product launch plan

Ship **NoteMark 2.0** with a cleaner editor, instant search and one-click exports.

## Checklist

- [x] Finish the command palette
- [x] Export to PDF and HTML
- [ ] Record a short demo video
- [ ] Post the release notes

## Timeline

| Week | Focus              | Owner |
| ---- | ------------------ | ----- |
| 1    | Polish and bug bash | Abdul |
| 2    | Beta with friends  | Abdul |
| 3    | Public release     | Abdul |

> Ship small, ship often. Every release should be something you'd use yourself.

\`\`\`ts
const release = await publish({ version: '2.0.0', channel: 'stable' })
\`\`\`
`,
    hours(0.05)
  ],
  [
    'Reading list',
    '- *Designing Data-Intensive Applications*\n- *The Pragmatic Programmer*\n- *Refactoring UI*',
    hours(3)
  ],
  [
    'Distributed systems lecture',
    '## Consensus\n\nRaft elects a leader, then replicates a log to followers. A write is committed once a majority acknowledges it.',
    hours(26)
  ],
  [
    'Weekly plan',
    '- Mon: gym, finish assignment 2\n- Wed: team sync\n- Fri: write blog post on local-first apps',
    hours(50)
  ],
  [
    'Pasta recipe',
    'Boil salted water. Cook spaghetti 9 minutes. Toss with garlic, olive oil, chilli and parmesan.',
    hours(24 * 6)
  ],
  [
    'Interview prep',
    'Practise system design: rate limiter, URL shortener, chat app. Review Big-O for common data structures.',
    hours(24 * 20)
  ]
]

test('capture README screenshots', async () => {
  const notesDir = await mkdtemp(path.join(tmpdir(), 'notemark-shots-'))
  const userData = await mkdtemp(path.join(tmpdir(), 'notemark-shots-profile-'))
  await mkdir(out, { recursive: true })

  for (const [title, body, mtime] of demoNotes) {
    const file = path.join(notesDir, `${title}.md`)
    await writeFile(file, body)
    await utimes(file, mtime, mtime)
  }

  const shoot = async (theme: 'dark' | 'light', name: string, palette = false) => {
    await writeFile(
      path.join(userData, 'settings.json'),
      JSON.stringify({
        theme,
        welcomeNoteCreated: true,
        windowBounds: { width: 1280, height: 800 }
      })
    )
    const app = await electron.launch({
      args: ['.'],
      env: { ...process.env, NOTEMARK_NOTES_DIR: notesDir, NOTEMARK_USER_DATA: userData }
    })
    const page = await app.firstWindow()
    await page.setViewportSize({ width: 1280, height: 800 })
    // Playwright forces a light colour scheme by default; let the app's own theme setting apply.
    await page.emulateMedia({ colorScheme: null })
    await page
      .getByRole('navigation', { name: 'Notes' })
      .getByRole('button', { name: /Product launch plan/ })
      .click()
    await expect(page.getByRole('textbox', { name: 'editable markdown' })).toContainText(
      'Checklist'
    )
    await page.mouse.click(900, 20) // move focus away from the sidebar button (empty title bar)
    if (palette) {
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+P' : 'Control+P')
      await page.getByPlaceholder('Search notes or type a command…').fill('raft')
      await expect(page.getByText('Found in note text')).toBeVisible()
    }
    await page.waitForTimeout(400)
    await page.screenshot({ path: path.join(out, `${name}.png`) })
    await app.close()
  }

  await shoot('dark', 'notemark-dark')
  await shoot('light', 'notemark-light')
  await shoot('dark', 'notemark-command-palette', true)

  await rm(notesDir, { recursive: true, force: true })
  await rm(userData, { recursive: true, force: true })
})
