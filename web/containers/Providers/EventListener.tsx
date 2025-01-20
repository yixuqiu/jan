import { useCallback, useEffect } from 'react'

import React from 'react'

import {
  DownloadEvent,
  events,
  DownloadState,
  ModelEvent,
  ExtensionTypeEnum,
  ModelExtension,
  ModelManager,
  Model,
} from '@janhq/core'

import { useSetAtom } from 'jotai'

import { setDownloadStateAtom } from '@/hooks/useDownloadState'

import { formatExtensionsName } from '@/utils/converter'

import { toaster } from '../Toast'

import AppUpdateListener from './AppUpdateListener'
import ClipboardListener from './ClipboardListener'
import ModelHandler from './ModelHandler'

import ModelImportListener from './ModelImportListener'
import QuickAskListener from './QuickAskListener'

import { extensionManager } from '@/extension'
import {
  InstallingExtensionState,
  removeInstallingExtensionAtom,
  setInstallingExtensionAtom,
} from '@/helpers/atoms/Extension.atom'
import {
  addDownloadingModelAtom,
  removeDownloadingModelAtom,
} from '@/helpers/atoms/Model.atom'

const EventListener = () => {
  const setDownloadState = useSetAtom(setDownloadStateAtom)
  const setInstallingExtension = useSetAtom(setInstallingExtensionAtom)
  const removeInstallingExtension = useSetAtom(removeInstallingExtensionAtom)
  const addDownloadingModel = useSetAtom(addDownloadingModelAtom)
  const removeDownloadingModel = useSetAtom(removeDownloadingModelAtom)

  const onFileDownloadUpdate = useCallback(
    async (state: DownloadState) => {
      console.debug('onFileDownloadUpdate', state)
      if (state.downloadType === 'extension') {
        const installingExtensionState: InstallingExtensionState = {
          extensionId: state.extensionId!,
          percentage: state.percent,
          localPath: state.localPath,
        }
        setInstallingExtension(state.extensionId!, installingExtensionState)
      } else {
        addDownloadingModel(state.modelId)
        setDownloadState(state)
      }
    },
    [addDownloadingModel, setDownloadState, setInstallingExtension]
  )

  const onFileDownloadError = useCallback(
    (state: DownloadState) => {
      console.debug('onFileDownloadError', state)
      if (state.downloadType === 'extension') {
        removeInstallingExtension(state.extensionId!)
      } else {
        state.downloadState = 'error'
        setDownloadState(state)
        removeDownloadingModel(state.modelId)
      }
    },
    [removeInstallingExtension, setDownloadState, removeDownloadingModel]
  )

  const onFileDownloadStopped = useCallback(
    (state: DownloadState) => {
      console.debug('onFileDownloadError', state)
      if (state.downloadType === 'extension') {
        removeInstallingExtension(state.extensionId!)
      } else {
        state.downloadState = 'error'
        state.error = 'aborted'
        setDownloadState(state)
        removeDownloadingModel(state.modelId)
      }
    },
    [removeInstallingExtension, setDownloadState, removeDownloadingModel]
  )

  const onFileDownloadSuccess = useCallback(
    async (state: DownloadState) => {
      console.debug('onFileDownloadSuccess', state)
      if (state.downloadType !== 'extension') {
        // Update model metadata accordingly
        const model = ModelManager.instance().models.get(state.modelId)
        if (model) {
          await extensionManager
            .get<ModelExtension>(ExtensionTypeEnum.Model)
            ?.updateModel({
              id: model.id,
              ...model.settings,
              ...model.parameters,
            } as Partial<Model>)
            .catch((e) => console.debug(e))

          toaster({
            title: 'Download Completed',
            description: `Download ${state.modelId} completed`,
            type: 'success',
          })
        }
        state.downloadState = 'end'
        setDownloadState(state)
        removeDownloadingModel(state.modelId)
        events.emit(ModelEvent.OnModelsUpdate, { fetch: true })
      }
    },
    [removeDownloadingModel, setDownloadState]
  )

  const onFileUnzipSuccess = useCallback(
    (state: DownloadState) => {
      console.debug('onFileUnzipSuccess', state)
      toaster({
        title: 'Success',
        description: `Install ${formatExtensionsName(state.extensionId!)} successfully.`,
        type: 'success',
      })
      removeInstallingExtension(state.extensionId!)
    },
    [removeInstallingExtension]
  )

  useEffect(() => {
    console.debug('EventListenerWrapper: registering event listeners...')
    events.on(DownloadEvent.onFileDownloadUpdate, onFileDownloadUpdate)
    events.on(DownloadEvent.onFileDownloadError, onFileDownloadError)
    events.on(DownloadEvent.onFileDownloadSuccess, onFileDownloadSuccess)
    events.on(DownloadEvent.onFileDownloadStopped, onFileDownloadStopped)
    events.on(DownloadEvent.onFileUnzipSuccess, onFileUnzipSuccess)

    return () => {
      console.debug('EventListenerWrapper: unregistering event listeners...')
      events.off(DownloadEvent.onFileDownloadUpdate, onFileDownloadUpdate)
      events.off(DownloadEvent.onFileDownloadError, onFileDownloadError)
      events.off(DownloadEvent.onFileDownloadSuccess, onFileDownloadSuccess)
      events.off(DownloadEvent.onFileDownloadStopped, onFileDownloadStopped)
      events.off(DownloadEvent.onFileUnzipSuccess, onFileUnzipSuccess)
    }
  }, [
    onFileDownloadUpdate,
    onFileDownloadError,
    onFileDownloadSuccess,
    onFileUnzipSuccess,
    onFileDownloadStopped,
  ])

  return (
    <>
      <AppUpdateListener />
      <ClipboardListener />
      <ModelImportListener />
      <QuickAskListener />
      <ModelHandler />
    </>
  )
}

export default EventListener
