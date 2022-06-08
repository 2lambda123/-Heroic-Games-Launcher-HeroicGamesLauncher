import './index.css'

import { WineVersionInfo } from 'src/types'
import ContextProvider from 'src/state/ContextProvider'
import { UpdateComponent } from 'src/components/UI'

import React, { lazy, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Tab, Tabs } from '@mui/material'
import { Type } from 'heroic-wine-downloader'
import ElectronStore from 'electron-store'
const Store = window.require('electron-store')

const WineItem = lazy(
  async () => import('src/screens/WineManager/components/WineItem')
)

const configStore: ElectronStore = new Store({
  cwd: 'store'
})

interface WineManagerUISettings {
  showWineGe: boolean
  showWineLutris: boolean
  showProtonGe: boolean
}

export default function WineManager(): JSX.Element | null {
  const { t } = useTranslation()
  const { wineVersions, refreshWineVersionInfo, refreshing } =
    useContext(ContextProvider)
  const winege: Type = 'Wine-GE'
  const winelutris: Type = 'Wine-Lutris'
  const protonge: Type = 'Proton-GE'
  const [repository, setRepository] = useState<Type>(winege)
  const [wineManagerSettings, setWineManagerSettings] =
    useState<WineManagerUISettings>({
      showWineGe: true,
      showWineLutris: true,
      showProtonGe: true
    })

  useEffect(() => {
    if (configStore.has('wine-manager-settings')) {
      const oldWineManagerSettings = configStore.get(
        'wine-manager-settings'
      ) as WineManagerUISettings
      if (wineManagerSettings) {
        setWineManagerSettings(oldWineManagerSettings)
      }
    }

    return refreshWineVersionInfo(true)
  }, [])

  if (refreshing) {
    return <UpdateComponent />
  }

  const handleChangeTab = (e: React.SyntheticEvent, repo: Type) => {
    setRepository(repo)
  }

  return (
    <>
      <h2>{t('wine.manager.title', 'Wine Manager (Beta)')}</h2>
      {wineVersions?.length ? (
        <div className="wineManager">
          <Tabs
            className="tabs"
            value={repository}
            onChange={handleChangeTab}
            centered={true}
          >
            {wineManagerSettings.showWineGe && (
              <Tab className="tab" value={winege} label={winege} />
            )}
            {wineManagerSettings.showWineLutris && (
              <Tab value={winelutris} label={winelutris} />
            )}
            {wineManagerSettings.showProtonGe && (
              <Tab value={protonge} label={protonge} />
            )}
          </Tabs>
          <div
            style={
              !wineVersions.length ? { backgroundColor: 'transparent' } : {}
            }
            className="wineList"
          >
            <div className="gameListHeader">
              <span>{t('info.version', 'Wine Version')}</span>
              <span>{t('wine.release', 'Release Date')}</span>
              <span>{t('wine.size', 'Size')}</span>
              <span>{t('wine.actions', 'Action')}</span>
            </div>
            {!!wineVersions.length &&
              wineVersions.map((release: WineVersionInfo, key) => {
                if (release.type === repository) {
                  return <WineItem key={key} {...release} />
                }
                return
              })}
          </div>
        </div>
      ) : (
        <h3>
          {t(
            'wine.manager.error',
            'Could not fetch Wine/Proton versions this time.'
          )}
        </h3>
      )}
    </>
  )
}
