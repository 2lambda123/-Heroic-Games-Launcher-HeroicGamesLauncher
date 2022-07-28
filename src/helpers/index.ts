import { PlatformToInstall } from './../types'
import {
  AppSettings,
  GameInfo,
  InstallInfo,
  InstallProgress,
  Runner,
  GameSettings
} from 'src/types'

import { install, launch, repair, updateGame } from './library'
import fileSize from 'filesize'
const { ipcRenderer } = window.require('electron')
const readFile = async (file: string) => ipcRenderer.invoke('readConfig', file)

const writeConfig = async (
  data: [appName: string, x: unknown]
): Promise<void> => ipcRenderer.invoke('writeConfig', data)

const notify = ([title, message]: [title: string, message: string]): void =>
  ipcRenderer.send('Notify', [title, message])

const loginPage = (): void => ipcRenderer.send('openLoginPage')

const getPlatform = async () => ipcRenderer.invoke('getPlatform')

const sidInfoPage = (): void => ipcRenderer.send('openSidInfoPage')

const handleKofi = (): void => ipcRenderer.send('openSupportPage')

const handleQuit = (): void => ipcRenderer.send('quit')

const openAboutWindow = (): void => ipcRenderer.send('showAboutWindow')

const openDiscordLink = (): void => ipcRenderer.send('openDiscordLink')

export const size = fileSize.partial({ base: 2 })

let progress: string

const sendKill = async (appName: string, runner: Runner): Promise<void> =>
  ipcRenderer.invoke('kill', appName, runner)

const isLoggedIn = async (): Promise<void> => ipcRenderer.invoke('isLoggedIn')

const syncSaves = async (
  savesPath: string,
  appName: string,
  runner: Runner,
  arg?: string
): Promise<string> => {
  const { user } = await ipcRenderer.invoke('getUserInfo')
  const path = savesPath.replace('~', `/home/${user}`)

  const response: string = await ipcRenderer.invoke('syncSaves', [
    arg,
    path,
    appName,
    runner
  ])
  return response
}

const getLegendaryConfig = async (): Promise<{
  library: GameInfo[]
  user: string
}> => {
  const user: string = await readFile('user')
  const library: Array<GameInfo> = await readFile('library')

  if (!user) {
    return { library: [], user: '' }
  }

  return { library, user }
}

const getGameInfo = async (
  appName: string,
  runner: Runner
): Promise<GameInfo> => {
  return ipcRenderer.invoke('getGameInfo', appName, runner)
}

const getGameSettings = async (
  appName: string,
  runner: Runner
): Promise<GameSettings> => {
  return ipcRenderer.invoke('getGameSettings', appName, runner)
}

const getInstallInfo = async (
  appName: string,
  runner: Runner,
  installPlatform?: PlatformToInstall | string
): Promise<InstallInfo | null> => {
  return ipcRenderer.invoke('getInstallInfo', appName, runner, installPlatform)
}

const handleSavePath = async (game: string, runner: Runner) => {
  const { cloud_save_enabled, save_folder } = await getGameInfo(game, runner)

  return { cloud_save_enabled, save_folder }
}

const createNewWindow = (url: string) =>
  ipcRenderer.send('createNewWindow', url)

function getProgress(progress: InstallProgress): number {
  if (progress && progress.percent) {
    const percent = progress.percent
    // this should deal with a few edge cases
    if (typeof percent === 'string') {
      return Number(String(percent).replace('%', ''))
    }
    return percent
  }
  return 0
}

async function fixGogSaveFolder(
  folder: string,
  prefix: string,
  isProton: boolean,
  installedPlatform: string
) {
  const isMac = installedPlatform === 'osx'
  const isWindows = installedPlatform === 'windows'
  const matches = folder.match(/<\?(\w+)\?>/)
  if (!matches) {
    return folder
  }
  switch (matches[1]) {
    case 'SAVED_GAMES':
      // This path is only on Windows
      folder = folder.replace(matches[0], '%USERPROFILE%/Saved Games')
      break
    case 'APPLICATION_DATA_LOCAL':
      folder = folder.replace(matches[0], '%LOCALAPPDATA%')
      break
    case 'APPLICATION_DATA_LOCAL_LOW':
      folder = folder.replace(matches[0], '%USERPROFILE%/AppData/LocalLow')
      break
    case 'APPLICATION_DATA_ROAMING':
      folder = folder.replace(matches[0], '%APPDATA%')
      break
    case 'DOCUMENTS':
      if (isWindows)
        folder = folder.replace(matches[0], '%USERPROFILE%/Documents')
      else if (isMac) {
        folder = folder.replace(matches[0], '$HOME/Documents')
      }
      break
    case 'APPLICATION_SUPPORT':
      folder = folder.replace(matches[0], '/Library/Application Support')
  }
  return folder
}

async function fixSaveFolder(
  folder: string,
  prefix: string,
  isProton: boolean,
  runner: Runner,
  installedPlatform: string
) {
  if (runner === 'gog') {
    return fixGogSaveFolder(folder, prefix, isProton, installedPlatform)
  }
  const { user, account_id: epicId } = await ipcRenderer.invoke('getUserInfo')
  const username = isProton ? 'steamuser' : user

  folder = folder.replace('{EpicID}', epicId)
  folder = folder.replace('{EpicId}', epicId)

  if (folder.includes('locallow')) {
    return folder.replace(
      '{appdata}/../locallow',
      `%USERPROFILE%/AppData/LocalLow`
    )
  }

  if (folder.includes('LocalLow')) {
    return folder.replace(
      '{AppData}/../LocalLow',
      `%USERPROFILE%/AppData/LocalLow`
    )
  }

  if (folder.includes('{UserSavedGames}')) {
    return folder.replace('{UserSavedGames}', `%USERPROFILE%/Saved Games`)
  }

  if (folder.includes('{usersavedgames}')) {
    return folder.replace('{usersavedgames}', `%USERPROFILE%/Saved Games`)
  }

  if (folder.includes('roaming')) {
    return folder.replace(
      '{appdata}/../roaming',
      `%USERPROFILE%/Application Data`
    )
  }

  if (folder.includes('{appdata}/../Roaming/')) {
    return folder.replace(
      '{appdata}/../Roaming',
      `%USERPROFILE%/Application Data`
    )
  }

  if (folder.includes('Roaming')) {
    return folder.replace(
      '{AppData}/../Roaming',
      `%USERPROFILE%/Application Data`
    )
  }

  if (folder.includes('{AppData}')) {
    return folder.replace(
      '{AppData}',
      `%USERPROFILE%/Local Settings/Application Data`
    )
  }

  if (folder.includes('{appdata}')) {
    return folder.replace(
      '{appdata}',
      `%USERPROFILE%/Local Settings/Application Data`
    )
  }

  if (folder.includes('{userdir}')) {
    return folder.replace('{userdir}', `/users/${username}/My Documents`)
  }

  if (folder.includes('{UserDir}')) {
    return folder.replace('{UserDir}', `%USERPROFILE%/My Documents`)
  }

  return folder
}

async function getAppSettings(): Promise<AppSettings> {
  return ipcRenderer.invoke('requestSettings', 'default')
}

function quoteIfNecessary(stringToQuote: string) {
  if (stringToQuote.includes(' ')) {
    return `"${stringToQuote}"`
  }
  return stringToQuote
}

export {
  createNewWindow,
  fixSaveFolder,
  getGameInfo,
  getGameSettings,
  getInstallInfo,
  getLegendaryConfig,
  getPlatform,
  getProgress,
  getAppSettings,
  handleKofi,
  handleQuit,
  handleSavePath,
  install,
  isLoggedIn,
  launch,
  loginPage,
  notify,
  openAboutWindow,
  openDiscordLink,
  progress,
  repair,
  sendKill,
  sidInfoPage,
  syncSaves,
  updateGame,
  writeConfig,
  ipcRenderer,
  quoteIfNecessary
}
