import React, { useContext, useEffect, useState } from 'react'

import { Path, WineInstallation } from 'src/types'
import { useTranslation } from 'react-i18next'
import { InfoBox, ToggleSwitch, SvgButton } from 'src/components/UI'

import AddBoxIcon from '@material-ui/icons/AddBox'
import ContextProvider from 'src/state/ContextProvider'
import CreateNewFolder from '@material-ui/icons/CreateNewFolder'
import RemoveCircleIcon from '@material-ui/icons/RemoveCircle'

const { ipcRenderer } = window.require('electron')

interface Props {
  altWine: WineInstallation[]
  autoInstallDxvk: boolean
  customWinePaths: string[]
  isDefault: boolean
  maxSharpness: number
  enableResizableBar: boolean
  setAltWine: (altWine: WineInstallation[]) => void
  setCustomWinePaths: (value: string[]) => void
  setWineCrossoverBottle: (value: string) => void
  setWinePrefix: (value: string) => void
  setFsrSharpness: (value: number) => void
  setWineVersion: (wine: WineInstallation) => void
  toggleAutoInstallDxvk: () => void
  toggleFSR: () => void
  toggleResizableBar: () => void
  wineCrossoverBottle: string
  winePrefix: string
  wineVersion: WineInstallation
  enableFSR: boolean
  enableEsync: boolean
  toggleEsync: () => void
  enableFsync: boolean
  toggleFsync: () => void
}

export default function WineSettings({
  winePrefix,
  setWinePrefix,
  setWineVersion,
  setAltWine,
  wineVersion,
  altWine,
  toggleAutoInstallDxvk,
  enableFSR,
  toggleFSR,
  autoInstallDxvk,
  customWinePaths,
  setCustomWinePaths,
  wineCrossoverBottle,
  setWineCrossoverBottle,
  isDefault,
  setFsrSharpness,
  maxSharpness,
  enableResizableBar,
  toggleResizableBar,
  enableEsync,
  toggleEsync,
  enableFsync,
  toggleFsync
}: Props) {
  const [selectedPath, setSelectedPath] = useState('')
  const { platform } = useContext(ContextProvider)
  const isLinux = platform === 'linux'

  useEffect(() => {
    const getAltWine = async () => {
      const wineList: WineInstallation[] = await ipcRenderer.invoke(
        'getAlternativeWine'
      )
      setAltWine(wineList)
      // Avoids not updating wine config when having one wine install only
      if (wineList && wineList.length === 1) {
        setWineVersion(wineList[0])
      }
    }
    getAltWine()
    setSelectedPath(customWinePaths.length ? customWinePaths[0] : '')
  }, [customWinePaths])

  const { t } = useTranslation()

  function selectCustomPath() {
    ipcRenderer
      .invoke('openDialog', {
        buttonLabel: t('box.choose'),
        properties: ['openFile'],
        title: t('box.customWine', 'Select the Wine or Proton Binary')
      })
      .then(({ path }: Path) => {
        if (!customWinePaths.includes(path)) {
          setCustomWinePaths(
            path ? [...customWinePaths, path] : customWinePaths
          )
        }
      })
  }

  function removeCustomPath() {
    const newPaths = customWinePaths.filter((path) => path !== selectedPath)
    setCustomWinePaths(newPaths)
    return setSelectedPath(customWinePaths.length ? customWinePaths[0] : '')
  }

  return (
    <>
      {isLinux && (
        <span data-testid="wineSettings" className="setting">
          <span className="settingText">{t('setting.wineprefix')}</span>
          <span>
            <input
              data-testid="selectWinePrefix"
              type="text"
              value={winePrefix}
              className="settingSelect"
              onChange={(event) => setWinePrefix(event.target.value)}
            />
            <SvgButton
              className="material-icons settings folder"
              onClick={() =>
                ipcRenderer
                  .invoke('openDialog', {
                    buttonLabel: t('box.choose'),
                    properties: ['openDirectory'],
                    title: t('box.wineprefix')
                  })
                  .then(({ path }: Path) =>
                    setWinePrefix(path ? `${path}` : winePrefix)
                  )
              }
            >
              <CreateNewFolder data-testid="addWinePrefix" />
            </SvgButton>
          </span>
        </span>
      )}
      {isDefault && (
        <span className="setting">
          <span className="settingText">
            {t('setting.customWineProton', 'Custom Wine/Proton Paths')}
          </span>
          <span className="settingInputWithButton">
            <select
              data-testid="selectWinePath"
              disabled={!customWinePaths.length}
              className="settingSelect"
              defaultValue={selectedPath}
              onChange={(e) => setSelectedPath(e.target.value)}
              style={{ width: '440px' }}
            >
              {customWinePaths.map((path: string) => (
                <option key={path}>{path}</option>
              ))}
            </select>
            <div className="iconsWrapper">
              <SvgButton onClick={() => removeCustomPath()}>
                <RemoveCircleIcon
                  data-testid="removeWinePath"
                  style={{
                    color: selectedPath
                      ? 'var(--danger)'
                      : 'var(--background-darker)',
                    cursor: selectedPath ? 'pointer' : ''
                  }}
                  fontSize="large"
                  titleAccess={t('tooltip.removepath', 'Remove Path')}
                />
              </SvgButton>{' '}
              <SvgButton
                onClick={() => selectCustomPath()}
                className={`is-primary`}
              >
                <AddBoxIcon
                  data-testid="addWinePath"
                  style={{ color: 'var(--success)', cursor: 'pointer' }}
                  fontSize="large"
                  titleAccess={t('tooltip.addpath', 'Add New Path')}
                />
              </SvgButton>
            </div>
          </span>
        </span>
      )}
      <span className="setting">
        <span className="settingText">{t('setting.wineversion')}</span>
        <select
          data-testid="setWineVersion"
          onChange={(event) =>
            setWineVersion(
              altWine.filter(({ name }) => name === event.target.value)[0]
            )
          }
          value={wineVersion.name}
          className="settingSelect"
        >
          {altWine.map(({ name }) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </span>
      {wineVersion.name.includes('CrossOver') && (
        <span className="setting">
          <span className="settingText">
            {t('setting.winecrossoverbottle', 'CrossOver Bottle')}
          </span>
          <span>
            <input
              data-testid="crossoverBottle"
              type="text"
              value={wineCrossoverBottle}
              className="settingSelect"
              onChange={(event) => setWineCrossoverBottle(event.target.value)}
            />
          </span>
        </span>
      )}
      {isLinux && (
        <span className="setting">
          <span className="toggleWrapper">
            {t('setting.autodxvk', 'Auto Install/Update DXVK on Prefix')}
            <ToggleSwitch
              value={autoInstallDxvk}
              handleChange={() => {
                const action = autoInstallDxvk ? 'restore' : 'backup'
                ipcRenderer.send('toggleDXVK', [
                  { winePrefix, winePath: wineVersion.bin },
                  action
                ])
                return toggleAutoInstallDxvk()
              }}
              title={t(
                'setting.autodxvk',
                'Auto Install/Update DXVK on Prefix'
              )}
            />
          </span>
        </span>
      )}
      <span className="setting">
        <span className="toggleWrapper">
          {t(
            'setting.enableFSRHack',
            'Enable FSR Hack (Wine version needs to support it)'
          )}
          <ToggleSwitch
            value={enableFSR || false}
            handleChange={toggleFSR}
            title={t(
              'setting.enableFSRHack',
              'Enable FSR Hack (Wine version needs to support it)'
            )}
          />
        </span>
      </span>
      {enableFSR && (
        <span className="setting">
          <span className="toggleWrapper">
            {t('setting.FsrSharpnessStrenght', 'FSR Sharpness Strength')}
            <select
              data-testid="setMaxRecentGames"
              onChange={(event) => setFsrSharpness(Number(event.target.value))}
              value={maxSharpness}
              className="settingSelect smaller"
            >
              {Array.from(Array(5).keys()).map((n) => (
                <option key={n + 1}>{n + 1}</option>
              ))}
            </select>
          </span>
        </span>
      )}
      {isLinux && (
        <>
          <span className="setting">
            <span className="toggleWrapper">
              {t(
                'setting.resizableBar',
                'Enable Resizable BAR (NVIDIA RTX only)'
              )}
              <ToggleSwitch
                value={enableResizableBar || false}
                handleChange={toggleResizableBar}
                title={t(
                  'setting.resizableBar',
                  'Enable Resizable BAR (NVIDIA RTX only)'
                )}
              />
            </span>
          </span>
          <span className="setting">
            <span className="toggleWrapper">
              {t('setting.esync', 'Enable Esync')}
              <ToggleSwitch
                value={enableEsync || false}
                handleChange={toggleEsync}
                dataTestId="esyncToggle"
                title={t('setting.esync', 'Enable Esync')}
              />
            </span>
          </span>
          <span className="setting">
            <span className="toggleWrapper">
              {t('setting.fsync', 'Enable Fsync')}
              <ToggleSwitch
                value={enableFsync || false}
                handleChange={toggleFsync}
                dataTestId="fsyncToggle"
                title={t('setting.fsync', 'Enable Fsync')}
              />
            </span>
          </span>
        </>
      )}
      <InfoBox text="infobox.help">
        <span>{t('help.wine.part1')}</span>
        <ul>
          <i>
            <li>~/.config/heroic/tools/wine</li>
            <li>~/.config/heroic/tools/proton</li>
            <li>~/.steam/root/compatibilitytools.d</li>
            <li>~/.steam/steamapps/common</li>
            <li>~/.local/share/lutris/runners/wine</li>
            <li>~/.var/app/com.valvesoftware.Steam (Steam Flatpak)</li>
            <li>/usr/share/steam</li>
            <li>Everywhere on the system (CrossOver Mac)</li>
            <li>/opt/cxoffice (CrossOver Linux)</li>
          </i>
        </ul>
        <span>{t('help.wine.part2')}</span>
      </InfoBox>
    </>
  )
}
