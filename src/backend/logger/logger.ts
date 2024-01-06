/**
 * @file  Use this module to log things into the console or a file.
 *        Everything will be saved to a file before the app exits.
 *        Note that with console.log and console.warn everything will be saved too.
 *        error equals console.error
 */
import { AppSettings, GameInfo, GameSettings } from 'common/types'
import { showDialogBoxModalAuto } from '../dialog/dialog'
import { appendMessageToLogFile, getLongestPrefix } from './logfile'
import { backendEvents } from 'backend/backend_events'
import { GlobalConfig } from 'backend/config'
import { getGOGdlBin, getLegendaryBin } from 'backend/utils'
import { join } from 'path'
import { formatSystemInfo, getSystemInfo } from '../utils/systeminfo'
import { appendFileSync, writeFileSync } from 'graceful-fs'
import { gamesConfigPath } from 'backend/constants'
import { gameManagerMap } from 'backend/storeManagers'
import { isEnabled } from 'backend/storeManagers/legendary/eos_overlay/eos_overlay'
import { Winetricks } from 'backend/tools'
import { platform } from 'os'

export enum LogPrefix {
  General = '',
  Legendary = 'Legendary',
  Gog = 'Gog',
  Nile = 'Nile',
  WineDownloader = 'WineDownloader',
  DXVKInstaller = 'DXVKInstaller',
  GlobalConfig = 'GlobalConfig',
  GameConfig = 'GameConfig',
  ProtocolHandler = 'ProtocolHandler',
  Frontend = 'Frontend',
  Backend = 'Backend',
  Runtime = 'Runtime',
  Shortcuts = 'Shortcuts',
  WineTricks = 'Winetricks',
  Connection = 'Connection',
  DownloadManager = 'DownloadManager',
  ExtraGameInfo = 'ExtraGameInfo',
  Sideload = 'Sideload'
}

export const RunnerToLogPrefixMap = {
  legendary: LogPrefix.Legendary,
  gog: LogPrefix.Gog,
  sideload: LogPrefix.Sideload
}

type LogInputType = unknown[] | unknown

interface LogOptions {
  prefix?: LogPrefix
  showDialog?: boolean
  skipLogToFile?: boolean
  forceLog?: boolean
}

// global variable to use by logBase
export let logsDisabled = false

export function initLogger() {
  // Add a basic error handler to our stdout/stderr. If we don't do this,
  // the main `process.on('uncaughtException', ...)` handler catches them (and
  // presents an error message to the user, which is hardly necessary for
  // "just" failing to write to the streams)
  for (const channel of ['stdout', 'stderr'] as const) {
    process[channel].once('error', (error: Error) => {
      const prefix = `${getTimeStamp()} ${getLogLevelString(
        'ERROR'
      )} ${getPrefixString(LogPrefix.Backend)}`
      appendMessageToLogFile(
        `${prefix} Error writing to ${channel}: ${error.stack}`
      )
      process[channel].on('error', () => {
        // Silence further write errors
      })
    })
  }

  // check `disableLogs` setting
  const { disableLogs } = GlobalConfig.get().getSettings()

  logsDisabled = disableLogs

  if (logsDisabled) {
    logWarning(
      'IMPORTANT: Logs are disabled. Enable logs before reporting any issue.',
      {
        forceLog: true
      }
    )
  }

  // log important information: binaries, system specs
  getSystemInfo()
    .then(formatSystemInfo)
    .then((systemInfo) => {
      logInfo(`\nSystem Information:\n${systemInfo}\n`, {
        prefix: LogPrefix.Backend,
        forceLog: true
      })
    })
    .catch((error) =>
      logError(['Failed to fetch system information', error], LogPrefix.Backend)
    )

  logInfo(['Legendary location:', join(...Object.values(getLegendaryBin()))], {
    prefix: LogPrefix.Legendary,
    forceLog: true
  })
  logInfo(['GOGDL location:', join(...Object.values(getGOGdlBin()))], {
    prefix: LogPrefix.Gog,
    forceLog: true
  })

  // listen to the settingChanged event, log change and enable/disable logging if needed
  backendEvents.on('settingChanged', ({ key, oldValue, newValue }) => {
    logInfo(
      `Heroic: Setting ${key} to ${JSON.stringify(
        newValue
      )} (previous value: ${JSON.stringify(oldValue)})`,
      { forceLog: true }
    )

    if (key === 'disableLogs') {
      logsDisabled = newValue
    }
  })
}

// helper to convert LogInputType to string
function convertInputToString(param: LogInputType): string {
  const getString = (value: LogInputType): string => {
    switch (typeof value) {
      case 'string':
        return value
      case 'object':
        // Object.prototype.toString.call(value).includes('Error') will catch all
        // Error types (Error, EvalError, SyntaxError, ...)
        if (Object.prototype.toString.call(value).includes('Error')) {
          return value!['stack'] ? value!['stack'] : value!.toString()
        } else if (Object.prototype.toString.call(value).includes('Object')) {
          return JSON.stringify(value, null, 2)
        } else {
          return `${value}`
        }
      case 'number':
        return String(value)
      case 'boolean':
        return value ? 'true' : 'false'
      default:
        return `${value}`
    }
  }

  if (!Array.isArray(param)) {
    return getString(param)
  }

  const strings: string[] = []
  param.forEach((value) => {
    strings.push(getString(value))
  })
  return strings.join(' ')
}

const padNumberToTwo = (n: number) => {
  return ('0' + n).slice(-2)
}

const repeatString = (n: number, char: string) => {
  return n > 0 ? char.repeat(n) : ''
}

const getTimeStamp = () => {
  const ts = new Date()

  return `(${[
    padNumberToTwo(ts.getHours()),
    padNumberToTwo(ts.getMinutes()),
    padNumberToTwo(ts.getSeconds())
  ].join(':')})`
}

const getLogLevelString = (level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR') => {
  return `${level}:${repeatString(7 - level.length, ' ')}`
}

const getPrefixString = (prefix: LogPrefix) => {
  return prefix !== LogPrefix.General
    ? `[${prefix}]: ${repeatString(getLongestPrefix() - prefix.length, ' ')}`
    : ''
}

function logBase(
  input: LogInputType,
  level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR',
  options_or_prefix?: LogOptions | LogPrefix
) {
  let options
  if (typeof options_or_prefix === 'string') {
    options = { prefix: options_or_prefix }
  } else {
    options = options_or_prefix
  }

  if (logsDisabled && !options?.forceLog) return

  const text = convertInputToString(input)
  const messagePrefix = `${getTimeStamp()} ${getLogLevelString(
    level
  )} ${getPrefixString(options?.prefix ?? LogPrefix.Backend)}`

  switch (level) {
    case 'ERROR':
      console.error(messagePrefix, ...(Array.isArray(input) ? input : [input]))
      break
    case 'WARNING':
      console.warn(messagePrefix, ...(Array.isArray(input) ? input : [input]))
      break
    case 'INFO':
    case 'DEBUG':
    default:
      console.log(messagePrefix, ...(Array.isArray(input) ? input : [input]))
      break
  }

  if (options?.showDialog) {
    showDialogBoxModalAuto({
      title: options?.prefix ?? LogPrefix.Backend,
      message: text,
      type: 'ERROR'
    })
  }

  if (!options?.skipLogToFile) {
    appendMessageToLogFile(`${messagePrefix} ${text}`)
  }
}

/**
 * Log debug messages
 * @param input debug messages to log
 * @param prefix added before the message {@link LogPrefix}
 * @param skipLogToFile set true to not log to file
 * @param showDialog set true to show in frontend
 * @defaultvalue {@link LogPrefix.General}
 */
export function logDebug(input: LogInputType, options?: LogOptions): void
export function logDebug(input: LogInputType, prefix?: LogPrefix): void
export function logDebug(
  input: LogInputType,
  options_or_prefix?: LogOptions | LogPrefix
) {
  logBase(input, 'DEBUG', options_or_prefix)
}

/**
 * Log error messages
 * @param input error messages to log
 * @param prefix added before the message {@link LogPrefix}
 * @param skipLogToFile set true to not log to file
 * @param showDialog set true to show in frontend
 * @defaultvalue {@link LogPrefix.General}
 */
export function logError(input: LogInputType, options?: LogOptions): void
export function logError(input: LogInputType, prefix?: LogPrefix): void
export function logError(
  input: LogInputType,
  options_or_prefix?: LogOptions | LogPrefix
) {
  logBase(input, 'ERROR', options_or_prefix)
}

/**
 * Log info messages
 * @param input info messages to log
 * @param prefix added before the message {@link LogPrefix}
 * @param skipLogToFile set true to not log to file
 * @param showDialog set true to show in frontend
 * @defaultvalue {@link LogPrefix.General}
 */
export function logInfo(input: LogInputType, options?: LogOptions): void
export function logInfo(input: LogInputType, prefix?: LogPrefix): void
export function logInfo(
  input: LogInputType,
  options_or_prefix?: LogOptions | LogPrefix
) {
  logBase(input, 'INFO', options_or_prefix)
}

/**
 * Log warning messages
 * @param input warning messages to log
 * @param prefix added before the message {@link LogPrefix}
 * @param skipLogToFile set true to not log to file
 * @param showDialog set true to show in frontend
 * @defaultvalue {@link LogPrefix.General}
 */
export function logWarning(input: LogInputType, options?: LogOptions): void
export function logWarning(input: LogInputType, prefix?: LogPrefix): void
export function logWarning(
  input: LogInputType,
  options_or_prefix?: LogOptions | LogPrefix
) {
  logBase(input, 'WARNING', options_or_prefix)
}

export function logChangedSetting(
  config: Partial<AppSettings>,
  oldConfig: GameSettings
) {
  const changedSettings = Object.keys(config).filter(
    (key) => config[key] !== oldConfig[key]
  )

  changedSettings.forEach((changedSetting) => {
    // check if both are empty arrays
    if (
      Array.isArray(config[changedSetting]) &&
      Array.isArray(oldConfig[changedSetting]) &&
      config[changedSetting].length === 0 &&
      oldConfig[changedSetting].length === 0
    ) {
      return
    }

    // check if both are objects and have different values
    if (
      typeof config[changedSetting] === 'object' &&
      typeof oldConfig[changedSetting] === 'object' &&
      JSON.stringify(config[changedSetting]) ===
        JSON.stringify(oldConfig[changedSetting])
    ) {
      return
    }

    const oldSetting =
      typeof oldConfig[changedSetting] === 'object'
        ? JSON.stringify(oldConfig[changedSetting])
        : oldConfig[changedSetting]
    const newSetting =
      typeof config[changedSetting] === 'object'
        ? JSON.stringify(config[changedSetting])
        : config[changedSetting]

    logInfo(
      `Changed config: ${changedSetting} from ${oldSetting} to ${newSetting}`,
      LogPrefix.Backend
    )
  })
}

export function lastPlayLogFileLocation(appName: string) {
  return join(gamesConfigPath, `${appName}-lastPlay.log`)
}

export function logFileLocation(appName: string) {
  return join(gamesConfigPath, `${appName}.log`)
}

const logsWriters: Record<string, LogWriter> = {}

class LogWriter {
  gameInfo: GameInfo
  queue: string[] | undefined
  initialized: boolean
  timeoutId: NodeJS.Timeout | undefined
  filePath: string

  constructor(gameInfo: GameInfo) {
    this.gameInfo = gameInfo
    this.initialized = false
    this.filePath = lastPlayLogFileLocation(gameInfo.app_name)
  }

  logMessage(message: string) {
    this.queue ??= []

    // push messages to append to the log
    this.queue.push(message)

    // if the logger is initialized and we don't have a timeout,
    // append the message and start a timeout
    //
    // otherwise it means there's a timeout already running that will
    // write the elements in the queue in a second
    if (this.initialized && !this.timeoutId) this.appendMessages()
  }

  async initLog() {
    const { app_name, runner } = this.gameInfo

    const notNative =
      ['windows', 'Windows', 'Win32'].includes(
        this.gameInfo.install.platform || ''
      ) && platform() !== 'win32'

    // init log file and then append message if any
    try {
      // log game title and install directory
      writeFileSync(
        this.filePath,
        `Launching "${this.gameInfo.title}" (${runner})\n` +
          `Native? ${notNative ? 'No' : 'Yes'}\n` +
          `Installed in: ${this.gameInfo.install.install_path}\n\n`
      )

      try {
        // log system information
        const info = await getSystemInfo()
        const systemInfo = await formatSystemInfo(info)

        appendFileSync(this.filePath, `System Info:\n${systemInfo}\n\n`)

        // log game settings
        const gameSettings = await gameManagerMap[runner].getSettings(app_name)
        const gameSettingsString = JSON.stringify(gameSettings, null, '\t')
        const startPlayingDate = new Date()

        appendFileSync(
          this.filePath,
          `Game Settings: ${gameSettingsString}\n\n`
        )

        // log if EOS overlay is enabled for Epic games
        if (runner === 'legendary') {
          const enabled = await isEnabled(app_name)

          appendFileSync(
            this.filePath,
            `EOS Overlay enabled? ${enabled ? 'Yes' : 'No'}\n`
          )
        }

        // log winetricks packages if not native
        if (notNative) {
          const winetricksPackages = await Winetricks.listInstalled(
            runner,
            app_name
          )

          appendFileSync(
            this.filePath,
            `Winetricks packages installed: ${
              winetricksPackages?.join(', ') || 'None'
            }\n\n`
          )
        }

        appendFileSync(
          this.filePath,
          `Game launched at: ${startPlayingDate}\n\n`
        )

        this.initialized = true
      } catch (error) {
        logError(
          ['Failed to fetch system information', error],
          LogPrefix.Backend
        )
      }
    } catch (error) {
      logError(
        [`Failed to initialize log ${this.filePath}:`, error],
        LogPrefix.Backend
      )
    }
  }

  appendMessages() {
    const messagesToWrite = this.queue

    // clear pending message if any
    this.queue = []

    // clear timeout if any
    delete this.timeoutId

    if (!messagesToWrite?.length) return

    // if we have messages, write them and check again in 1 second
    // we start the timeout before writing so we don't wait until
    // the disk write
    this.timeoutId = setTimeout(() => this.appendMessages(), 1000)

    try {
      appendFileSync(this.filePath, messagesToWrite.join(''))
    } catch (error) {
      // ignore failures if messages could not be written
    }
  }
}

export function appendGameLog(gameInfo: GameInfo, message: string) {
  logsWriters[gameInfo.app_name] ??= new LogWriter(gameInfo)
  logsWriters[gameInfo.app_name].logMessage(message)
}

export function initGameLog(gameInfo: GameInfo) {
  logsWriters[gameInfo.app_name] ??= new LogWriter(gameInfo)
  logsWriters[gameInfo.app_name].initLog()
}

export function stopLogger(appName: string) {
  delete logsWriters[appName]
}
