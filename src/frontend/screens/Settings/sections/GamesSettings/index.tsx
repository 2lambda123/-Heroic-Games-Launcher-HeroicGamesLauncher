import './index.scss'

import React, { useContext, useEffect } from 'react'

import { useTranslation } from 'react-i18next'
import {
  AlternativeExe,
  AutoDXVK,
  AutoVKD3D,
  BattlEyeRuntime,
  CrossoverBottle,
  EacRuntime,
  EnableEsync,
  EnableFSR,
  EnableFsync,
  EnvVariablesTable,
  GameMode,
  LauncherArgs,
  Mangohud,
  OfflineMode,
  PreferedLanguage,
  PreferSystemLibs,
  ShowFPS,
  SteamRuntime,
  UseDGPU,
  WinePrefix,
  WineVersionSelector,
  WrappersTable,
  EnableDXVKFpsLimit,
  IgnoreGameUpdates
} from '../../components'
import ContextProvider from 'frontend/state/ContextProvider'
import Tools from '../../components/Tools'
import SettingsContext from '../../SettingsContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons'
import useSetting from 'frontend/hooks/useSetting'
import { defaultWineVersion } from '../..'
import Collapsible from 'frontend/components/UI/Collapsible/Collapsible'
import SyncSaves from '../SyncSaves'
import FooterInfo from '../FooterInfo'

type Props = {
  useDetails?: boolean
}

export default function GamesSettings({ useDetails = true }: Props) {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isDefault, gameInfo, isLinuxNative } = useContext(SettingsContext)
  const [wineVersion] = useSetting('wineVersion', defaultWineVersion)
  const [nativeGame, setNativeGame] = React.useState(false)
  const isLinux = platform === 'linux'
  const isCrossover = wineVersion?.type === 'crossover'
  const hasCloudSaves = gameInfo?.cloud_save_enabled

  useEffect(() => {
    const getIsNative = async () => {
      if (gameInfo) {
        const isNative = await window.api.isNative({
          appName: gameInfo?.app_name,
          runner: gameInfo?.runner
        })
        setNativeGame(isNative)
      }
    }
    getIsNative()
  }, [])

  return (
    <>
      {isDefault && (
        <p className="defaults-hint">
          <FontAwesomeIcon icon={faInfoCircle} />
          {t(
            'settings.default_hint',
            'Changes in this section only apply as default values when installing games. If you want to change the settings of an already installed game, use the Settings button in the game page.'
          )}
        </p>
      )}

      {!nativeGame && (
        <>
          <Collapsible
            isOpen
            isCollapsible={useDetails}
            summary={isLinux ? 'Wine' : 'Wine/Crossover'}
          >
            <WineVersionSelector />
            <WinePrefix />
            <CrossoverBottle />

            {!isCrossover && (
              <>
                <AutoDXVK />
                {isLinux && (
                  <>
                    <AutoVKD3D />

                    <EacRuntime />

                    <BattlEyeRuntime />
                  </>
                )}
                <Tools />
              </>
            )}
          </Collapsible>
        </>
      )}

      <Collapsible
        isOpen={nativeGame}
        isCollapsible={useDetails}
        summary={
          nativeGame
            ? t('settings.navbar.advanced', 'Advanced')
            : t('settings.navbar.other', 'Other')
        }
      >
        <AlternativeExe />

        {!nativeGame && <ShowFPS />}

        {!nativeGame && <EnableDXVKFpsLimit />}

        {isLinux && !nativeGame && (
          <>
            <PreferSystemLibs />

            <EnableEsync />

            {isLinux && (
              <>
                <EnableFsync />

                <EnableFSR />

                <GameMode />
              </>
            )}
          </>
        )}

        <UseDGPU />

        {isLinux && <Mangohud />}

        <SteamRuntime />

        <IgnoreGameUpdates />

        <OfflineMode />

        <EnvVariablesTable />

        <WrappersTable />

        <LauncherArgs />

        <PreferedLanguage />
      </Collapsible>

      {hasCloudSaves && !isLinuxNative && (
        <Collapsible
          isOpen={false}
          isCollapsible={useDetails}
          summary={t('settings.navbar.sync', 'Cloud Saves Sync')}
        >
          <SyncSaves />
        </Collapsible>
      )}

      <FooterInfo />
    </>
  )
}
