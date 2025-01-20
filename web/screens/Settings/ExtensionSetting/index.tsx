import React, { Fragment, useEffect, useMemo, useState } from 'react'

import {
  BaseExtension,
  InstallationState,
  SettingComponentProps,
} from '@janhq/core'

import { useAtomValue } from 'jotai'

import ExtensionItem from '../CoreExtensions/ExtensionItem'
import SettingDetailItem from '../SettingDetail/SettingDetailItem'

import { extensionManager } from '@/extension'
import { selectedSettingAtom } from '@/helpers/atoms/Setting.atom'

const ExtensionSetting = ({ extensionName }: { extensionName?: string }) => {
  const selectedExtensionName = useAtomValue(selectedSettingAtom)
  const [settings, setSettings] = useState<SettingComponentProps[]>([])
  const [installationState, setInstallationState] =
    useState<InstallationState>('NotRequired')
  const [baseExtension, setBaseExtension] = useState<BaseExtension | undefined>(
    undefined
  )

  const currentExtensionName = useMemo(
    () => extensionName ?? selectedExtensionName,
    [selectedExtensionName, extensionName]
  )

  useEffect(() => {
    const getExtensionSettings = async () => {
      if (!currentExtensionName) return
      const allSettings: SettingComponentProps[] = []
      const baseExtension = extensionManager.getByName(currentExtensionName)
      if (!baseExtension) return

      setBaseExtension(baseExtension)
      if (typeof baseExtension.getSettings === 'function') {
        const setting = await baseExtension.getSettings()
        if (setting) allSettings.push(...setting)
      }
      setSettings(allSettings)

      setInstallationState(await baseExtension.installationState())
    }
    getExtensionSettings()
  }, [currentExtensionName])

  const onValueChanged = async (
    key: string,
    value: string | number | boolean | string[]
  ) => {
    // find the key in settings state, update it and set the state back
    const newSettings = settings.map((setting) => {
      if (setting.key !== key) return setting
      setting.controllerProps.value = value

      const extensionName = setting.extensionName
      if (extensionName) {
        extensionManager.getByName(extensionName)?.updateSettings([setting])
      }

      return setting
    })

    setSettings(newSettings)
  }

  return (
    <Fragment>
      {settings.length > 0 && (
        <SettingDetailItem
          componentProps={settings}
          onValueUpdated={onValueChanged}
        />
      )}
      {baseExtension && installationState !== 'NotRequired' && (
        <ExtensionItem item={baseExtension} />
      )}
    </Fragment>
  )
}

export default ExtensionSetting
