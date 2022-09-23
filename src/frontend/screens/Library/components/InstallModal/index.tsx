import { faApple, faLinux, faWindows } from '@fortawesome/free-brands-svg-icons'
import { IconDefinition } from '@fortawesome/free-solid-svg-icons'

import React, { useContext, useEffect, useState } from 'react'

import ContextProvider from 'frontend/state/ContextProvider'
import { InstallPlatform, Runner, WineInstallation } from 'common/types'
import { Dialog } from 'frontend/components/UI/Dialog'

import './index.css'

import DownloadDialog from './DownloadDialog'
import SideloadDialog from './SideloadDialog'
import WineSelector from './WineSelector'
import { SelectField } from 'frontend/components/UI'
import { useTranslation } from 'react-i18next'

type Props = {
  appName: string
  backdropClick: () => void
  runner: Runner
}

export type AvailablePlatforms = {
  name: string
  available: boolean
  value: string
  icon: IconDefinition
}[]

export default function InstallModal({
  appName,
  backdropClick,
  runner
}: Props) {
  const { platform } = useContext(ContextProvider)
  const { t } = useTranslation('gamepage')

  const [winePrefix, setWinePrefix] = useState('...')
  const [wineVersion, setWineVersion] = useState<WineInstallation | undefined>(
    undefined
  )
  const [wineVersionList, setWineVersionList] = useState<WineInstallation[]>([])

  const [isLinuxNative, setIsLinuxNative] = useState(false)
  const [isMacNative, setIsMacNative] = useState(false)
  const [defaultPlatform, setDefaultPlatform] =
    useState<InstallPlatform>('Windows')

  const isMac = platform === 'darwin'
  const isLinux = platform === 'linux'
  const isSideload = runner === 'sideload'

  const platforms: AvailablePlatforms = [
    {
      name: 'Linux',
      available: (isLinux && isSideload) || (isLinuxNative && !isMac),
      value: 'Linux',
      icon: faLinux
    },
    {
      name: 'macOS',
      available: (isMac && isSideload) || (isMacNative && !isLinux),
      value: 'Mac',
      icon: faApple
    },
    {
      name: 'Windows',
      available: true,
      value: 'Windows',
      icon: faWindows
    }
  ]

  const availablePlatforms: AvailablePlatforms = platforms.filter(
    (p) => p.available
  )

  useEffect(() => {
    const selectedPlatform = isLinuxNative
      ? 'linux'
      : isMacNative
      ? 'Mac'
      : 'Windows'

    setPlatformToInstall(selectedPlatform)
    setDefaultPlatform(selectedPlatform)
  }, [isLinuxNative, isMacNative])

  const [platformToInstall, setPlatformToInstall] =
    useState<InstallPlatform>(defaultPlatform)

  const hasWine = platformToInstall === 'Windows' && isLinux

  useEffect(() => {
    if (hasWine) {
      ;(async () => {
        const newWineList: WineInstallation[] =
          await window.api.getAlternativeWine()
        if (Array.isArray(newWineList)) {
          setWineVersionList(newWineList)
          if (wineVersion?.bin) {
            if (
              !newWineList.some(
                (newWine) => wineVersion && newWine.bin === wineVersion.bin
              )
            ) {
              setWineVersion(undefined)
            }
          }
        }
      })()
    }
  }, [hasWine, wineVersion])

  function platformSelection() {
    const showPlatformSelection = availablePlatforms.length > 1

    if (!showPlatformSelection) {
      return null
    }
    return (
      <SelectField
        label={`${t('game.platform', 'Select Platform Version to Install')}:`}
        htmlId="platformPick"
        value={platformToInstall}
        onChange={(e) =>
          setPlatformToInstall(e.target.value as InstallPlatform)
        }
      >
        {availablePlatforms.map((p) => (
          <option value={p.value} key={p.value}>
            {p.name}
          </option>
        ))}
      </SelectField>
    )
  }

  return (
    <div className="InstallModal">
      <Dialog onClose={backdropClick} className={'InstallModal__dialog'}>
        {!isSideload ? (
          <DownloadDialog
            {...{
              platformToInstall,
              wineVersionList,
              setIsLinuxNative,
              backdropClick,
              availablePlatforms,
              appName,
              runner,
              setIsMacNative,
              setPlatformToInstall,
              winePrefix,
              hasWine,
              wineVersion
            }}
          >
            {platformSelection()}
            {hasWine ? (
              <WineSelector
                {...{
                  winePrefix,
                  wineVersion,
                  wineVersionList,
                  setWinePrefix,
                  setWineVersion,
                  runner,
                  appName
                }}
              />
            ) : null}
          </DownloadDialog>
        ) : (
          <SideloadDialog
            {...{
              setWinePrefix,
              setPlatformToInstall,
              setWineVersion,
              availablePlatforms,
              winePrefix,
              wineVersion,
              wineVersionList,
              hasWine,
              backdropClick
            }}
          >
            {platformSelection()}
            {hasWine ? (
              <WineSelector
                {...{
                  winePrefix,
                  wineVersion,
                  wineVersionList,
                  setWinePrefix,
                  setWineVersion,
                  runner,
                  appName
                }}
              />
            ) : null}
          </SideloadDialog>
        )}
      </Dialog>
    </div>
  )
}
