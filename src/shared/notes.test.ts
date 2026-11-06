import { describe, expect, it } from 'vitest'
import {
  countWords,
  formatRelativeTime,
  makeExcerpt,
  matchNote,
  nextUntitledTitle,
  readingTimeMinutes,
  stripMarkdown,
  validateTitle
} from './notes'

describe('validateTitle', () => {
  it('accepts and trims normal titles', () => {
    expect(validateTitle('  Groceries  ')).toEqual({ ok: true, value: 'Groceries' })
    expect(validateTitle('Week 3 – notes (draft)')).toEqual({
      ok: true,
      value: 'Week 3 – notes (draft)'
    })
  })

  it.each([
    ['', 'empty'],
    ['   ', 'blank'],
    ['../secrets', 'path traversal'],
    ['a/b', 'forward slash'],
    ['a\\b', 'backslash'],
    ['what?', 'question mark'],
    ['a:b', 'colon'],
    ['.hidden', 'leading dot'],
    ['trailing.', 'trailing dot'],
    ['CON', 'Windows reserved name'],
    ['lpt1', 'Windows reserved name, lower case'],
    ['con.notes', 'Windows reserved name with an extension'],
    ['x'.repeat(121), 'too long']
  ])('rejects %j (%s)', (title) => {
    expect(validateTitle(title).ok).toBe(false)
  })
})

describe('nextUntitledTitle', () => {
  it('starts at "Untitled" and counts up past taken names, ignoring case', () => {
    expect(nextUntitledTitle([])).toBe('Untitled')
    expect(nextUntitledTitle(['untitled'])).toBe('Untitled 2')
    expect(nextUntitledTitle(['Untitled', 'Untitled 2', 'Untitled 4'])).toBe('Untitled 3')
  })
})

describe('stripMarkdown and makeExcerpt', () => {
  const md = [
    '---',
    'tags: [a, b]',
    '---',
    '# Heading',
    '',
    'Some **bold** and _italic_ text with a [link](https://example.com) and `code`.',
    '',
    '- [x] done item',
    '> quoted',
    '',
    '```js',
    'const x = 1',
    '```'
  ].join('\n')

  it('removes syntax but keeps the words', () => {
    const text = stripMarkdown(md)
    expect(text).not.toMatch(/[#*_`[\]>]|tags:|https:/)
    expect(text).toContain('Some bold and italic text with a link and code.')
    expect(text).toContain('done item')
    expect(text).toContain('const x = 1')
  })

  it('skips an opening heading that repeats the title', () => {
    expect(makeExcerpt('# Groceries\n\nmilk, eggs', 140, 'groceries')).toBe('milk, eggs')
    expect(makeExcerpt('# Monday\n\nmilk', 140, 'Groceries')).toBe('Monday milk')
  })

  it('collapses whitespace and truncates with an ellipsis', () => {
    expect(makeExcerpt('one\n\n  two   three')).toBe('one two three')
    const long = makeExcerpt('word '.repeat(100), 20)
    expect(long.length).toBeLessThanOrEqual(20)
    expect(long.endsWith('…')).toBe(true)
  })
})

describe('countWords and readingTimeMinutes', () => {
  it('counts words, not Markdown symbols', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('# Hello **world**\n\n- one\n- two')).toBe(4)
    expect(countWords("it's a well-known café")).toBe(4)
  })

  it('rounds reading time up', () => {
    expect(readingTimeMinutes(0)).toBe(0)
    expect(readingTimeMinutes(1)).toBe(1)
    expect(readingTimeMinutes(231)).toBe(2)
  })
})

describe('matchNote', () => {
  it('prefers title matches', () => {
    expect(matchNote('Shopping list', 'eggs', 'shop')?.matchedIn).toBe('title')
  })

  it('finds content matches case-insensitively with a snippet around the hit', () => {
    const content = `${'intro '.repeat(20)}The Quick brown fox ${'outro '.repeat(30)}`
    const match = matchNote('Animals', content, 'quick BROWN')
    expect(match?.matchedIn).toBe('content')
    expect(match?.snippet).toContain('Quick brown fox')
    expect(match?.snippet.startsWith('…')).toBe(true)
    expect(match?.snippet.endsWith('…')).toBe(true)
  })

  it('returns null for no match or an empty query', () => {
    expect(matchNote('A', 'b', 'zzz')).toBeNull()
    expect(matchNote('A', 'b', '   ')).toBeNull()
  })
})

describe('formatRelativeTime', () => {
  const now = new Date(2026, 10, 5, 15, 0).getTime()
  const minutes = (n: number) => now - n * 60_000

  it('describes recent edits in words', () => {
    expect(formatRelativeTime(minutes(0.5), now)).toBe('Just now')
    expect(formatRelativeTime(minutes(5), now)).toBe('5 min ago')
    expect(formatRelativeTime(minutes(180), now)).toBe('3 h ago')
    expect(formatRelativeTime(new Date(2026, 10, 4, 20, 0).getTime(), now)).toBe('Yesterday')
  })

  it('falls back to a date, adding the year only when it differs', () => {
    expect(formatRelativeTime(new Date(2026, 0, 2).getTime(), now, 'en-US')).toBe('Jan 2')
    expect(formatRelativeTime(new Date(2024, 0, 2).getTime(), now, 'en-US')).toBe('Jan 2, 2024')
  })
})
