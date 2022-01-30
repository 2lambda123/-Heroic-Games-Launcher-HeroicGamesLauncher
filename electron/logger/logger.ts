/**
 * @file  Use this module to log things into the console or a file.
 *        Everything will be saved to a file before the app exits.
 *        Note that with console.log and console.warn everything will be saved too.
 *        error equals console.error
 */
import {
  openSync,
  existsSync,
  readdirSync,
  mkdirSync,
  rmSync,
  appendFileSync
} from 'graceful-fs'
import Store from 'electron-store'
import {
  currentLogFile,
  heroicGamesConfigPath,
  heroicLogFolder,
  lastLogFile
} from '../constants'

export enum LogPrefix {
  General = '',
  Legendary = 'Legendary',
  Gog = 'Gog',
  WineDownloader = 'WineDownloader',
  DXVKInstaller = 'DXVKInstaller',
  GlobalConfig = 'GlobalConfig',
  GameConfig = 'GameConfig',
  ProtocolHandler = 'ProtocolHandler',
  Frontend = 'Frontend',
  Backend = 'Backend'
}

let longestPrefix = 0
const configStore = new Store({
  cwd: 'store'
})

// helper to convert string to string[]
function convertToStringArray(param: string | string[]): string[] {
  return typeof param === 'string' ? [param] : param
}

const padNumberToTwo = (n: number) => {
  return ('0' + n).slice(-2)
}

const repeatString = (n: number, char: string) => {
  return n > 0 ? char.repeat(n) : ''
}

/**
 * Log debug messages
 * @param text debug messages to log
 * @param prefix added before the message {@link LogPrefix}
 * @param skipLogToFile set true to not log to file
 * @defaultvalue {@link LogPrefix.General}
 */
export function logDebug(
  text: string[] | string,
  prefix: LogPrefix = LogPrefix.General,
  skipLogToFile = false
) {
  // time
  const ts = new Date()
  const timeString = `(${[
    padNumberToTwo(ts.getHours()),
    padNumberToTwo(ts.getMinutes()),
    padNumberToTwo(ts.getSeconds())
  ].join(':')})`

  // prefix string
  const prefixString =
    prefix !== LogPrefix.General
      ? `[${prefix}]: ${repeatString(longestPrefix - prefix.length, ' ')}`
      : ''

  const extendText = `${timeString} DEBUG:   ${prefixString}${convertToStringArray(
    text
  ).join(' ')}`
  console.log(extendText)

  if (!skipLogToFile) {
    appendMessageToLogFile(extendText)
  }
}

/**
 * Log error messages
 * @param text error messages to log
 * @param prefix added before the message {@link LogPrefix}
 * @param skipLogToFile set true to not log to file
 * @defaultvalue {@link LogPrefix.General}
 */
export function logError(
  text: string[] | string,
  prefix: LogPrefix = LogPrefix.General,
  skipLogToFile = false
) {
  // time
  const ts = new Date()
  const timeString = `(${[
    padNumberToTwo(ts.getHours()),
    padNumberToTwo(ts.getMinutes()),
    padNumberToTwo(ts.getSeconds())
  ].join(':')})`

  // prefix string
  const prefixString =
    prefix !== LogPrefix.General
      ? `[${prefix}]: ${repeatString(longestPrefix - prefix.length, ' ')}`
      : ''

  const extendText = `${timeString} ERROR:   ${prefixString}${convertToStringArray(
    text
  ).join(' ')}`
  console.error(extendText)

  if (!skipLogToFile) {
    appendMessageToLogFile(extendText)
  }
}

/**
 * Log info messages
 * @param text info messages to log
 * @param prefix added before the message {@link LogPrefix}
 * @param skipLogToFile set true to not log to file
 * @defaultvalue {@link LogPrefix.General}
 */
export function logInfo(
  text: string[] | string,
  prefix: LogPrefix = LogPrefix.General,
  skipLogToFile = false
) {
  // time
  const ts = new Date()
  const timeString = `(${[
    padNumberToTwo(ts.getHours()),
    padNumberToTwo(ts.getMinutes()),
    padNumberToTwo(ts.getSeconds())
  ].join(':')})`

  // prefix string
  const prefixString =
    prefix !== LogPrefix.General
      ? `[${prefix}]: ${repeatString(longestPrefix - prefix.length, ' ')}`
      : ''

  const extendText = `${timeString} INFO:    ${prefixString}${convertToStringArray(
    text
  ).join(' ')}`
  console.log(extendText)

  if (!skipLogToFile) {
    appendMessageToLogFile(extendText)
  }
}

/**
 * Log warning messages
 * @param text warning messages to log
 * @param prefix added before the message {@link LogPrefix}
 * @param skipLogToFile set true to not log to file
 * @defaultvalue {@link LogPrefix.General}
 */
export function logWarning(
  text: string[] | string,
  prefix: LogPrefix = LogPrefix.General,
  skipLogToFile = false
) {
  // time
  const ts = new Date()
  const timeString = `(${[
    padNumberToTwo(ts.getHours()),
    padNumberToTwo(ts.getMinutes()),
    padNumberToTwo(ts.getSeconds())
  ].join(':')})`

  // prefix string
  const prefixString =
    prefix !== LogPrefix.General
      ? `[${prefix}]: ${repeatString(longestPrefix - prefix.length, ' ')}`
      : ''
  const extendText = `${timeString} WARNING: ${prefixString}${convertToStringArray(
    text
  ).join(' ')}`
  console.warn(extendText)

  if (!skipLogToFile) {
    appendMessageToLogFile(extendText)
  }
}

interface createLogFileReturn {
  currentLogFile: string
  lastLogFile: string
}

/**
 * Creates a new log file in heroic config path under folder Logs.
 * It also removes old logs every new month.
 * @returns path to current log file
 */
export function createNewLogFileAndClearOldOnces(): createLogFileReturn {
  const date = new Date()
  const newLogFile = `${heroicLogFolder}/heroic-${date.toISOString()}.log`
  try {
    if (!existsSync(heroicLogFolder)) {
      mkdirSync(heroicLogFolder)
    }
    openSync(newLogFile, 'w')
  } catch (error) {
    logError(
      `Open ${currentLogFile} failed with ${error}`,
      LogPrefix.Backend,
      true
    )
  }

  try {
    const logs = readdirSync(heroicLogFolder)
    logs.forEach((log) => {
      const dateString = log.replace('heroic-', '').replace('.log', '')
      const logDate = new Date(dateString)
      if (
        logDate.getFullYear() < date.getFullYear() ||
        logDate.getMonth() < date.getMonth()
      ) {
        rmSync(`${heroicLogFolder}/${log}`)
      }
    })
  } catch (error) {
    logError(
      `Removing old logs in ${heroicLogFolder} failed with ${error}`,
      LogPrefix.Backend,
      true
    )
  }

  let logs: createLogFileReturn = {
    currentLogFile: '',
    lastLogFile: ''
  }
  if (configStore.has('general-logs')) {
    logs = configStore.get('general-logs') as createLogFileReturn
  }

  logs.lastLogFile = logs.currentLogFile
  logs.currentLogFile = newLogFile

  configStore.set('general-logs', logs)

  //get longest prefix to line logs better
  for (const prefix in LogPrefix) {
    if (longestPrefix < String(prefix).length) {
      longestPrefix = String(prefix).length
    }
  }

  return logs
}

/**
 * Returns according to options the fitting log file
 * @param isDefault   getting heroic default log
 * @param appName     needed to get appName log
 * @param defaultLast if set getting heroic default latest log
 * @returns path to log file
 */
export function getLogFile(
  isDefault: boolean,
  appName: string,
  defaultLast = false
): string {
  return isDefault
    ? defaultLast
      ? lastLogFile
      : currentLogFile
    : `${heroicGamesConfigPath}${appName}-lastPlay.log`
}

/**
 * Appends given message to the current log file
 * @param message message to append
 */
function appendMessageToLogFile(message: string) {
  try {
    if (currentLogFile) {
      appendFileSync(currentLogFile, `${message}\n`)
    }
  } catch (error) {
    logError(`Writing log file failed with ${error}`, LogPrefix.Backend, true)
  }
}
