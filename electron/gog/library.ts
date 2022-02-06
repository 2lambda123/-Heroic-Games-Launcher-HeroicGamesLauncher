import axios, { AxiosError, AxiosResponse } from 'axios'
import Store from 'electron-store'
import { GOGUser } from './user'
import {
  GOGLoginData,
  GOGGameInfo,
  GameInfo,
  InstallInfo,
  InstalledInfo,
  GOGImportData
} from '../types'
import { logError, logInfo, LogPrefix } from '../logger/logger'
import { execAsync } from '../utils'
import { gogdlBin } from '../constants'
import prettyBytes from 'pretty-bytes'

const userStore = new Store({
  cwd: 'gog_store'
})
const apiInfoCache = new Store({ cwd: 'gog_store', name: 'api_info_cache' })
const libraryStore = new Store({ cwd: 'gog_store', name: 'library' })
const installedGamesStore = new Store({
  cwd: 'gog_store',
  name: 'installed'
})

export class GOGLibrary {
  private static globalInstance: GOGLibrary = null
  private library: Map<string, null | GameInfo> = new Map()
  private installedGames: Map<string, null | InstalledInfo> = new Map()

  private constructor() {
    this.refreshInstalled()
  }

  public async sync() {
    if (!GOGUser.isLoggedIn()) {
      return
    }
    if (GOGUser.isTokenExpired()) {
      await GOGUser.refreshToken()
    }
    // This gets games and movies library
    // In the future handle multiple pages
    const credentials: GOGLoginData = userStore.get(
      'credentials'
    ) as GOGLoginData
    const headers = { Authorization: 'Bearer ' + credentials.access_token }
    logInfo('Getting GOG library', LogPrefix.Gog)
    const games = await axios
      .get(
        'https://embed.gog.com/account/getFilteredProducts?mediaType=1&totalPages=1&sortBy=title',
        { headers: headers }
      )
      .catch((e: AxiosError) => {
        logError(
          ['There was an error getting games library data', e.message],
          LogPrefix.Gog
        )
        return null
      })

    const movies = await axios
      .get(
        'https://embed.gog.com/account/getFilteredProducts?mediaType=2&totalPages=1&sortBy=title',
        { headers: headers }
      )
      .catch((e: AxiosError) => {
        logError(
          ['There was an error getting movies library data', e.message],
          LogPrefix.Gog
        )
        return null
      })

    if (games) {
      const gamesObjects: GameInfo[] = []
      const gamesArray = libraryStore.get('games') as GameInfo[]
      for (const game of games.data.products as GOGGameInfo[]) {
        let unifiedObject = gamesArray
          ? gamesArray.find((value) => value.app_name == String(game.id))
          : null
        if (!unifiedObject) {
          let apiData = apiInfoCache.get(game.slug)
          if (!apiData) {
            apiData = await this.get_games_data(String(game.id))
            apiInfoCache.set(game.slug, apiData)
          }
          unifiedObject = this.gogToUnifiedInfo(game, apiData)
        }
        gamesObjects.push(unifiedObject)
        const installedInfo = this.installedGames.get(String(game.id))
        // Create new object to not write install data into library store
        const copyObject = Object.assign({}, unifiedObject)
        if (installedInfo) {
          copyObject.is_installed = true
          copyObject.install = installedInfo
        }
        this.library.set(String(game.id), copyObject)
      }
      libraryStore.set('games', gamesObjects)
      libraryStore.set('totalGames', games.data.totalProducts)
      libraryStore.set('totalMovies', games.data.moviesCount)
      logInfo('Saved games data', LogPrefix.Gog)
    }
    if (movies) {
      libraryStore.set('movies', movies.data.products)
      logInfo('Saved movies data', LogPrefix.Gog)
    }
  }

  public static get() {
    if (this.globalInstance == null) {
      GOGLibrary.globalInstance = new GOGLibrary()
    }
    return this.globalInstance
  }

  public getGameInfo(slug: string): GameInfo {
    const info = this.library.get(slug)
    if (!info) {
      return null
    }
    return info
  }

  /**
   * Gets data metadata about game using gogdl info for current system,
   * when os is Linux: gets Windows build data.
   * Contains data like download size
   * @param appName
   * @returns InstallInfo object
   */
  public async getInstallInfo(appName: string) {
    if (GOGUser.isTokenExpired()) await GOGUser.refreshToken()
    const credentials = userStore.get('credentials') as GOGLoginData
    const { stdout } = await execAsync(
      `${gogdlBin} info ${appName} --token=${
        credentials.access_token
      } --lang=en-US --os ${process.platform == 'darwin' ? 'osx' : 'windows'}`
    )
    const gogInfo = JSON.parse(stdout)
    const gameData = this.library.get(appName)
    const libraryArray = libraryStore.get('games') as GameInfo[]
    const gameObjectIndex = libraryArray.findIndex(
      (val) => val.app_name == appName
    )
    libraryArray[gameObjectIndex].folder_name = gogInfo.folder_name
    gameData.folder_name = gogInfo.folder_name
    libraryStore.set('games', libraryArray)
    this.library.set(appName, gameData)
    const info: InstallInfo = {
      game: {
        app_name: appName,
        title: gameData.title,
        owned_dlc: gogInfo.dlcs,
        version: gogInfo.version,
        launch_options: [],
        platform_versions: null
      },
      manifest: {
        disk_size: Number(gogInfo.disk_size),
        download_size: Number(gogInfo.download_size),
        app_name: appName,
        install_tags: [],
        launch_exe: '',
        prerequisites: null,
        languages: gogInfo.languages
      }
    }
    return info
  }

  /**
   * Loads installed data and adds it into a Map
   */
  public refreshInstalled() {
    const installedArray =
      (installedGamesStore.get('installed') as Array<InstalledInfo>) || []
    this.installedGames.clear()
    installedArray.forEach((v) => {
      this.installedGames.set(v.appName, v)
    })
  }

  public changeGameInstallPath(appName: string, newInstallPath: string) {
    const cachedGameData = this.library.get(appName)

    const installedArray =
      (installedGamesStore.get('installed') as Array<InstalledInfo>) || []

    const gameIndex = installedArray.findIndex(
      (value) => value.appName == appName
    )

    installedArray[gameIndex].install_path = newInstallPath
    cachedGameData.install.install_path = newInstallPath
    installedGamesStore.set('installed', installedArray)
  }
  public async importGame(data: GOGImportData, path: string) {
    const installInfo: InstalledInfo = {
      appName: data.appName,
      install_path: path,
      executable: '',
      install_size: prettyBytes(
        (await this.getInstallInfo(data.appName)).manifest.disk_size
      ),
      is_dlc: false,
      version: data.buildId,
      platform: data.platform
    }
    this.installedGames.set(data.appName, installInfo)
    const gameData = this.library.get(data.appName)
    gameData.install = installInfo
    gameData.is_installed = true
    this.library.set(data.appName, gameData)
    installedGamesStore.set(
      'installed',
      Array.from(this.installedGames.values())
    )
  }

  /**
   * Convert GOGGameInfo object to GameInfo
   * That way it will be easly accessible on frontend
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public gogToUnifiedInfo(info: GOGGameInfo, apiData: any): GameInfo {
    let developer: string
    let verticalCover: string
    let horizontalCover: string
    if (apiData._links) {
      developer = apiData._embedded.publisher?.name
      verticalCover = apiData._links.boxArtImage.href
      horizontalCover = `https:${info.image}.jpg`
      // horizontalCover = apiData._links.logo.href
      // horizontalCover = apiData.game.background.url_format
      //   .replace('{formatter}', '')
      //   .replace('{ext}', 'webp')
    } else {
      horizontalCover = `https:${info.image}.jpg`
      verticalCover = horizontalCover
    }

    const object: GameInfo = {
      runner: 'gog',
      store_url: `https://gog.com${info.url}`,
      developer: developer || '',
      app_name: String(info.id),
      art_logo: null,
      art_cover: horizontalCover,
      art_square: verticalCover,
      cloud_save_enabled: false,
      compatible_apps: [],
      extra: {
        about: { description: '', shortDescription: '' },
        reqs: this.createReqsArray(
          apiData,
          info.worksOn.Mac && process.platform == 'darwin'
            ? 'osx'
            : info.worksOn.Linux && process.platform == 'linux'
            ? 'linux'
            : 'windows'
        )
      },
      folder_name: '',
      install: {
        version: null,
        executable: '',
        install_path: '',
        install_size: '',
        is_dlc: false,
        platform: ''
      },
      is_game: true,
      is_installed: false,
      is_ue_asset: false,
      is_ue_plugin: false,
      is_ue_project: false,
      namespace: info.slug,
      save_folder: '',
      title: info.title,
      canRunOffline: true,
      is_mac_native: info.worksOn.Mac,
      is_linux_native: info.worksOn.Linux
    }

    return object
  }
  /**
   * Fetches data from gog about game
   * @param appName
   * @param lang optional language (falls back to english if is not supported)
   * @returns plain API response
   */
  public async get_games_data(appName: string, lang?: string) {
    const url = `https://api.gog.com/v2/games/${appName}${
      lang ?? '?locale=' + lang
    }`
    const response: AxiosResponse | null = await axios.get(url).catch(() => {
      return null
    })
    if (!response) return null

    return response.data
  }
  /**
   * Creates Array based on returned from API
   * If no recommended data is present it just stays empty
   * There always should be minumum requirements
   * @param apiData
   * @param os
   * @returns parsed data used when rendering requirements on GamePage
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public createReqsArray(apiData: any, os: 'windows' | 'linux' | 'osx') {
    const operatingSystems = apiData._embedded.supportedOperatingSystems
    let requirements = operatingSystems.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (v: { operatingSystem: { name: any } }) => v.operatingSystem.name === os
    )

    if (!requirements) return []
    else requirements = requirements.systemRequirements
    if (requirements.length == 0) return []
    const minimum = requirements[0]
    const recommended = requirements.length > 1 ? requirements[1] : null
    const returnValue = []
    for (let i = 0; i < minimum.requirements.length; i++) {
      const object = {
        title: minimum.requirements[i].name.replace(':', ''),
        minimum: minimum.requirements[i].description,
        recommended: recommended && recommended.requirements[i]?.description
      }
      if (!object.minimum) continue
      returnValue.push(object)
    }
    return returnValue
  }
  /**
   * This function can be also used with outher stores
   * This endpoint doesn't require user to be authenticated.
   * @param store Indicates a store we have game_id from, like: epic, itch, humble, gog, uplay
   * @param game_id ID of a game
   * @param etag (optional) value returned in response, works as checksum so we can check if we have up to date data
   * @returns object {isUpdated, data}, where isUpdated is true when Etags match
   */
  public static async get_gamesdb_data(
    store: string,
    game_id: string,
    etag: string
  ) {
    const url = `https://gamesdb.gog.com/platforms/${store}/external_releases/${game_id}`
    const headers = {
      'If-None-Match': etag
    }

    const response = await axios.get(url, { headers }).catch(() => {
      return null
    })
    if (!response) return { isUpdated: false, data: {} }
    const resEtag = response.headers.etag
    const isUpdated = etag == resEtag
    let data = null
    if (isUpdated) {
      data = response.data
      data.etag = resEtag
    }
    return {
      isUpdated,
      data
    }
  }
}
