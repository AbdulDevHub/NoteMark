import { ensureDir, readdir, stat } from 'fs-extra'
import { homedir } from 'os'
import { appDirectoryName, fileEncoding } from '../../shared/constants'
import { NoteInfo } from '../../shared/models'
import { GetNotes } from '../../shared/types'

export const getRootDir = () => {
  return `${homedir}/${appDirectoryName}`
}

export const getNotes: GetNotes = async () => {
  const rootDir = getRootDir()

  await ensureDir(rootDir)

  const notesFileNames = await readdir(rootDir, {
    encoding: fileEncoding,
    withFileTypes: false
  })

  const notes = notesFileNames.filter((fileName) => fileName.endsWith('.md'))

  return Promise.all(notes.map(getNotesFromFilename))
}

export const getNotesFromFilename = async (filename: string): Promise<NoteInfo> => {
  const fileState = await stat(`${getRootDir()}/${filename}`)

  return {
    title: filename.replace(/\.md$/, ''),
    lastEditTime: fileState.mtimeMs
  }
}
