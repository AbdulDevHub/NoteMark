import { ElectronApplication, Page, _electron as electron, expect, test } from '@playwright/test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

let app: ElectronApplication
let page: Page
let notesDir: string
let userData: string

const editor = () => page.getByRole('textbox', { name: 'editable markdown' })
const mod = process.platform === 'darwin' ? 'Meta' : 'Control'

test.beforeEach(async () => {
  notesDir = await mkdtemp(path.join(tmpdir(), 'notemark-e2e-notes-'))
  userData = await mkdtemp(path.join(tmpdir(), 'notemark-e2e-profile-'))
  app = await electron.launch({
    args: ['.'],
    env: { ...process.env, NOTEMARK_NOTES_DIR: notesDir, NOTEMARK_USER_DATA: userData }
  })
  page = await app.firstWindow()
})

test.afterEach(async () => {
  await app.close()
  await rm(notesDir, { recursive: true, force: true })
  await rm(userData, { recursive: true, force: true })
})

test('first run shows the welcome note', async () => {
  await expect(page.getByRole('navigation', { name: 'Notes' })).toContainText('Welcome')
  await expect(editor()).toContainText('Welcome to NoteMark')
})

test('create, name, write and find a note', async () => {
  await expect(editor()).toBeVisible()

  await page.keyboard.press(`${mod}+N`)
  const title = page.getByLabel('Note title')
  await expect(title).toBeFocused()
  await title.fill('Shopping')
  await title.press('Enter')

  await editor().click()
  await page.keyboard.type('Milk, eggs and bread')

  // Autosave writes the file shortly after typing stops.
  await expect
    .poll(() => readFile(path.join(notesDir, 'Shopping.md'), 'utf8').catch(() => ''))
    .toContain('Milk, eggs and bread')

  await page.keyboard.press(`${mod}+P`)
  await page.getByPlaceholder('Search notes or type a command…').fill('eggs')
  await expect(page.getByRole('option', { name: /Shopping/ })).toBeVisible()
})

test('closing right after typing still saves the text', async () => {
  await editor().click()
  await page.keyboard.press(`${mod}+End`)
  await page.keyboard.type(' Last words before closing')
  // Close well inside the autosave delay; the window must wait for the save.
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close())
  await app.waitForEvent('close')
  expect(await readFile(path.join(notesDir, 'Welcome.md'), 'utf8')).toContain(
    'Last words before closing'
  )
  // Relaunch so afterEach has an app to close.
  app = await electron.launch({
    args: ['.'],
    env: { ...process.env, NOTEMARK_NOTES_DIR: notesDir, NOTEMARK_USER_DATA: userData }
  })
  page = await app.firstWindow()
})

test('picks up edits made outside the app', async () => {
  await expect(editor()).toBeVisible()
  await writeFile(path.join(notesDir, 'From outside.md'), 'Written by another editor')
  await expect(page.getByRole('navigation', { name: 'Notes' })).toContainText('From outside')
})

test('exports a note to PDF and HTML', async () => {
  await expect(editor()).toBeVisible()

  for (const kind of ['pdf', 'html'] as const) {
    const target = path.join(notesDir, `export.${kind}`)
    // Skip the native save dialog: answer it from the main process.
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showSaveDialog = (async () => ({ canceled: false, filePath })) as never
    }, target)

    const result = await page.evaluate((k) => window.context.exportNote('Welcome', k), kind)
    expect(result).toEqual({ ok: true, value: target })

    const bytes = await readFile(target)
    if (kind === 'pdf') expect(bytes.subarray(0, 5).toString()).toBe('%PDF-')
    else expect(bytes.toString()).toContain('<h1 class="doc-title">Welcome</h1>')
  }
})
