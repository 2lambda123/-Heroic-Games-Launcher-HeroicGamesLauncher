import React from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { defaultWineVersion } from '..'
import useSetting from 'frontend/hooks/useSetting'
import { configStore } from 'frontend/helpers/electronStores'
import { ToggleSwitch } from 'frontend/components/UI'

const AutoDXVK = () => {
  const { t } = useTranslation()
  const [autoInstallDxvk, setAutoInstallDxak] = useSetting(
    'autoInstallDxvk',
    false
  )
  const home = configStore.get('userHome', '')
  const [winePrefix] = useSetting('winePrefix', `${home}/.wine`)
  const [wineVersion] = useSetting('wineVersion', defaultWineVersion)
  const [installingDxvk, setInstallingDxvk] = React.useState(false)

  const dontRender =
    wineVersion.type === 'proton' || wineVersion.type === 'crossover'

  if (dontRender) {
    return <></>
  }

  const handleAutoInstallDxvk = async () => {
    const action = autoInstallDxvk ? 'restore' : 'backup'
    setInstallingDxvk(true)
    await window.api.toggleDXVK({
      winePrefix,
      winePath: wineVersion.bin,
      action
    })
    setInstallingDxvk(false)
    return setAutoInstallDxak(!autoInstallDxvk)
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="autodxvk"
        value={autoInstallDxvk}
        handleChange={handleAutoInstallDxvk}
        title={t('setting.autodxvk', 'Auto Install/Update DXVK on Prefix')}
        disabled={installingDxvk}
      />

      <FontAwesomeIcon
        className="helpIcon"
        icon={faCircleInfo}
        title={t(
          'help.dxvk',
          'DXVK is a Vulkan-based translational layer for DirectX 9, 10 and 11 games. Enabling may improve compatibility. Might cause issues especially for older DirectX games.'
        )}
      />
    </div>
  )
}

export default AutoDXVK
