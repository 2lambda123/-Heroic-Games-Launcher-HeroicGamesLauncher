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
  arg?: string
): Promise<string> => {
  const { user } = await ipcRenderer.invoke('getUserInfo')
  const path = savesPath.replace('~', `/home/${user}`)

  const response: string = await ipcRenderer.invoke('syncSaves', [
    arg,
    path,
    appName
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
  runner: Runner = 'legendary'
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

const handleSavePath = async (game: string) => {
  const { cloud_save_enabled, save_folder } = await getGameInfo(game)

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

async function fixSaveFolder(
  folder: string,
  prefix: string,
  isProton: boolean
) {
  const { user, account_id: epicId } = await ipcRenderer.invoke('getUserInfo')
  const username = isProton ? 'steamuser' : user
  const platform = await getPlatform()
  const isWin = platform === 'win32'
  let winePrefix = !isWin && prefix ? prefix.replaceAll("'", '') : ''
  winePrefix = isProton ? `${winePrefix}/pfx` : winePrefix
  const driveC = isWin ? 'C:' : `${winePrefix}/drive_c`

  folder = folder.replace('{EpicID}', epicId)
  folder = folder.replace('{EpicId}', epicId)

  if (folder.includes('locallow')) {
    return folder.replace(
      '{appdata}/../locallow',
      `${driveC}/users/${username}/AppData/LocalLow`
    )
  }

  if (folder.includes('LocalLow')) {
    return folder.replace(
      '{AppData}/../LocalLow',
      `${driveC}/users/${username}/AppData/LocalLow`
    )
  }

  if (folder.includes('{UserSavedGames}')) {
    return folder.replace(
      '{UserSavedGames}',
      `${driveC}/users/${username}/Saved Games`
    )
  }

  if (folder.includes('{usersavedgames}')) {
    return folder.replace(
      '{usersavedgames}',
      `${driveC}/users/${username}/Saved Games`
    )
  }

  if (folder.includes('roaming')) {
    return folder.replace(
      '{appdata}/../roaming',
      `${driveC}/users/${username}/Application Data`
    )
  }

  if (folder.includes('{appdata}/../Roaming/')) {
    return folder.replace(
      '{appdata}/../Roaming',
      `${driveC}/users/${username}/Application Data`
    )
  }

  if (folder.includes('Roaming')) {
    return folder.replace(
      '{AppData}/../Roaming',
      `${driveC}/users/${username}/Application Data`
    )
  }

  if (folder.includes('{AppData}')) {
    return folder.replace(
      '{AppData}',
      `${driveC}/users/${username}/Local Settings/Application Data`
    )
  }

  if (folder.includes('{appdata}')) {
    return folder.replace(
      '{appdata}',
      `${driveC}/users/${username}/Local Settings/Application Data`
    )
  }

  if (folder.includes('{userdir}')) {
    return folder.replace('{userdir}', `/users/${username}/My Documents`)
  }

  if (folder.includes('{UserDir}')) {
    return folder.replace(
      '{UserDir}',
      `${driveC}/users/${username}/My Documents`
    )
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
