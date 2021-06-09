import './index.css'

import React from 'react'

import { IpcRenderer } from 'electron'
import { WineInstallation } from 'src/types'
import { useTranslation } from 'react-i18next'

const { ipcRenderer } = window.require('electron') as {ipcRenderer: IpcRenderer}

interface Props {
  winePrefix: string
  wineVersion: WineInstallation
}

export default function Tools({ wineVersion, winePrefix }: Props) {
  const { t } = useTranslation()

  const callTools = (tool: string, exe?: string) =>
    ipcRenderer.send('callTool', {
      exe,
      prefix: winePrefix,
      tool,
      wine: wineVersion.bin
    })

  const handleRunExe = async () => {
    let exe = ''
    const { path } = await ipcRenderer.invoke('openDialog', {
      buttonLabel: t('box.select'),
      filters: [ { extensions: ['exe', 'msi'], name: 'Binaries' }],
      properties: ['openFile'],
      title: t('box.runexe.title')
    })
    if (path) {
      exe = path
      return callTools('runExe', exe)
    }
    return
  }

  function dropHandler(ev: React.DragEvent<HTMLSpanElement>) {
    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault()

    if (ev.dataTransfer.items) {
      // Use DataTransferItemList interface to access the file(s)
      // If dropped items aren't files, reject them
      if (ev.dataTransfer.items[0].kind === 'file') {
        const exe = ev.dataTransfer.items[0].getAsFile()?.path
        if (exe) {
          return callTools('runExe', exe)
        }
      }
    }
    return
  }

  function dragOverHandler(ev: React.DragEvent<HTMLSpanElement>) {
    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault()
  }

  return (
    <>
      <div className="settingsTools">
        <div className="toolsWrapper">
          <span
            data-testid="wineCFG"
            className="tools"
            onClick={() => callTools('winecfg')}>
            Winecfg
          </span>
          <span
            data-testid="wineTricks"
            className="tools"
            onClick={() => callTools('winetricks')}>
            Winetricks
          </span>
          <span
            data-testid="toolsDrag"
            draggable
            onDrop={(ev) => dropHandler(ev)}
            onDragOver={(ev) => dragOverHandler(ev)}
            className="tools drag"
            onClick={() => handleRunExe()}
          >
            {t('setting.runexe.title')}
            <br />
            <span>{t('setting.runexe.message')}</span>
          </span>
        </div>
      </div>
    </>
  )
}
