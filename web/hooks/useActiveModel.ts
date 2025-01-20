import { useCallback, useEffect, useRef } from 'react'

import { EngineManager, InferenceEngine, Model } from '@janhq/core'
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai'

import { toaster } from '@/containers/Toast'

import { LAST_USED_MODEL_ID } from './useRecommendedModel'

import { vulkanEnabledAtom } from '@/helpers/atoms/AppConfig.atom'
import { activeAssistantAtom } from '@/helpers/atoms/Assistant.atom'
import { downloadedModelsAtom } from '@/helpers/atoms/Model.atom'

export const activeModelAtom = atom<Model | undefined>(undefined)
export const loadModelErrorAtom = atom<string | undefined>(undefined)

type ModelState = {
  state: string
  loading: boolean
  model?: Model
}

export const stateModelAtom = atom<ModelState>({
  state: 'start',
  loading: false,
  model: undefined,
})

export function useActiveModel() {
  const [activeModel, setActiveModel] = useAtom(activeModelAtom)
  const [stateModel, setStateModel] = useAtom(stateModelAtom)
  const downloadedModels = useAtomValue(downloadedModelsAtom)
  const setLoadModelError = useSetAtom(loadModelErrorAtom)
  const pendingModelLoad = useRef(false)
  const isVulkanEnabled = useAtomValue(vulkanEnabledAtom)
  const activeAssistant = useAtomValue(activeAssistantAtom)

  const downloadedModelsRef = useRef<Model[]>([])

  useEffect(() => {
    downloadedModelsRef.current = downloadedModels
  }, [downloadedModels])

  const startModel = async (modelId: string, abortable: boolean = true) => {
    if (
      (activeModel && activeModel.id === modelId) ||
      (stateModel.model?.id === modelId && stateModel.loading)
    ) {
      console.debug(`Model ${modelId} is already initialized. Ignore..`)
      return Promise.resolve()
    }

    if (activeModel) {
      await stopModel(activeModel)
    }
    pendingModelLoad.current = true

    let model = downloadedModelsRef?.current.find((e) => e.id === modelId)

    setLoadModelError(undefined)

    setActiveModel(undefined)

    setStateModel({ state: 'start', loading: true, model })

    if (!model) {
      toaster({
        title: `Model ${modelId} not found!`,
        description: `Please download the model first.`,
        type: 'warning',
      })
      setStateModel(() => ({
        state: 'start',
        loading: false,
        model: undefined,
      }))

      return Promise.reject(`Model ${modelId} not found!`)
    }

    /// Apply thread model settings
    if (activeAssistant?.model.id === modelId) {
      model = {
        ...model,
        settings: {
          ...model.settings,
          ...activeAssistant?.model.settings,
        },
      }
    }

    if (isVulkanEnabled) {
      // @ts-expect-error flash_attn is newly added and will be migrate to cortex in the future
      model.settings['flash_attn'] = false
    }

    localStorage.setItem(LAST_USED_MODEL_ID, model.id)
    const engine = EngineManager.instance().get(InferenceEngine.cortex)
    return engine
      ?.loadModel(model)
      .then(() => {
        setActiveModel(model)
        setStateModel(() => ({
          state: 'stop',
          loading: false,
          model,
        }))
        toaster({
          title: 'Success!',
          description: `Model ${model.id} has been started.`,
          type: 'success',
        })
      })
      .catch((error) => {
        setStateModel(() => ({
          state: 'start',
          loading: false,
          undefined,
        }))

        if (!pendingModelLoad.current && abortable) {
          return Promise.reject(new Error('aborted'))
        }

        toaster({
          title: 'Failed!',
          description: `Model ${model.id} failed to start. ${error.message ?? ''}`,
          type: 'error',
        })
        setLoadModelError(error.message ?? error)
        return Promise.reject(error)
      })
  }

  const stopModel = useCallback(
    async (model?: Model) => {
      const stoppingModel = model ?? activeModel ?? stateModel.model
      if (!stoppingModel || (stateModel.state === 'stop' && stateModel.loading))
        return

      const engine = EngineManager.instance().get(InferenceEngine.cortex)
      return engine
        ?.unloadModel(stoppingModel)
        .catch((e) => console.error(e))
        .then(() => {
          setActiveModel(undefined)
          setStateModel({ state: 'start', loading: false, model: undefined })
          pendingModelLoad.current = false
        })
    },
    [activeModel, setStateModel, setActiveModel, stateModel]
  )

  const stopInference = useCallback(async () => {
    // Loading model
    if (stateModel.loading) {
      stopModel()
      return
    }
    if (!activeModel) return

    const engine = EngineManager.instance().get(InferenceEngine.cortex)
    engine?.stopInference()
  }, [activeModel, stateModel, stopModel])

  return { activeModel, startModel, stopModel, stopInference, stateModel }
}
