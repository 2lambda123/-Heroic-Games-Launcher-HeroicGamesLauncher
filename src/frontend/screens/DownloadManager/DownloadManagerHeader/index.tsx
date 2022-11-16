import React from 'react'
import { useTranslation } from 'react-i18next'

type Props = {
  time: 'started' | 'finished' | 'queued'
}

export default function GameListHeader({ time }: Props) {
  const { t } = useTranslation()

  const getTimeLabel = () => {
    switch (time) {
      case 'started':
        return t('download.manager.queue.start-time', 'Started at')
      case 'finished':
        return t('download.manager.queue.end-time', 'Finished at')
      case 'queued':
        return t('download.manager.queue.queue-time', 'Added at')
    }
  }

  return (
    <div className="gameListHeader">
      <span>{t('download.manager.queue.element', 'Name')}</span>
      <span>{getTimeLabel()}</span>
      <span>{t('download.manager.queue.type', 'Type')}</span>
      <span>{t('download.manager.queue.platform', 'Platform')}</span>
      <span>{t('download.manager.queue.actions', 'Action')}</span>
    </div>
  )
}
