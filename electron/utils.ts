import { Runner } from './types'
import { WineInstallation } from './types'
import * as axios from 'axios'
import { app, dialog, net, shell, Notification, BrowserWindow } from 'electron'
import { exec, spawn, spawnSync } from 'child_process'
import { existsSync, rmSync, stat } from 'graceful-fs'
import { promisify } from 'util'
import i18next, { t } from 'i18next'
import si from 'systeminformation'

import {
  configStore,
  fixAsarPath,
  getSteamLibraries,
  heroicConfigPath,
  heroicGamesConfigPath,
  icon,
  isWindows
} from './constants'
import { logError, logInfo, LogPrefix, logWarning } from './logger/logger'
import { basename, dirname, join } from 'path'
import { runLegendaryCommand } from './legendary/library'
import { runGogdlCommand } from './gog/library'
import {
  gameInfoStore,
  installStore,
  libraryStore
} from './legendary/electronStores'
import {
  apiInfoCache as GOGapiInfoCache,
  libraryStore as GOGlibraryStore
} from './gog/electronStores'
import fileSize from 'filesize'
import makeClient from 'discord-rich-presence-typescript'
import { RpcClient, SteamRuntime } from 'types'
import { Game } from './games'

const execAsync = promisify(exec)
const statAsync = promisify(stat)

const { showErrorBox, showMessageBox } = dialog

export function showErrorBoxModal(
  window: BrowserWindow | undefined | null,
  title: string,
  message: string
) {
  if (window) {
    showMessageBox(window, {
      type: 'error',
      title,
      message
    })
  } else {
    showErrorBox(title, message)
  }
}

export function showErrorBoxModalAuto(title: string, message: string) {
  let window: BrowserWindow
  try {
    window = BrowserWindow.getFocusedWindow()
    if (!window) {
      window = BrowserWindow.getAllWindows()[0]
    }
    showErrorBoxModal(window, title, message)
  } catch (error) {
    logWarning(['showErrorBoxModalAuto:', `${error}`], LogPrefix.Backend)
    showErrorBox(title, message)
  }
}

/**
 * Compares 2 SemVer strings following "major.minor.patch".
 * Checks if target is newer than base.
 */
function semverGt(target: string, base: string) {
  const [bmajor, bminor, bpatch] = base.split('.').map(Number)
  const [tmajor, tminor, tpatch] = target.split('.').map(Number)

  let isGE = false
  // A pretty nice piece of logic if you ask me. :P
  isGE ||= tmajor > bmajor
  isGE ||= tmajor === bmajor && tminor > bminor
  isGE ||= tmajor === bmajor && tminor === bminor && tpatch > bpatch
  return isGE
}

function isOnline() {
  return net.isOnline()
}

export const getFileSize = fileSize.partial({ base: 2 })

export function getWineFromProton(
  wineVersion: WineInstallation,
  winePrefix: string
): { winePrefix: string; wineBin: string } {
  if (wineVersion.type !== 'proton') {
    return { winePrefix, wineBin: wineVersion.bin }
  }

  winePrefix = join(winePrefix, 'pfx')

  // GE-Proton & Proton Experimental use 'files', Proton 7 and below use 'dist'
  for (const distPath of ['dist', 'files']) {
    const protonBaseDir = dirname(wineVersion.bin)
    const wineBin = join(protonBaseDir, distPath, 'bin', 'wine')
    if (existsSync(wineBin)) {
      return { wineBin, winePrefix }
    }
  }

  logError(
    [
      'Proton',
      wineVersion.name,
      'has an abnormal structure, unable to supply Wine binary!'
    ],
    LogPrefix.Backend
  )

  return { wineBin: '', winePrefix }
}

async function isEpicServiceOffline(
  type: 'Epic Games Store' | 'Fortnite' | 'Rocket League' = 'Epic Games Store'
) {
  const epicStatusApi = 'https://status.epicgames.com/api/v2/components.json'
  const notification = new Notification({
    title: `${type} ${t('epic.offline-notification-title', 'offline')}`,
    body: t(
      'epic.offline-notification-body',
      'Heroic will maybe not work probably!'
    ),
    urgency: 'normal',
    timeoutType: 'default',
    silent: false
  })

  try {
    const { data } = await axios.default.get(epicStatusApi)

    for (const component of data.components) {
      const { name: name, status: indicator } = component

      // found component and checking status
      if (name === type) {
        const isOffline = indicator === 'major'
        if (isOffline) {
          notification.show()
        }
        return isOffline
      }
    }

    notification.show()
    return false
  } catch (error) {
    logError(
      `Failed to get epic service status with ${error}`,
      LogPrefix.Backend
    )
    return false
  }
}

export const getLegendaryVersion = async () => {
  const { stdout, error } = await runLegendaryCommand(['--version'])

  if (error) {
    return 'invalid'
  }

  return stdout
    .split('legendary version')[1]
    .replaceAll('"', '')
    .replaceAll(', codename', '')
    .replaceAll('\n', '')
}

export const getGogdlVersion = async () => {
  const { stdout, error } = await runGogdlCommand(['--version'])

  if (error) {
    return 'invalid'
  }

  return stdout
}

export const getHeroicVersion = () => {
  const VERSION_NUMBER = app.getVersion()
  const BETA_VERSION_NAME = 'Caesar Clown'
  const STABLE_VERSION_NAME = 'Brook'
  const isBetaorAlpha =
    VERSION_NUMBER.includes('alpha') || VERSION_NUMBER.includes('beta')
  const VERSION_NAME = isBetaorAlpha ? BETA_VERSION_NAME : STABLE_VERSION_NAME

  return `${VERSION_NUMBER} ${VERSION_NAME}`
}

const showAboutWindow = () => {
  app.setAboutPanelOptions({
    applicationName: 'Heroic Games Launcher',
    applicationVersion: getHeroicVersion(),
    copyright: 'GPL V3',
    iconPath: icon,
    website: 'https://heroicgameslauncher.com'
  })
  return app.showAboutPanel()
}

async function handleExit(window: BrowserWindow) {
  const isLocked = existsSync(join(heroicGamesConfigPath, 'lock'))

  if (isLocked) {
    const { response } = await showMessageBox(window, {
      buttons: [i18next.t('box.no'), i18next.t('box.yes')],
      message: i18next.t(
        'box.quit.message',
        'There are pending operations, are you sure?'
      ),
      title: i18next.t('box.quit.title', 'Exit')
    })

    if (response === 0) {
      return
    }

    // Kill all child processes
    // This is very hacky
    const possibleChildren = ['legendary', 'gogdl']
    possibleChildren.forEach((procName) => {
      try {
        killPattern(procName)
      } catch (error) {
        logInfo([`Unable to kill ${procName}, ignoring.`, `${error}`])
      }
    })
  }
  app.exit()
}

export const getSystemInfo = async () => {
  const heroicVersion = getHeroicVersion()
  const legendaryVersion = await getLegendaryVersion()

  // get CPU and RAM info
  const { manufacturer, brand, speed, governor } = await si.cpu()
  const { total, available } = await si.mem()

  // get OS information
  const { distro, kernel, arch, platform } = await si.osInfo()

  // get GPU information
  const { controllers } = await si.graphics()
  const graphicsCards = String(
    controllers.map(
      ({ name, model, vram, driverVersion }, i) =>
        `GPU${i}: ${name ? name : model} VRAM: ${vram}MB DRIVER: ${
          driverVersion ?? ''
        } \n`
    )
  )
    .replaceAll(',', '')
    .replaceAll('\n', '')

  const isLinux = platform === 'linux'
  const xEnv = isLinux
    ? (await execAsync('echo $XDG_SESSION_TYPE')).stdout.replaceAll('\n', '')
    : ''

  return `Heroic Version: ${heroicVersion}
Legendary Version: ${legendaryVersion}
OS: ${distro} KERNEL: ${kernel} ARCH: ${arch}
CPU: ${manufacturer} ${brand} @${speed} ${
    governor ? `GOVERNOR: ${governor}` : ''
  }
RAM: Total: ${getFileSize(total)} Available: ${getFileSize(available)}
GRAPHICS: ${graphicsCards}
${isLinux ? `PROTOCOL: ${xEnv}` : ''}`
}

type ErrorHandlerMessage = {
  error?: string
  logPath?: string
  appName?: string
  runner: string
}

async function errorHandler(
  { error, logPath, runner: r, appName }: ErrorHandlerMessage,
  window?: BrowserWindow
): Promise<void> {
  const noSpaceMsg = 'Not enough available disk space'
  const plat = r === 'legendary' ? 'Legendary (Epic Games)' : r
  const deletedFolderMsg = 'appears to be deleted'
  const otherErrorMessages = ['No saved credentials', 'No credentials']

  if (!window) {
    window = BrowserWindow.getFocusedWindow()
  }

  if (logPath) {
    execAsync(`tail "${logPath}" | grep 'disk space'`)
      .then(({ stdout }) => {
        if (stdout.includes(noSpaceMsg)) {
          logError(noSpaceMsg, LogPrefix.Backend)
          return showErrorBoxModal(
            window,
            i18next.t('box.error.diskspace.title', 'No Space'),
            i18next.t(
              'box.error.diskspace.message',
              'Not enough available disk space'
            )
          )
        }
      })
      .catch(() => logInfo('operation interrupted', LogPrefix.Backend))
  }
  if (error) {
    if (error.includes(deletedFolderMsg) && appName) {
      const runner = r.toLocaleLowerCase() as Runner
      const game = Game.get(appName, runner)
      const { title } = game.getGameInfo()
      const { response } = await showMessageBox({
        type: 'question',
        title,
        message: i18next.t(
          'box.error.folder-not-found.title',
          'Game folder appears to be deleted, do you want to remove the game from the installed list?'
        ),
        buttons: [i18next.t('box.no'), i18next.t('box.yes')]
      })

      if (response === 1) {
        return game.forceUninstall()
      }
    }

    otherErrorMessages.forEach((message) => {
      if (error.includes(message)) {
        return showErrorBoxModal(
          window,
          plat,
          i18next.t(
            'box.error.credentials.message',
            'Your Crendentials have expired, Logout and Login Again!'
          )
        )
      }
    })
  }
}

function removeSpecialcharacters(text: string): string {
  const regexp = new RegExp('[:|/|*|?|<|>|\\|&|{|}|%|$|@|`|!|™|+]', 'gi')
  return text.replaceAll(regexp, '')
}

async function openUrlOrFile(url: string): Promise<string | void> {
  if (url.startsWith('http')) {
    return shell.openExternal(url)
  }
  return shell.openPath(url)
}

function clearCache() {
  GOGapiInfoCache.clear()
  GOGlibraryStore.clear()
  installStore.clear()
  libraryStore.clear()
  gameInfoStore.clear()
  runLegendaryCommand(['cleanup'])
}

function resetHeroic() {
  const heroicFolders = [heroicGamesConfigPath, heroicConfigPath]
  heroicFolders.forEach((folder) => {
    rmSync(folder, { recursive: true, force: true })
  })
  // wait a sec to avoid racing conditions
  setTimeout(() => {
    app.relaunch()
    app.quit()
  }, 1000)
}

function showItemInFolder(item: string) {
  if (existsSync(item)) {
    try {
      shell.showItemInFolder(item)
    } catch (error) {
      logError(
        `Failed to show item in folder with: ${error}`,
        LogPrefix.Backend
      )
    }
  }
}

function splitPathAndName(fullPath: string): { dir: string; bin: string } {
  const dir = dirname(fullPath)
  let bin = basename(fullPath)
  // On Windows, you can just launch executables that are in the current working directory
  // On Linux, you have to add a ./
  if (!isWindows) {
    bin = './' + bin
  }
  // Make sure to always return this as `dir, bin` to not break path
  // resolution when using `join(...Object.values(...))`
  return { dir, bin }
}

function getLegendaryBin(): { dir: string; bin: string } {
  const settings = configStore.get('settings', {}) as { altLeg: string }
  if (settings?.altLeg) {
    return splitPathAndName(settings.altLeg)
  }
  return splitPathAndName(
    fixAsarPath(join(__dirname, 'bin', process.platform, 'legendary'))
  )
}

function getGOGdlBin(): { dir: string; bin: string } {
  const settings = configStore.get('settings', {}) as { altGogdl: string }
  if (settings?.altGogdl) {
    return splitPathAndName(settings.altGogdl)
  }
  return splitPathAndName(
    fixAsarPath(join(__dirname, 'bin', process.platform, 'gogdl'))
  )
}
function getFormattedOsName(): string {
  switch (process.platform) {
    case 'linux':
      return 'Linux'
    case 'win32':
      return 'Windows'
    case 'darwin':
      return 'macOS'
    default:
      return 'Unknown OS'
  }
}

/**
 * Finds an executable on %PATH%/$PATH
 * @param executable The executable to find
 * @returns The full path to the executable, or nothing if it was not found
 */
// This name could use some work
async function searchForExecutableOnPath(executable: string): Promise<string> {
  if (isWindows) {
    // Todo: Respect %PATHEXT% here
    const paths = process.env.PATH.split(';')
    paths.forEach((path) => {
      const fullPath = join(path, executable)
      if (existsSync(fullPath)) {
        return fullPath
      }
    })
    return ''
  } else {
    return execAsync(`which ${executable}`)
      .then(({ stdout }) => {
        return stdout.split('\n')[0]
      })
      .catch((error) => {
        logError(`${error}`, LogPrefix.Backend)
        return ''
      })
  }
}

async function getSteamRuntime(
  version: 'scout' | 'soldier'
): Promise<SteamRuntime> {
  const soldier: Array<SteamRuntime> = await getSteamLibraries().then((libs) =>
    libs.map((p) => {
      if (
        existsSync(join(p, 'steamapps/common/SteamLinuxRuntime_soldier/run'))
      ) {
        return {
          path: join(p, 'steamapps/common/SteamLinuxRuntime_soldier/run'),
          type: 'unpackaged',
          version: 'soldier'
        }
      }
    })
  )

  const scout: Array<SteamRuntime> = await getSteamLibraries().then((libs) =>
    libs.map((p) => {
      if (existsSync(join(p, 'ubuntu12_32/steam-runtime/run.sh'))) {
        return {
          path: join(p, 'ubuntu12_32/steam-runtime/run.sh'),
          type: 'unpackaged',
          version: 'scout'
        }
      }
    })
  )

  if (version === 'soldier') {
    if (soldier.length) {
      return soldier[0]
    } else {
      if (scout.length) {
        return scout[0]
      }
    }
  }

  if (version === 'scout' && scout.length) {
    return scout[0]
  }

  return { path: '', type: 'unpackaged', version: 'scout' }
}

function constructAndUpdateRPC(gameName: string): RpcClient {
  const client = makeClient('852942976564723722')
  client.updatePresence({
    details: gameName,
    instance: true,
    largeImageKey: 'icon',
    large_text: gameName,
    startTimestamp: Date.now(),
    state: 'via Heroic on ' + getFormattedOsName()
  })
  return client
}

const specialCharactersRegex =
  /('\w)|(\\(\w|\d){5})|(\\"(\\.|[^"])*")|[^((0-9)|(a-z)|(A-Z)|\s)]/g // addeed regex for capturings "'s" + unicodes + remove subtitles in quotes
const cleanTitle = (title: string) =>
  title
    .replaceAll(specialCharactersRegex, '')
    .replaceAll(' ', '-')
    .replaceAll('®', '')
    .toLowerCase()
    .split('--definitive')[0]

const formatEpicStoreUrl = (title: string) => {
  const storeUrl = `https://www.epicgames.com/store/product/`
  return `${storeUrl}${cleanTitle(title)}`
}

function quoteIfNecessary(stringToQuote: string) {
  if (
    stringToQuote &&
    !(stringToQuote.startsWith('"') && stringToQuote.endsWith('"')) &&
    stringToQuote.includes(' ')
  ) {
    return `"${stringToQuote}"`
  }

  return String(stringToQuote)
}

function removeQuoteIfNecessary(stringToUnquote: string) {
  if (
    stringToUnquote &&
    stringToUnquote.startsWith('"') &&
    stringToUnquote.endsWith('"')
  ) {
    return stringToUnquote.replace(/^"+/, '').replace(/"+$/, '')
  }

  return String(stringToUnquote)
}

function killPattern(pattern: string) {
  logInfo(['Trying to kill', pattern], LogPrefix.Backend)
  let ret
  if (isWindows) {
    ret = spawnSync('Stop-Process', ['-name', pattern], {
      shell: 'powershell.exe'
    })
  } else {
    ret = spawnSync('pkill', ['-f', pattern])
  }
  logInfo(['Killed', pattern], LogPrefix.Backend)
  return ret
}

/**
 * Detects MS Visual C++ Redistributable and prompts for its installation if it's not found
 * Many games require this while not actually specifying it, so it's good to have
 *
 * Only works on Windows of course
 */
function detectVCRedist(mainWindow: BrowserWindow) {
  if (!isWindows) {
    return
  }

  const detectedVCRInstallations: string[] = []
  let stderr = ''
  const child = spawn('wmic', [
    'path',
    'Win32_Product',
    'WHERE',
    'Name LIKE "Microsoft Visual C++ 2022%"',
    'GET',
    'Name'
  ])
  child.stdout.on('data', (data: Buffer) => {
    // WMIC might push more than one line at a time
    const splitData = data.toString().split('\n')
    for (const installation of splitData) {
      if (installation) {
        detectedVCRInstallations.push(installation)
      }
    }
  })
  child.stderr.on('data', (data: Buffer) => {
    stderr += data.toString()
  })
  child.on('close', async (code) => {
    if (code) {
      logError(
        `Failed to check for VCRuntime installations\n${stderr}`,
        LogPrefix.Backend
      )
    }
    // VCR installers install both the "Minimal" and "Additional" runtime, and we have 2 installers (x86 and x64) -> 4 installations in total
    if (detectedVCRInstallations.length < 4) {
      const { response } = await dialog.showMessageBox(mainWindow, {
        title: t('box.vcruntime.notfound.title', 'VCRuntime not installed'),
        message: t(
          'box.vcruntime.notfound.message',
          'The Microsoft Visual C++ Runtimes are not installed, which are required by some games'
        ),
        buttons: [t('box.downloadNow', 'Download now'), t('box.ok', 'Ok')]
      })

      if (response === 0) {
        openUrlOrFile('https://aka.ms/vs/17/release/vc_redist.x86.exe')
        openUrlOrFile('https://aka.ms/vs/17/release/vc_redist.x64.exe')
        dialog.showMessageBox(mainWindow, {
          message: t(
            'box.vcruntime.install.message',
            'The download links for the Visual C++ Runtimes have been opened. Please install both the x86 and x64 versions.'
          )
        })
      }
    } else {
      logInfo('VCRuntime is installed', LogPrefix.Backend)
    }
  })
}

export {
  errorHandler,
  execAsync,
  handleExit,
  isOnline,
  isEpicServiceOffline,
  openUrlOrFile,
  semverGt,
  showAboutWindow,
  showItemInFolder,
  statAsync,
  removeSpecialcharacters,
  clearCache,
  resetHeroic,
  getLegendaryBin,
  getGOGdlBin,
  formatEpicStoreUrl,
  getFormattedOsName,
  searchForExecutableOnPath,
  getSteamRuntime,
  constructAndUpdateRPC,
  quoteIfNecessary,
  removeQuoteIfNecessary,
  killPattern,
  detectVCRedist
}
