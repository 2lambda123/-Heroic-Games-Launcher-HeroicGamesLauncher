import React, { useContext, useState } from 'react'
import GameContext from '../../GameContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { GameSubMenu } from '../..'
import { faEllipsisV } from '@fortawesome/free-solid-svg-icons'
import { GameInfo } from 'common/types'
import {
  Dialog,
  DialogContent,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import GameRequirements from '../../GameRequirements'
import { useTranslation } from 'react-i18next'
import GameChangeLog from '../../GameChangeLog'
import ModifyInstallModal from '../../ModifyInstallModal'

interface Props {
  gameInfo: GameInfo
  handleUpdate: () => void
}

const DotsMenu = ({ gameInfo, handleUpdate }: Props) => {
  const { t } = useTranslation('gamepage')
  const { appName, gameExtraInfo, gameInstallInfo, is } =
    useContext(GameContext)
  const [showRequirements, setShowRequirements] = useState(false)
  const [showChangelog, setShowChangelog] = useState(false)
  const [showModifyInstallModal, setShowModifyInstallModal] = useState(false)

  const { is_installed, title } = gameInfo

  const hasRequirements = (gameExtraInfo?.reqs || []).length > 0

  return (
    <>
      <div className="game-actions">
        <button className="toggle">
          <FontAwesomeIcon icon={faEllipsisV} />
        </button>

        <GameSubMenu
          appName={appName}
          isInstalled={is_installed}
          title={title}
          storeUrl={
            gameExtraInfo?.storeUrl ||
            ('store_url' in gameInfo && gameInfo.store_url !== undefined
              ? gameInfo.store_url
              : '')
          }
          changelog={gameExtraInfo?.changelog}
          runner={gameInfo.runner}
          handleUpdate={handleUpdate}
          handleChangeLog={() => setShowChangelog(true)}
          disableUpdate={is.installing || is.updating}
          onShowRequirements={
            hasRequirements ? () => setShowRequirements(true) : undefined
          }
          onShowModifyInstall={() => setShowModifyInstallModal(true)}
        />
      </div>

      {showRequirements && (
        <Dialog showCloseButton onClose={() => setShowRequirements(false)}>
          <DialogHeader onClose={() => setShowRequirements(false)}>
            <div>{t('game.requirements', 'Requirements')}</div>
          </DialogHeader>
          <DialogContent>
            <GameRequirements reqs={gameExtraInfo?.reqs} />
          </DialogContent>
        </Dialog>
      )}

      {showModifyInstallModal && (
        <Dialog
          showCloseButton
          onClose={() => setShowModifyInstallModal(false)}
        >
          <ModifyInstallModal
            gameInfo={gameInfo}
            gameInstallInfo={gameInstallInfo}
            onClose={() => setShowModifyInstallModal(false)}
          />
        </Dialog>
      )}

      {gameExtraInfo?.changelog && showChangelog && (
        <GameChangeLog
          title={gameInfo.title}
          changelog={gameExtraInfo.changelog}
          backdropClick={() => {
            setShowChangelog(false)
          }}
        />
      )}
    </>
  )
}

export default DotsMenu