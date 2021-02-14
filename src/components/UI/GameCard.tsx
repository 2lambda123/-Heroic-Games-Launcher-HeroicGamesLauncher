import React, { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ContextProvider from '../../state/ContextProvider'
import { GameStatus } from '../../types'
import { getProgress } from '../../helper'
const { ipcRenderer } = window.require('electron')
interface Card {
  cover: string
  coverList: string
  logo: string
  title: string
  appName: string
  isInstalled: boolean
  version: string
  dlcs: string[]
}

interface InstallProgress {
  percent: string
  bytes: string
  eta: string
}

const GameCard = ({ cover, title, appName, isInstalled, logo, coverList, version, dlcs }: Card) => {
  const [progress, setProgress] = useState({
    percent: '0.00%',
    bytes: '0/0MB',
    eta: '',
  } as InstallProgress)
  const { t } = useTranslation()

  const { libraryStatus, layout } = useContext(ContextProvider)

  const grid = layout === 'grid'

  const gameStatus: GameStatus = libraryStatus.filter(
    (game) => game.appName === appName
  )[0]

  const { status } = gameStatus || {}
  const isInstalling = status === 'installing' || status === 'updating'
  const isReparing = status === 'repairing'
  const isMoving = status === 'moving'
  const haveStatus = isMoving || isReparing || isInstalling

  useEffect(() => {
    const progressInterval = setInterval(async () => {
      if (isInstalling) {
        const progress = await ipcRenderer.invoke(
          'requestGameProgress',
          appName
        )
        setProgress(progress)
      }
    }, 1500)
    return () => clearInterval(progressInterval)
  }, [isInstalling, appName])

  const { percent } = progress
  const effectPercent = isInstalling
    ? `${125 - getProgress(progress)}%`
    : '100%'

  function getStatus() {
    if (isInstalling) {
      return percent
    }
    if (isMoving) {
      return t('gamecard.moving', 'Moving')
    }
    if (isReparing) {
      return t('gamecard.repairing', 'Repairing')
    }
    return ''
  }

  return (
    <>
      <Link
        className={grid ? "gameCard" : 'gameListItem'}
        to={{
          pathname: `/gameconfig/${appName}`,
        }}
      >
        {haveStatus && <span className="progress">{getStatus()}</span>}
        {(logo) && (
            <img
              alt="logo"
              src={logo}
              style={{
                filter: isInstalled ? 'none' : `grayscale(${effectPercent})`,
              }}
              className="gameLogo"
            />
        )}
          <img
            alt="cover-art"
            src={grid ? cover : coverList}
            style={{ filter: isInstalled ? 'none' : `grayscale(${effectPercent})` }}
            className={grid ? "gameImg" : "gameImgList"}
          />
        {grid ? (
          <div className="gameTitle">
            <span >{title}</span>
            {dlcs.length > 0 ? (<span> Dlcs : {dlcs.length}</span>) : <span> Dlcs : 0</span>}
            <i
              className={`material-icons ${isInstalled ? 'is-success' : 'is-primary'
                }`}
            >
              {isInstalled ? 'play_circle' : 'get_app'}
            </i>
          </div>
        ) : (
            <>
              {<div className="gameListInfo">Ver : {version}<br/>{dlcs.length > 0 ? (`Dlcs : ${dlcs.length}`) : 'Dlcs : 0'}</div>}
              <span className="gameTitleList">{title}</span>
              <i
                className={`material-icons ${isInstalled ? 'is-success' : 'is-primary'
                  } gameActionList`}
              >
                {isInstalled ? 'play_circle' : 'get_app'}
              </i>
            </>
          )}
      </Link>
      {!grid ? (<hr style={{ width: "90%", opacity: .1 }} />) : ''}
    </>
  )
}

export default GameCard
