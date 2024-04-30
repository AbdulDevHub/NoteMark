//import { deleteNoteAtom } from '@/store'
//import { useSetAtom } from 'jotai'
import { FaRegTrashCan } from 'react-icons/fa6'
import { ActionButton, ActionButtonProps } from './ActionButton'

export const DeleteNoteButton = ({ ...props }: ActionButtonProps) => {
  //const deleteNote = useSetAtom(deleteNoteAtom)

  //const handleDelete = async () => {
  // await deleteNote()
  //}

  return (
    <ActionButton {...props}>
      <FaRegTrashCan className="w-4 h-4 text-zinc-300" />
    </ActionButton>
  )
}
