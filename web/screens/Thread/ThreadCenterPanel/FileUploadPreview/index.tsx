import React from 'react'

import { useAtom, useSetAtom } from 'jotai'

import { XIcon } from 'lucide-react'

import { currentPromptAtom, fileUploadAtom } from '@/containers/Providers/Jotai'

import { toGibibytes } from '@/utils/converter'

import Icon from './Icon'

const FileUploadPreview = () => {
  const [fileUpload, setFileUpload] = useAtom(fileUploadAtom)
  const setCurrentPrompt = useSetAtom(currentPromptAtom)

  const onDeleteClick = () => {
    setFileUpload(undefined)
    setCurrentPrompt('')
  }

  return (
    <div className="flex flex-col rounded-t-lg border border-b-0 border-[hsla(var(--app-border))] p-4">
      {!!fileUpload && (
        <div className="bg-secondary relative inline-flex w-60 space-x-3 rounded-lg p-4">
          <Icon type={fileUpload?.type} />

          <div className="w-full">
            <h6 className="line-clamp-1 w-3/4 truncate font-medium">
              {fileUpload?.file.name.replaceAll(/[-._]/g, ' ')}
            </h6>
            <p className="text-[hsla(var(--text-secondary)]">
              {toGibibytes(fileUpload?.file.size)}
            </p>
          </div>

          <div
            className="absolute -right-2 -top-2 cursor-pointer rounded-full p-0.5"
            onClick={onDeleteClick}
          >
            <XIcon size={14} className="text-background" />
          </div>
        </div>
      )}
    </div>
  )
}

export default FileUploadPreview
