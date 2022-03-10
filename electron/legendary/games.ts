import { existsSync, mkdirSync } from 'graceful-fs'
import axios from 'axios'

import { BrowserWindow } from 'electron'
import { ExecResult, ExtraInfo, InstallArgs, LaunchResult } from '../types'
import { Game } from '../games'
import { GameConfig } from '../game_config'
import { GlobalConfig } from '../config'
import { LegendaryLibrary } from './library'
import { LegendaryUser } from './user'
import { errorHandler, execAsync, isOnline } from '../utils'
import {
  execOptions,
  heroicGamesConfigPath,
  home,
  isWindows,
  legendaryBin
} from '../constants'
import { logError, logInfo, LogPrefix } from '../logger/logger'
import { spawn } from 'child_process'
import Store from 'electron-store'
import { launch } from '../launcher'
import { addShortcuts, removeShortcuts } from '../shortcuts'
import { dirname, join } from 'path'

const legendaryPath = dirname(legendaryBin).replaceAll('"', '')
process.chdir(legendaryPath)

const store = new Store({
  cwd: 'lib-cache',
  name: 'gameinfo'
})
class LegendaryGame extends Game {
  public appName: string
  public window = BrowserWindow.getAllWindows()[0]
  private static instances: Map<string, LegendaryGame> = new Map()

  private constructor(appName: string) {
    super()
    this.appName = appName
  }

  public static get(appName: string) {
    if (LegendaryGame.instances.get(appName) === undefined) {
      LegendaryGame.instances.set(appName, new LegendaryGame(appName))
    }
    return LegendaryGame.instances.get(appName)
  }

  /**
   * Alias for `LegendaryLibrary.listUpdateableGames`
   */
  public static async checkGameUpdates() {
    const isLoggedIn = await LegendaryUser.isLoggedIn()
    if (!isLoggedIn) {
      return []
    }
    return await LegendaryLibrary.get().listUpdateableGames()
  }

  /**
   * Alias for `LegendaryLibrary.getGameInfo(this.appName)`
   *
   * @returns GameInfo
   */
  public async getGameInfo() {
    return await LegendaryLibrary.get().getGameInfo(this.appName)
  }

  /**
   * Alias for `LegendaryLibrary.getInstallInfo(this.appName)`
   *
   * @returns InstallInfo
   */
  public async getInstallInfo() {
    return await LegendaryLibrary.get().getInstallInfo(this.appName)
  }

  private async getProductSlug(namespace: string) {
    const graphql = JSON.stringify({
      query: `{Catalog{catalogOffers( namespace:"${namespace}"){elements {productSlug}}}}`,
      variables: {}
    })
    const result = await axios('https://www.epicgames.com/graphql', {
      data: graphql,
      headers: { 'Content-Type': 'application/json' },
      method: 'POST'
    })
    const res = result.data.data.Catalog.catalogOffers
    const slug = res.elements.find(
      (e: { productSlug: string }) => e.productSlug
    )
    if (slug) {
      return slug.productSlug.replace(/(\/.*)/, '')
    } else {
      return this.appName
    }
  }

  /**
   * Get extra info from Epic's API.
   *
   * @param namespace
   * @returns
   */
  public async getExtraInfo(namespace: string | null): Promise<ExtraInfo> {
    if (store.has(namespace)) {
      return store.get(namespace) as ExtraInfo
    }
    if (!(await isOnline())) {
      return {
        about: {},
        reqs: []
      } as ExtraInfo
    }
    let lang = GlobalConfig.get().config.language
    if (lang === 'pt') {
      lang = 'pt-BR'
    }
    if (lang === 'zh_Hans') {
      lang = 'zh-CN'
    }

    let epicUrl: string
    if (namespace) {
      let productSlug: string
      try {
        productSlug = await this.getProductSlug(namespace)
      } catch (error) {
        logError(`${error}`, LogPrefix.Legendary)
        productSlug = this.appName
      }
      epicUrl = `https://store-content.ak.epicgames.com/api/${lang}/content/products/${productSlug}`
    } else {
      epicUrl = `https://store-content.ak.epicgames.com/api/${lang}/content/products/${this.appName}`
    }
    try {
      const { data } = await axios({
        method: 'GET',
        url: epicUrl
      })
      logInfo('Getting Info from Epic API', LogPrefix.Legendary)

      const about = data.pages.find(
        (e: { type: string }) => e.type === 'productHome'
      )

      store.set(namespace, {
        about: about.data.about,
        reqs: about.data.requirements.systems[0].details
      })
      return {
        about: about.data.about,
        reqs: about.data.requirements.systems[0].details
      } as ExtraInfo
    } catch (error) {
      logError('Error Getting Info from Epic API', LogPrefix.Legendary)

      store.set(namespace, { about: {}, reqs: [] })
      return {
        about: {},
        reqs: []
      } as ExtraInfo
    }
  }

  /**
   * Alias for `GameConfig.get(this.appName).config`
   * If it doesn't exist, uses getSettings() instead.
   *
   * @returns GameConfig
   */
  public async getSettings() {
    return (
      GameConfig.get(this.appName).config ||
      (await GameConfig.get(this.appName).getSettings())
    )
  }

  /**
   * Helper for `checkGameUpdates().contains(this.appName)`
   *
   * @returns If game has an update.
   */
  public async hasUpdate() {
    return (await LegendaryLibrary.get().listUpdateableGames()).includes(
      this.appName
    )
  }

  /**
   * Parent folder to move app to.
   * Amends install path by adding the appropriate folder name.
   *
   * @param newInstallPath
   * @returns The amended install path.
   */
  public async moveInstall(newInstallPath: string) {
    const {
      install: { install_path },
      title
    } = await this.getGameInfo()

    if (isWindows) {
      newInstallPath += '\\' + install_path.split('\\').slice(-1)[0]
    } else {
      newInstallPath += '/' + install_path.split('/').slice(-1)[0]
    }

    logInfo(`Moving ${title} to ${newInstallPath}`, LogPrefix.Legendary)
    await execAsync(`mv -f '${install_path}' '${newInstallPath}'`, execOptions)
      .then(() => {
        LegendaryLibrary.get().changeGameInstallPath(
          this.appName,
          newInstallPath
        )
        logInfo(`Finished Moving ${title}`, LogPrefix.Legendary)
      })
      .catch((error) => logError(`${error}`, LogPrefix.Legendary))
    return newInstallPath
  }

  /**
   * Update game.
   * Does NOT check for online connectivity.
   *
   * @returns Result of execAsync.
   */
  public async update() {
    this.window.webContents.send('setGameStatus', {
      appName: this.appName,
      runner: 'legendary',
      status: 'updating'
    })
    const { maxWorkers } = await GlobalConfig.get().getSettings()
    const workers = maxWorkers === 0 ? '' : ` --max-workers ${maxWorkers}`
    const logPath = `"${join(heroicGamesConfigPath, this.appName + '.log')}"`
    const writeLog = isWindows ? `2>&1 > ${logPath}` : `|& tee ${logPath}`

    const legendaryPath = dirname(legendaryBin).replaceAll('"', '')
    process.chdir(legendaryPath)
    const command = `${isWindows ? './legendary.exe' : './legendary'} update ${
      this.appName
    }${workers} -y ${writeLog}`
    return execAsync(command, execOptions)
      .then(() => {
        this.window.webContents.send('setGameStatus', {
          appName: this.appName,
          runner: 'legendary',
          status: 'done'
        })
        return { status: 'done' }
      })
      .catch((error) => {
        logError(`${error}`, LogPrefix.Legendary)
        this.window.webContents.send('setGameStatus', {
          appName: this.appName,
          runner: 'legendary',
          status: 'done'
        })
        return { status: 'error' }
      })
  }

  /**
   * Adds a desktop shortcut to $HOME/Desktop and to /usr/share/applications
   * so that the game can be opened from the start menu and the desktop folder.
   * Both can be disabled with addDesktopShortcuts and addStartMenuShortcuts
   * @async
   * @public
   */
  public async addShortcuts(fromMenu?: boolean) {
    return addShortcuts(await this.getGameInfo(), fromMenu)
  }

  /**
   * Removes a desktop shortcut from $HOME/Desktop and to $HOME/.local/share/applications
   * @async
   * @public
   */
  public async removeShortcuts() {
    return removeShortcuts(this.appName, 'legendary')
  }

  private getSdlList(sdlList: Array<string>) {
    // Legendary needs an empty tag for it to download the other needed files
    const defaultTag = ' --install-tag=""'
    return sdlList
      .map((tag) => `--install-tag ${tag}`)
      .join(' ')
      .replaceAll("'", '')
      .concat(defaultTag)
  }

  /**
   * Install game.
   * Does NOT check for online connectivity.
   *
   * @returns Result of execAsync.
   */
  public async install({
    path,
    installDlcs,
    sdlList,
    platformToInstall
  }: InstallArgs) {
    const { maxWorkers } = await GlobalConfig.get().getSettings()
    const workers = maxWorkers === 0 ? '' : `--max-workers ${maxWorkers}`
    const withDlcs = installDlcs ? '--with-dlcs' : '--skip-dlcs'
    const installSdl = sdlList.length ? this.getSdlList(sdlList) : '--skip-sdl'

    const logPath = `"${join(heroicGamesConfigPath, this.appName + '.log')}"`
    const writeLog = isWindows ? `2>&1 > ${logPath}` : `|& tee ${logPath}`
    const legendaryPath = dirname(legendaryBin).replaceAll('"', '')
    process.chdir(legendaryPath)
    const command = `${isWindows ? './legendary.exe' : './legendary'} install ${
      this.appName
    } --platform ${platformToInstall} --base-path '${path}' ${withDlcs} ${installSdl} ${workers} -y ${writeLog}`
    logInfo([`Installing ${this.appName} with:`, command], LogPrefix.Legendary)
    return execAsync(command, execOptions)
      .then(async ({ stdout, stderr }) => {
        if (stdout.includes('ERROR')) {
          errorHandler({ error: { stdout, stderr }, logPath })

          return { status: 'error' }
        }
        return { status: 'done' }
      })
      .catch(() => {
        logInfo('Installaton canceled', LogPrefix.Legendary)
        return { status: 'error' }
      })
  }

  public async uninstall() {
    const command = `${
      isWindows ? './legendary.exe' : './legendary'
    } uninstall ${this.appName} -y`
    logInfo(
      [`Uninstalling ${this.appName} with:`, command],
      LogPrefix.Legendary
    )
    LegendaryLibrary.get().installState(this.appName, false)
    return await execAsync(command, execOptions)
      .then((value) => {
        return value
      })
      .catch((error) => {
        logError(`${error}`, LogPrefix.Legendary)
        return null
      })
  }
  /**
   * Repair game.
   * Does NOT check for online connectivity.
   *
   * @returns Result of execAsync.
   */
  public async repair() {
    // this.state.status = 'repairing'
    const { maxWorkers } = await GlobalConfig.get().getSettings()
    const workers = maxWorkers ? `--max-workers ${maxWorkers}` : ''

    const logPath = `"${join(heroicGamesConfigPath, this.appName + '.log')}"`
    const writeLog = isWindows ? `2>&1 > ${logPath}` : `|& tee ${logPath}`

    const command = `${isWindows ? './legendary.exe' : './legendary'} repair ${
      this.appName
    } ${workers} -y ${writeLog}`

    logInfo([`Repairing ${this.appName} with:`, command], LogPrefix.Legendary)
    return await execAsync(command, execOptions)
      .then((value) => {
        // this.state.status = 'done'
        return value
      })
      .catch((error) => {
        logError(`${error}`, LogPrefix.Legendary)
        return null
      })
  }

  public async import(path: string) {
    const command = `${
      isWindows ? './legendary.exe' : './legendary'
    } import-game ${this.appName} '${path}'`

    logInfo(
      [`Importing ${this.appName} from ${path} with:`, command],
      LogPrefix.Legendary
    )
    return await execAsync(command, execOptions)
      .then((value) => {
        return value
      })
      .catch((error) => {
        logError(`${error}`, LogPrefix.Legendary)
        return null
      })
  }

  /**
   * Sync saves.
   * Does NOT check for online connectivity.
   *
   * @returns Result of execAsync.
   */
  public async syncSaves(arg: string, path: string) {
    const fixedPath = isWindows
      ? path.replaceAll("'", '').slice(0, -1)
      : path.replaceAll("'", '')

    const command = `${
      isWindows ? './legendary.exe' : './legendary'
    } sync-saves ${arg} --save-path "${fixedPath}" ${this.appName} -y`
    const legendarySavesPath = join(home, 'legendary', '.saves')

    //workaround error when no .saves folder exists
    if (!existsSync(legendarySavesPath)) {
      mkdirSync(legendarySavesPath, { recursive: true })
    }

    logInfo(['Syncing saves for ', this.appName], LogPrefix.Legendary)
    return await execAsync(command, execOptions)
  }

  public async launch(
    launchArguments?: string
  ): Promise<ExecResult | LaunchResult> {
    return launch(this.appName, launchArguments, 'legendary')
  }

  public async stop() {
    // until the legendary bug gets fixed, kill legendary on mac
    // not a perfect solution but it's the only choice for now

    // @adityaruplaha: this is kinda arbitary and I don't understand it.
    const pattern = process.platform === 'linux' ? this.appName : 'legendary'
    logInfo(['killing', pattern], LogPrefix.Legendary)

    if (process.platform === 'win32') {
      try {
        await execAsync(`Stop-Process -name  ${pattern}`, execOptions)
        return logInfo(`${pattern} killed`, LogPrefix.Legendary)
      } catch (error) {
        return logError(
          [`not possible to kill ${pattern}`, `${error}`],
          LogPrefix.Legendary
        )
      }
    }

    const child = spawn('pkill', ['-f', pattern])
    child.on('exit', () => {
      return logInfo(`${pattern} killed`, LogPrefix.Legendary)
    })
  }
}

export { LegendaryGame }
