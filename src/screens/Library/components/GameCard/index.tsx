import './index.css'

import React, { useContext, CSSProperties, useMemo } from 'react'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRepeat } from '@fortawesome/free-solid-svg-icons'

import { ReactComponent as DownIcon } from 'src/assets/down-icon.svg'
import { GameStatus, Runner } from 'src/types'
import { Link, useNavigate } from 'react-router-dom'
import { ReactComponent as PlayIcon } from 'src/assets/play-icon.svg'
import { ReactComponent as SettingsIcon } from 'src/assets/settings-sharp.svg'
import { ReactComponent as StopIcon } from 'src/assets/stop-icon.svg'
import { ReactComponent as StopIconAlt } from 'src/assets/stop-icon-alt.svg'
import { getProgress, install, launch, sendKill } from 'src/helpers'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'
import fallbackImage from 'src/assets/fallback-image.jpg'
import { uninstall, updateGame } from 'src/helpers/library'
import { SvgButton } from 'src/components/UI'
import ContextMenu, { Item } from '../ContextMenu'
import { hasProgress } from 'src/hooks/hasProgress'

import { ReactComponent as EpicLogo } from 'src/assets/epic-logo.svg'
import { ReactComponent as GOGLogo } from 'src/assets/gog-logo.svg'
import classNames from 'classnames'

interface Card {
  appName: string
  buttonClick: () => void
  cover: string
  coverList: string
  hasUpdate: boolean
  hasCloudSave: boolean
  isGame: boolean
  isInstalled: boolean
  logo: string
  size: string
  title: string
  version: string
  runner: Runner
  installedPlatform: string | undefined
  forceCard?: boolean
}

const GameCard = ({
  cover,
  title,
  appName,
  isGame,
  isInstalled,
  logo,
  coverList,
  size = '',
  hasUpdate,
  hasCloudSave,
  buttonClick,
  forceCard,
  runner,
  installedPlatform
}: Card) => {
  const [progress, previousProgress] = hasProgress(appName)

  const { t } = useTranslation('gamepage')

  const navigate = useNavigate()
  const {
    libraryStatus,
    layout,
    handleGameStatus,
    platform,
    hiddenGames,
    favouriteGames,
    allTilesInColor,
    epic,
    gog
  } = useContext(ContextProvider)

  const isWin = platform === 'win32'

  const grid = forceCard || layout === 'grid'

  const gameStatus: GameStatus = libraryStatus.filter(
    (game) => game.appName === appName
  )[0]

  const hasDownloads = Boolean(
    libraryStatus.filter(
      (game) => game.status === 'installing' || game.status === 'updating'
    ).length
  )

  const { status, folder } = gameStatus || {}
  const isInstalling = status === 'installing' || status === 'updating'
  const isUpdating = status === 'updating'
  const isReparing = status === 'repairing'
  const isMoving = status === 'moving'
  const isPlaying = status === 'playing'
  const haveStatus = isMoving || isReparing || isInstalling || isUpdating

  const { percent = '' } = progress
  const installingGrayscale = isInstalling
    ? `${125 - getProgress(progress)}%`
    : '100%'

  const imageSrc = getImageFormatting()

  async function handleUpdate() {
    await handleGameStatus({ appName, runner, status: 'updating' })
    await updateGame(appName, runner)
    return handleGameStatus({ appName, runner, status: 'done' })
  }

  function getImageFormatting() {
    const imageBase = grid ? cover : coverList
    if (imageBase === 'fallback') {
      return fallbackImage
    }
    if (runner === 'legendary') {
      return `${imageBase}?h=400&resize=1&w=300`
    } else {
      return imageBase
    }
  }

  function getStatus() {
    if (isUpdating) {
      return t('status.updating') + ` ${percent}%`
    }
    if (isInstalling) {
      return t('status.installing') + ` ${percent || 0}%`
    }
    if (isMoving) {
      return t('gamecard.moving', 'Moving')
    }
    if (isReparing) {
      return t('gamecard.repairing', 'Repairing')
    }
    if (isInstalled) {
      return `${t('status.installed')} (${size})`
    }

    return t('status.notinstalled')
  }

  const renderIcon = () => {
    if (isPlaying) {
      return (
        <SvgButton
          className="cancelIcon"
          onClick={async () => handlePlay(runner)}
          title={`${t('label.playing.stop')} (${title})`}
        >
          <StopIconAlt />
        </SvgButton>
      )
    }
    if (isInstalling) {
      return (
        <SvgButton
          className="cancelIcon"
          onClick={async () => handlePlay(runner)}
          title={`${t('button.cancel')} (${title})`}
        >
          <StopIcon />
        </SvgButton>
      )
    }
    if (isInstalled && isGame) {
      return (
        <SvgButton
          className="playIcon"
          onClick={async () => handlePlay(runner)}
          title={`${t('label.playing.start')} (${title})`}
        >
          <PlayIcon />
        </SvgButton>
      )
    }
    if (!isInstalled) {
      if (hasDownloads) {
        return (
          <SvgButton
            className="iconDisabled"
            onClick={(e) => e.preventDefault()}
            title={`${t('button.cancel')} (${title})`}
          >
            <DownIcon />
          </SvgButton>
        )
      }
      return (
        <SvgButton
          className="downIcon"
          onClick={() => buttonClick()}
          title={`${t('button.install')} (${title})`}
        >
          <DownIcon />
        </SvgButton>
      )
    }
    return null
  }

  const isHiddenGame = useMemo(() => {
    return !!hiddenGames.list.find(
      (hiddenGame) => hiddenGame.appName === appName
    )
  }, [hiddenGames, appName])

  const isFavouriteGame = useMemo(() => {
    return !!favouriteGames.list.find(
      (favouriteGame) => favouriteGame.appName === appName
    )
  }, [favouriteGames, appName])

  const isMac = ['osx', 'Mac']
  const isMacNative = isMac.includes(installedPlatform ?? '')
  const isLinuxNative = installedPlatform === 'linux'
  const isNative = isWin || isMacNative || isLinuxNative
  const pathname = isNative
    ? `/settings/${runner}/${appName}/other`
    : `/settings/${runner}/${appName}/wine`

  const items: Item[] = [
    {
      label: t('label.playing.start'),
      onclick: async () => handlePlay(runner),
      show: isInstalled
    },
    {
      label: t('submenu.settings'),
      onclick: () =>
        navigate(pathname, {
          state: {
            fromGameCard: true,
            runner,
            hasCloudSave,
            isLinuxNative,
            isMacNative
          }
        }),
      show: isInstalled
    },
    {
      label: t('button.update', 'Update'),
      onclick: async () => handleUpdate(),
      show: hasUpdate
    },
    {
      label: t('button.uninstall'),
      onclick: async () =>
        uninstall({
          appName,
          handleGameStatus,
          t,
          runner
        }),
      show: isInstalled
    },
    {
      label: t('button.install'),
      onclick: () => (!hasDownloads ? buttonClick() : () => null),
      show: !isInstalled && !isInstalling
    },
    {
      label: t('button.cancel'),
      onclick: async () => handlePlay(runner),
      show: isInstalling
    },
    {
      label: t('button.hide_game', 'Hide Game'),
      onclick: () => hiddenGames.add(appName, title),
      show: !isHiddenGame
    },
    {
      label: t('button.unhide_game', 'Unhide Game'),
      onclick: () => hiddenGames.remove(appName),
      show: isHiddenGame
    },
    {
      label: t('button.add_to_favourites', 'Add To Favourites'),
      onclick: () => favouriteGames.add(appName, title),
      show: !isFavouriteGame
    },
    {
      label: t('button.remove_from_favourites', 'Remove From Favourites'),
      onclick: () => favouriteGames.remove(appName),
      show: isFavouriteGame
    }
  ]

  const instClass = isInstalled ? 'installed' : ''
  const hiddenClass = isHiddenGame ? 'hidden' : ''
  const imgClasses = `gameImg ${isInstalled ? 'installed' : ''} ${
    allTilesInColor && 'allTilesInColor'
  }`
  const logoClasses = `gameLogo ${isInstalled ? 'installed' : ''} ${
    allTilesInColor && 'allTilesInColor'
  }`

  const wrapperClasses = `${
    grid ? 'gameCard' : 'gameListItem'
  }  ${instClass} ${hiddenClass}`

  const getRunner = () => {
    switch (runner) {
      case 'legendary':
        return 'Epic Games'
      case 'gog':
        return 'GOG'
      default:
        return 'Heroic'
    }
  }

  const showStoreLogos = () => {
    if (epic.username && gog.username) {
      return runner === 'legendary' ? (
        <EpicLogo className="store-icon" />
      ) : (
        <GOGLogo className="store-icon" />
      )
    }
    return null
  }

  return (
    <>
      <ContextMenu items={items}>
        <div className={wrapperClasses}>
          {haveStatus && <span className="progress">{getStatus()}</span>}
          <Link
            to={`gamepage/${runner}/${appName}`}
            style={
              { '--installing-effect': installingGrayscale } as CSSProperties
            }
          >
            {showStoreLogos()}
            <img src={imageSrc} className={imgClasses} alt="cover" />
            {logo && (
              <img
                alt="logo"
                src={`${logo}?h=400&resize=1&w=300`}
                className={logoClasses}
              />
            )}
            <span
              className={classNames('gameListInfo', {
                active: haveStatus,
                installed: isInstalled
              })}
            >
              {getStatus()}
            </span>
            <span
              className={classNames('gameTitle', {
                active: haveStatus,
                installed: isInstalled
              })}
            >
              <span>{title}</span>
            </span>
            <span
              className={classNames('runner', {
                active: haveStatus,
                installed: isInstalled
              })}
            >
              {getRunner()}
            </span>
          </Link>
          {
            <>
              <span className="icons">
                {hasUpdate && !isUpdating && (
                  <SvgButton
                    className="updateIcon"
                    title={`${t('button.update')} (${title})`}
                    onClick={async () => handleUpdate()}
                  >
                    <FontAwesomeIcon size={'2x'} icon={faRepeat} />
                  </SvgButton>
                )}
                {isInstalled && isGame && (
                  <>
                    <SvgButton
                      title={`${t('submenu.settings')} (${title})`}
                      className="settingsIcon"
                      onClick={() =>
                        navigate(pathname, {
                          state: {
                            fromGameCard: true,
                            runner,
                            hasCloudSave,
                            isLinuxNative,
                            isMacNative
                          }
                        })
                      }
                    >
                      <SettingsIcon />
                    </SvgButton>
                  </>
                )}
                {renderIcon()}
              </span>
            </>
          }
        </div>
      </ContextMenu>
    </>
  )

  async function handlePlay(runner: Runner) {
    if (!isInstalled) {
      return install({
        appName,
        handleGameStatus,
        installPath: folder || 'default',
        isInstalling,
        previousProgress,
        progress,
        t,
        runner,
        platformToInstall: ''
      })
    }
    if (status === 'playing' || status === 'updating') {
      await handleGameStatus({ appName, runner, status: 'done' })
      return sendKill(appName, runner)
    }
    if (isInstalled) {
      return launch({ appName, t, runner, hasUpdate })
    }
    return
  }
}

export default GameCard
