import short from 'short-uuid'
import { faFolderOpen } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { InstallPlatform, WineInstallation } from 'common/types'
import {
  CachedImage,
  TextInputField,
  TextInputWithIconField
} from 'frontend/components/UI'
import { DialogContent, DialogFooter } from 'frontend/components/UI/Dialog'
import {
  getAppSettings,
  getGameInfo,
  getGameSettings,
  writeConfig
} from 'frontend/helpers'
import { Path } from 'frontend/types'
import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AvailablePlatforms } from '..'
import fallbackImage from 'frontend/assets/fallback-image.jpg'
import ContextProvider from 'frontend/state/ContextProvider'

type Props = {
  availablePlatforms: AvailablePlatforms
  winePrefix: string
  wineVersion: WineInstallation | undefined
  setWinePrefix: React.Dispatch<React.SetStateAction<string>>
  children: React.ReactNode
  platformToInstall: InstallPlatform
  backdropClick: () => void
  appName?: string
}

export default function SideloadDialog({
  availablePlatforms,
  backdropClick,
  winePrefix,
  wineVersion,
  platformToInstall,
  setWinePrefix,
  children,
  appName
}: Props) {
  const { t } = useTranslation('gamepage')
  const [title, setTitle] = useState<string | never>(
    t('sideload.field.title', 'Title')
  )
  const [selectedExe, setSelectedExe] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [app_name, setApp_name] = useState(appName ?? '')
  const [runningSetup, setRunningSetup] = useState(false)
  const editMode = Boolean(appName)

  const { refreshLibrary } = useContext(ContextProvider)

  useEffect(() => {
    if (appName) {
      getGameInfo(appName, 'sideload').then(
        ({
          art_cover,
          art_square,
          install: { executable, platform },
          title
        }) => {
          if (executable && platform) {
            setSelectedExe(executable)
          }
          setTitle(title)
          setImageUrl(art_cover ? art_cover : art_square)
        }
      )
    }
    if (!appName) {
      setApp_name(short.generate().toString())
    }
  }, [])

  useEffect(() => {
    const setWine = async () => {
      if (editMode && appName) {
        const appSettings = await window.api.getGameSettings(
          appName,
          'sideload'
        )
        setWinePrefix(appSettings.winePrefix)
        return
      } else {
        const { defaultWinePrefix } = await getAppSettings()
        const sugestedWinePrefix = `${defaultWinePrefix}/${title}`
        setWinePrefix(sugestedWinePrefix)
      }
    }
    setWine()
  }, [title])

  async function handleInstall(): Promise<void> {
    window.api.addNewApp({
      runner: 'sideload',
      app_name,
      title,
      install: {
        executable: selectedExe,
        platform: platformToInstall
      },
      art_cover: imageUrl,
      is_installed: true,
      art_square: imageUrl
    })
    await writeConfig([app_name, { winePrefix, wineVersion }])
    await refreshLibrary({
      runInBackground: true,
      checkForUpdates: true,
      fullRefresh: true
    })
    return backdropClick()
  }

  const fileFilters = {
    Windows: [
      { name: 'Executables', extensions: ['exe', 'msi'] },
      { name: 'Scripts', extensions: ['bat'] },
      { name: 'All', extensions: ['*'] }
    ],
    Linux: [
      { name: 'AppImages', extensions: ['AppImage'] },
      { name: 'Other Binaries', extensions: ['sh', 'py', 'bin'] },
      { name: 'All', extensions: ['*'] }
    ],
    Mac: [
      { name: 'Apps', extensions: ['App'] },
      { name: 'Other Binaries', extensions: ['sh', 'py', 'bin'] },
      { name: 'All', extensions: ['*'] }
    ]
  }

  const handleRunExe = async () => {
    let exeToRun = ''
    const { path } = await window.api.openDialog({
      buttonLabel: t('box.select.button', 'Select'),
      properties: ['openFile'],
      title: t('box.runexe.title'),
      filters: fileFilters[platformToInstall]
    })
    if (path) {
      exeToRun = path
      try {
        setRunningSetup(true)
        await writeConfig([app_name, { winePrefix, wineVersion }])
        const gameSettings = await getGameSettings(app_name, 'sideload')
        await window.api.runWineCommand({
          command: exeToRun,
          wait: true,
          forceRunInPrefixVerb: true,
          gameSettings: {
            ...gameSettings,
            winePrefix,
            wineVersion: wineVersion || gameSettings.wineVersion
          }
        })
        setRunningSetup(false)
      } catch (error) {
        console.log('finished with error', error)
        setRunningSetup(false)
      }
    }
    return
  }

  const platformIcon = availablePlatforms.filter(
    (p) => p.name === platformToInstall
  )[0]?.icon

  return (
    <>
      <DialogContent>
        <div className="sideloadGrid">
          <div className="imageIcons">
            <CachedImage
              className="appImage"
              src={imageUrl ? imageUrl : fallbackImage}
            />
            <span className="titleIcon">
              {title}
              <FontAwesomeIcon
                className="InstallModal__platformIcon"
                icon={platformIcon}
              />
            </span>
          </div>
          <div className="sideloadForm">
            <TextInputField
              label={t('sideload.info.title', 'Game/App Title')}
              placeholder={t(
                'sideload.placeholder.title',
                'Add a title to your Game/App'
              )}
              onChange={(e) => setTitle(e.target.value)}
              htmlId="sideload-title"
              value={title}
            />
            <TextInputField
              label={t('sideload.info.image', 'App Image')}
              placeholder={t(
                'sideload.placeholder.image',
                'Paste an Image URL here'
              )}
              onChange={(e) => setImageUrl(e.target.value)}
              htmlId="sideload-image"
              value={imageUrl}
            />
            {children}
            <TextInputWithIconField
              htmlId="sideload-exe"
              label={t('sideload.info.exe', 'Select Executable')}
              onChange={(e) => setSelectedExe(e.target.value)}
              icon={<FontAwesomeIcon icon={faFolderOpen} />}
              value={selectedExe}
              placeholder={t('sideload.info.exe', 'Select Executable')}
              onIconClick={async () =>
                window.api
                  .openDialog({
                    buttonLabel: t('box.select.button', 'Select'),
                    properties: ['openFile'],
                    title: t('box.sideload.exe', 'Select Executable'),
                    filters: fileFilters[platformToInstall]
                  })
                  .then(({ path }: Path) => setSelectedExe(path ? path : ''))
              }
            />
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <button
          onClick={async () => handleRunExe()}
          className={`button is-secondary`}
          disabled={runningSetup}
        >
          {runningSetup
            ? t('button.running-setup', 'Running Setup')
            : t('button.run-exe-first', 'Run Installer First')}
        </button>
        <button
          onClick={async () => handleInstall()}
          className={`button is-primary`}
          disabled={!selectedExe.length}
        >
          {t('button.finish', 'Finish')}
        </button>
      </DialogFooter>
    </>
  )
}
