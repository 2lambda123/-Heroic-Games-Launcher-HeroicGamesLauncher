import './index.css'

import React, { ChangeEvent, useCallback, useContext } from 'react'

import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import {
  InfoBox,
  ToggleSwitch,
  SelectField,
  TextInputField,
  TextInputWithIconField
} from 'frontend/components/UI'
import CreateNewFolder from '@mui/icons-material/CreateNewFolder'
import { EnviromentVariable, WrapperVariable, Runner } from 'common/types'
import { Path } from 'frontend/types'
import Backspace from '@mui/icons-material/Backspace'
import { getGameInfo } from 'frontend/helpers'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { faFolderOpen } from '@fortawesome/free-solid-svg-icons'
import { ipcRenderer } from 'frontend/helpers'
import {
  ColumnProps,
  TableInput
} from 'frontend/components/UI/TwoColTableInput'
import EnvVariablesTable from './EnvVariablesTable'

interface Props {
  audioFix: boolean
  isDefault: boolean
  isMacNative: boolean
  isLinuxNative: boolean
  languageCode: string
  launcherArgs: string
  canRunOffline: boolean
  offlineMode: boolean
  enviromentOptions: EnviromentVariable[]
  wrapperOptions: WrapperVariable[]
  primeRun: boolean
  addDesktopShortcuts: boolean
  addGamesToStartMenu: boolean
  discordRPC: boolean
  setLanguageCode: (value: string) => void
  setLauncherArgs: (value: string) => void
  setEnviromentOptions: (value: EnviromentVariable[]) => void
  setWrapperOptions: (value: WrapperVariable[]) => void
  setMaxRecentGames: (value: number) => void
  setDefaultSteamPath: (value: string) => void
  setTargetExe: (value: string) => void
  showFps: boolean
  showMangohud: boolean
  maxRecentGames: number
  defaultSteamPath: string
  toggleAudioFix: () => void
  toggleFps: () => void
  toggleMangoHud: () => void
  toggleOffline: () => void
  togglePrimeRun: () => void
  toggleUseGameMode: () => void
  toggleEacRuntime: () => void
  toggleAddDesktopShortcuts: () => void
  toggleAddGamesToStartMenu: () => void
  toggleDiscordRPC: () => void
  targetExe: string
  useGameMode: boolean
  eacRuntime: boolean
  useSteamRuntime: boolean
  toggleUseSteamRuntime: () => void
  isProton: boolean
  appName: string
  runner: Runner
}

export default function OtherSettings({
  enviromentOptions,
  setEnviromentOptions,
  wrapperOptions,
  setWrapperOptions,
  useGameMode,
  toggleUseGameMode,
  showFps,
  toggleFps,
  canRunOffline,
  offlineMode,
  toggleOffline,
  languageCode,
  setLanguageCode,
  launcherArgs,
  setLauncherArgs,
  audioFix,
  toggleAudioFix,
  showMangohud,
  toggleMangoHud,
  isDefault,
  primeRun,
  togglePrimeRun,
  setMaxRecentGames,
  addDesktopShortcuts,
  addGamesToStartMenu,
  toggleAddDesktopShortcuts,
  toggleAddGamesToStartMenu,
  discordRPC,
  toggleDiscordRPC,
  maxRecentGames,
  setTargetExe,
  targetExe,
  isMacNative,
  isLinuxNative,
  toggleUseSteamRuntime,
  useSteamRuntime,
  isProton,
  appName,
  setDefaultSteamPath,
  defaultSteamPath,
  toggleEacRuntime,
  eacRuntime,
  runner
}: Props) {
  const handleEnviromentVariables = (variables: EnviromentVariable[]) => {
    setEnviromentOptions([...variables])
  }
  const handleWrapperVariables = (values: ColumnProps[]) => {
    const wrappers = [] as WrapperVariable[]
    values.forEach((value) =>
      wrappers.push({
        exe: value.key,
        args: value.value.trim()
      })
    )
    setWrapperOptions([...wrappers])
  }
  const getWrapperVariables = () => {
    const columns: ColumnProps[] = []
    wrapperOptions.forEach((wrapper) =>
      columns.push({ key: wrapper.exe, value: wrapper.args })
    )
    return columns
  }
  const handleLauncherArgs = (event: ChangeEvent<HTMLInputElement>) =>
    setLauncherArgs(event.currentTarget.value)
  const handleLanguageCode = (event: ChangeEvent<HTMLInputElement>) =>
    setLanguageCode(event.currentTarget.value)
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const isWin = platform === 'win32'
  const isLinux = platform === 'linux'
  const supportsShortcuts = isWin || isLinux
  const shouldRenderFpsOption = !isMacNative && !isWin && !isLinuxNative
  const showSteamRuntime = isLinuxNative || isProton

  const launcherArgs_info = (
    <InfoBox text="infobox.help">
      <span>
        {t('help.other.part4')}
        <strong>{t('help.other.part5')}</strong>
        {t('help.other.part6')}
        <strong>{` -nolauncher `}</strong>
        {t('help.other.part7')}
      </span>
    </InfoBox>
  )

  const languageInfo = (
    <InfoBox text="infobox.help">
      {t(
        'help.game_language.fallback',
        "Leave blank to use Heroic's language."
      )}
      <br />
      {t(
        'help.game_language.in_game_config',
        'Not all games support this configuration, some have in-game language setting.'
      )}
      <br />
      {t(
        'help.game_language.valid_codes',
        'Valid language codes are game-dependant.'
      )}
    </InfoBox>
  )

  const wrapperInfo = (
    <InfoBox text="infobox.help">
      {t(
        'options.wrapper.arguments_example',
        'Arguments example: --arg; --extra-file="file-path/ with/spaces"'
      )}
    </InfoBox>
  )

  const handleTargetExe = useCallback(async () => {
    if (!targetExe.length) {
      const gameinfo = await getGameInfo(appName, runner)

      ipcRenderer
        .invoke('openDialog', {
          buttonLabel: t('box.select.button', 'Select'),
          properties: ['openFile'],
          title: t('box.select.exe', 'Select EXE'),
          defaultPath: gameinfo.install.install_path
        })
        .then(({ path }: Path) => setTargetExe(path || targetExe))
    }
    setTargetExe('')
  }, [targetExe])

  async function handleGameMode() {
    if (useGameMode && eacRuntime) {
      const isFlatpak = await ipcRenderer.invoke('isFlatpak')
      if (isFlatpak) {
        const { response } = await ipcRenderer.invoke('openMessageBox', {
          message: t(
            'settings.gameMode.eacRuntimeEnabled.message',
            "The EAC runtime is enabled, which won't function correctly without GameMode. Do you want to disable the EAC Runtime and GameMode?"
          ),
          title: t(
            'settings.gameMode.eacRuntimeEnabled.title',
            'EAC runtime enabled'
          ),
          buttons: [t('box.yes'), t('box.no')]
        })
        if (response === 1) {
          return
        }
        toggleEacRuntime()
      }
    }
    toggleUseGameMode()
  }

  return (
    <>
      <h3 className="settingSubheader">{t('settings.navbar.other')}</h3>
      {!isDefault && (
        <TextInputWithIconField
          label={t(
            'setting.change-target-exe',
            'Select an alternative EXE to run'
          )}
          htmlId="setinstallpath"
          value={targetExe.replaceAll("'", '')}
          placeholder={targetExe || t('box.select.exe', 'Select EXE...')}
          onChange={(event) => setTargetExe(event.target.value)}
          icon={
            !targetExe.length ? (
              <CreateNewFolder data-testid="setinstallpathbutton" />
            ) : (
              <Backspace data-testid="setEpicSyncPathBackspace" />
            )
          }
          onIconClick={handleTargetExe}
        />
      )}

      {shouldRenderFpsOption && (
        <ToggleSwitch
          htmlId="showFPS"
          value={showFps}
          handleChange={toggleFps}
          title={t('setting.showfps')}
        />
      )}
      {isLinux && (
        <>
          <div className="toggleRow">
            <ToggleSwitch
              htmlId="gamemode"
              value={useGameMode}
              handleChange={handleGameMode}
              title={t('setting.gamemode')}
            />

            <FontAwesomeIcon
              className="helpIcon"
              icon={faCircleInfo}
              title={t(
                'help.gamemode',
                'Feral GameMode applies automatic and temporary tweaks to the system when running games. Enabling may improve performance.'
              )}
            />
          </div>

          <div className="toggleRow">
            <ToggleSwitch
              htmlId="primerun"
              value={primeRun}
              handleChange={togglePrimeRun}
              title={t('setting.primerun', 'Use Dedicated Graphics Card')}
            />

            <FontAwesomeIcon
              className="helpIcon"
              icon={faCircleInfo}
              title={t(
                'help.primerun',
                'Use dedicated graphics card to render game on multi-GPU systems. Only needed on gaming laptops or desktops that use a headless GPU for rendering (NVIDIA Optimus, AMD CrossFire)'
              )}
            />
          </div>

          <ToggleSwitch
            htmlId="audiofix"
            value={audioFix}
            handleChange={toggleAudioFix}
            title={t('setting.audiofix')}
          />

          <div className="toggleRow">
            <ToggleSwitch
              htmlId="mongohud"
              value={showMangohud}
              handleChange={toggleMangoHud}
              title={t('setting.mangohud')}
            />

            <FontAwesomeIcon
              className="helpIcon"
              icon={faCircleInfo}
              title={t(
                'help.mangohud',
                'MangoHUD is an overlay that displays and monitors FPS, temperatures, CPU/GPU load and other system resources.'
              )}
            />
          </div>

          {showSteamRuntime && (
            <div className="toggleRow">
              <ToggleSwitch
                htmlId="steamruntime"
                value={useSteamRuntime}
                handleChange={toggleUseSteamRuntime}
                title={t('setting.steamruntime', 'Use Steam Runtime')}
              />

              <FontAwesomeIcon
                className="helpIcon"
                icon={faCircleInfo}
                title={t(
                  'help.steamruntime',
                  'Custom libraries provided by Steam to help run Linux and Windows (Proton) games. Enabling might improve compatibility.'
                )}
              />
            </div>
          )}
        </>
      )}
      {!isDefault && canRunOffline && (
        <ToggleSwitch
          htmlId="offlinemode"
          value={offlineMode}
          handleChange={toggleOffline}
          title={t('setting.offlinemode')}
        />
      )}
      {supportsShortcuts && isDefault && (
        <>
          <ToggleSwitch
            htmlId="shortcutsToDesktop"
            value={addDesktopShortcuts}
            handleChange={toggleAddDesktopShortcuts}
            title={t(
              'setting.adddesktopshortcuts',
              'Add desktop shortcuts automatically'
            )}
          />
          <ToggleSwitch
            htmlId="shortcutsToMenu"
            value={addGamesToStartMenu}
            handleChange={toggleAddGamesToStartMenu}
            title={t(
              'setting.addgamestostartmenu',
              'Add games to start menu automatically'
            )}
          />
        </>
      )}
      {isDefault && (
        <ToggleSwitch
          htmlId="discordRPC"
          value={discordRPC}
          handleChange={toggleDiscordRPC}
          title={t('setting.discordRPC', 'Enable Discord Rich Presence')}
        />
      )}
      {isDefault && (
        <SelectField
          label={t('setting.maxRecentGames', 'Recent Games to Show')}
          htmlId="setMaxRecentGames"
          extraClass="smaller"
          onChange={(event) => setMaxRecentGames(Number(event.target.value))}
          value={maxRecentGames.toString()}
        >
          {Array.from(Array(10).keys()).map((n) => (
            <option key={n + 1}>{n + 1}</option>
          ))}
        </SelectField>
      )}
      {isDefault && (
        <TextInputWithIconField
          label={t('setting.default-steam-path', 'Default Steam path')}
          htmlId="default_steam_path"
          value={defaultSteamPath?.replaceAll("'", '')}
          placeholder={defaultSteamPath}
          onChange={(event) => setDefaultSteamPath(event.target.value)}
          icon={
            <FontAwesomeIcon
              icon={faFolderOpen}
              data-testid="setsteampathbutton"
            />
          }
          onIconClick={async () =>
            ipcRenderer
              .invoke('openDialog', {
                buttonLabel: t('box.choose'),
                properties: ['openDirectory'],
                title: t('box.default-steam-path', 'Steam path.'),
                defaultPath: defaultSteamPath
              })
              .then(({ path }: Path) =>
                setDefaultSteamPath(path ? `${path}` : defaultSteamPath)
              )
          }
        />
      )}
      {!isWin && (
        <EnvVariablesTable
          environmentVariables={enviromentOptions}
          handleEnviromentVariables={handleEnviromentVariables}
        />
      )}
      {!isWin && (
        <TableInput
          label={t('options.wrapper.title', 'Wrapper command:')}
          htmlId={'wrapperOptions'}
          header={{
            key: t('options.wrapper.exe', 'Wrapper'),
            value: t('options.wrapper.args', 'Arguments')
          }}
          rows={getWrapperVariables()}
          fullFills={{ key: true, value: false }}
          onChange={handleWrapperVariables}
          inputPlaceHolder={{
            key: t('options.wrapper.placeHolderKey', 'New Wrapper'),
            value: t('options.wrapper.placeHolderValue', 'Wrapper Arguments')
          }}
          warning={
            <span className="warning">
              {`${t(
                'options.quote-args-with-spaces',
                'Warning: Make sure to quote args with spaces! E.g.: "path/with spaces/"'
              )}`}
            </span>
          }
          afterInput={wrapperInfo}
        />
      )}
      {!isDefault && (
        <TextInputField
          label={t('options.gameargs.title')}
          htmlId="launcherArgs"
          placeholder={t('options.gameargs.placeholder')}
          value={launcherArgs}
          onChange={handleLauncherArgs}
          afterInput={launcherArgs_info}
        />
      )}
      {!isDefault && (
        <TextInputField
          label={t(
            'setting.prefered_language',
            'Prefered Language (Language Code)'
          )}
          htmlId="prefered-language"
          placeholder={t(
            'placeholder.prefered_language',
            '2-char code (i.e.: "en" or "fr")'
          )}
          value={languageCode}
          onChange={handleLanguageCode}
          afterInput={languageInfo}
        />
      )}
    </>
  )
}
