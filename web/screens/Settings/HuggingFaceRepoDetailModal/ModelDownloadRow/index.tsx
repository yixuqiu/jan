import { useCallback } from 'react'

import { DownloadState, HuggingFaceRepoData, Quantization } from '@janhq/core'
import { Badge, Button, Progress } from '@janhq/joi'

import { useAtomValue, useSetAtom } from 'jotai'

import { twMerge } from 'tailwind-merge'

import { MainViewState } from '@/constants/screens'

import { useCreateNewThread } from '@/hooks/useCreateNewThread'
import useDownloadModel from '@/hooks/useDownloadModel'
import { modelDownloadStateAtom } from '@/hooks/useDownloadState'

import { formatDownloadPercentage, toGibibytes } from '@/utils/converter'

import { normalizeModelId } from '@/utils/model'

import { mainViewStateAtom } from '@/helpers/atoms/App.atom'
import { assistantsAtom } from '@/helpers/atoms/Assistant.atom'

import { importHuggingFaceModelStageAtom } from '@/helpers/atoms/HuggingFace.atom'
import {
  downloadedModelsAtom,
  getDownloadingModelAtom,
} from '@/helpers/atoms/Model.atom'

type Props = {
  index: number
  repoData: HuggingFaceRepoData
  downloadUrl: string
  fileName: string
  fileSize?: number
  quantization?: Quantization
}

const ModelDownloadRow: React.FC<Props> = ({
  downloadUrl,
  fileName,
  fileSize = 0,
  quantization,
}) => {
  const downloadedModels = useAtomValue(downloadedModelsAtom)
  const { downloadModel, abortModelDownload } = useDownloadModel()
  const allDownloadStates = useAtomValue(modelDownloadStateAtom)
  const downloadState: DownloadState | undefined = allDownloadStates[fileName]
  const downloadingModels = useAtomValue(getDownloadingModelAtom)

  const { requestCreateNewThread } = useCreateNewThread()
  const setMainViewState = useSetAtom(mainViewStateAtom)
  const assistants = useAtomValue(assistantsAtom)
  const downloadedModel = downloadedModels.find((md) => md.id === fileName)
  const isDownloading = downloadingModels.some((md) => md === fileName)

  const setHfImportingStage = useSetAtom(importHuggingFaceModelStageAtom)

  const onAbortDownloadClick = useCallback(() => {
    if (downloadUrl) {
      abortModelDownload(normalizeModelId(downloadUrl))
    }
  }, [downloadUrl, abortModelDownload])

  const onDownloadClick = useCallback(async () => {
    if (downloadUrl) {
      downloadModel(
        downloadUrl,
        normalizeModelId(downloadUrl),
        normalizeModelId(downloadUrl)
      )
    }
  }, [downloadUrl, downloadModel])

  const onUseModelClick = useCallback(async () => {
    if (assistants.length === 0) {
      alert('No assistant available')
      return
    }
    await requestCreateNewThread(assistants[0], downloadedModel)
    setMainViewState(MainViewState.Thread)
    setHfImportingStage('NONE')
  }, [
    assistants,
    downloadedModel,
    requestCreateNewThread,
    setMainViewState,
    setHfImportingStage,
  ])

  if (!downloadUrl) {
    return null
  }

  return (
    <div className="flex flex-col gap-4 rounded border border-[hsla(var(--app-border))] p-3 md:flex-row md:items-center md:justify-between xl:w-full">
      <div className="flex max-w-[50%] justify-between">
        <div className="flex min-w-[280px] max-w-[280px]">
          {quantization && (
            <Badge variant="soft" className="mr-1">
              {quantization}
            </Badge>
          )}
          <h1
            className={twMerge(
              'mr-5 line-clamp-1 font-medium text-[hsla(var(--text-secondary))]'
            )}
            title={fileName}
          >
            {fileName}
          </h1>
        </div>
        <div className="md:min-w-[90px] md:max-w-[90px]">
          <Badge theme="secondary" className="ml-4 hidden md:flex">
            {toGibibytes(fileSize)}
          </Badge>
        </div>
      </div>

      {downloadedModel ? (
        <Button
          variant="soft"
          className="min-w-[98px]"
          onClick={onUseModelClick}
          data-testid={`use-model-btn-${downloadUrl}`}
        >
          Use
        </Button>
      ) : isDownloading ? (
        <Button variant="soft">
          <div className="flex items-center space-x-2">
            <span className="inline-block" onClick={onAbortDownloadClick}>
              Cancel
            </span>
            <Progress
              className="inline-block h-2 w-[80px]"
              value={
                formatDownloadPercentage(downloadState?.percent, {
                  hidePercentage: true,
                }) as number
              }
            />
            <span className="tabular-nums">
              {formatDownloadPercentage(downloadState?.percent)}
            </span>
          </div>
        </Button>
      ) : (
        <Button onClick={onDownloadClick}>Download</Button>
      )}
    </div>
  )
}

export default ModelDownloadRow
