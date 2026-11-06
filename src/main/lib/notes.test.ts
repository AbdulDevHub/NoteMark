import { mkdtemp, readFile, readdir, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as notes from './notes'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'notemark-test-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

const put = async (title: string, content: string, mtime?: Date) => {
  const file = path.join(dir, `${title}.md`)
  await writeFile(file, content)
  if (mtime) await utimes(file, mtime, mtime)
}

describe('notePath', () => {
  it('keeps every note directly inside the notes folder', () => {
    expect(notes.notePath(dir, 'Ideas')).toBe(path.join(path.resolve(dir), 'Ideas.md'))
    expect(() => notes.notePath(dir, '../escape')).toThrow()
    expect(() => notes.notePath(dir, 'sub/note')).toThrow()
  })
})

describe('getNotes', () => {
  it('lists only .md files, newest first, with excerpts', async () => {
    await put('Old', '# Old note\nfirst body', new Date(2020, 0, 1))
    await put('New', 'second **body**', new Date(2024, 0, 1))
    await writeFile(path.join(dir, 'image.png'), '')
    await writeFile(path.join(dir, '.hidden.md'), '')

    const list = await notes.getNotes(dir)
    expect(list.map((n) => n.title)).toEqual(['New', 'Old'])
    expect(list[0].excerpt).toBe('second body')
  })

  it('creates the folder if it does not exist yet', async () => {
    const nested = path.join(dir, 'does', 'not', 'exist')
    expect(await notes.getNotes(nested)).toEqual([])
  })
})

describe('createNote', () => {
  it('picks the next free Untitled name and never overwrites', async () => {
    await put('Untitled', 'keep me')
    const created = await notes.createNote(dir)
    expect(created.title).toBe('Untitled 2')
    expect(await readFile(path.join(dir, 'Untitled.md'), 'utf8')).toBe('keep me')
  })
})

describe('writeNote and readNote', () => {
  it('round-trips content and returns fresh info', async () => {
    await put('Draft', '')
    const info = await notes.writeNote(dir, 'Draft', 'Hello *there*')
    expect(info.excerpt).toBe('Hello there')
    expect(await notes.readNote(dir, 'Draft')).toBe('Hello *there*')
  })

  it('refuses unsafe titles', async () => {
    await expect(notes.writeNote(dir, '../../evil', 'x')).rejects.toThrow()
  })
})

describe('renameNote', () => {
  it('renames the file', async () => {
    await put('Before', 'body')
    const result = await notes.renameNote(dir, 'Before', '  After  ')
    expect(result.ok && result.value.title).toBe('After')
    expect(await readdir(dir)).toEqual(['After.md'])
  })

  it('refuses to overwrite another note, ignoring case', async () => {
    await put('One', '1')
    await put('Two', '2')
    const result = await notes.renameNote(dir, 'One', 'two')
    expect(result.ok).toBe(false)
    expect(await notes.readNote(dir, 'Two')).toBe('2')
  })

  it('allows a case-only rename of the same note', async () => {
    await put('todo', 'x')
    const result = await notes.renameNote(dir, 'todo', 'Todo')
    expect(result.ok).toBe(true)
    expect(await readdir(dir)).toEqual(['Todo.md'])
  })

  it('rejects invalid titles without touching the file', async () => {
    await put('Keep', 'x')
    expect((await notes.renameNote(dir, 'Keep', 'bad/name')).ok).toBe(false)
    expect(await readdir(dir)).toEqual(['Keep.md'])
  })
})

describe('searchNotes', () => {
  it('returns title matches before content matches', async () => {
    // The newer note mentions "pasta" in its body; the older one has it in the title.
    await put('Pasta night', 'menu', new Date(2020, 0, 1))
    await put('Journal', 'Made fresh pasta today', new Date(2024, 0, 1))
    await put('Other', 'nothing here')

    const results = await notes.searchNotes(dir, 'pasta')
    expect(results.map((r) => [r.title, r.matchedIn])).toEqual([
      ['Pasta night', 'title'],
      ['Journal', 'content']
    ])
    expect(results[1].snippet).toBe('Made fresh pasta today')
  })

  it('returns nothing for a blank query', async () => {
    await put('A', 'b')
    expect(await notes.searchNotes(dir, '  ')).toEqual([])
  })
})
