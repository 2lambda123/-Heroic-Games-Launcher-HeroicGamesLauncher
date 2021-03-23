import './index.css'

import React, { lazy } from 'react'

import { NavLink } from 'react-router-dom'
import { createNewWindow } from 'src/helpers'
import { useTranslation } from 'react-i18next'

const SearchBar = lazy(() => import('./components/SearchBar'))
const UserSelector = lazy(() => import('./components/UserSelector'))

export default function NavBar() {
  const { t, i18n } = useTranslation()
  let lang = i18n.language
  if (i18n.language === 'pt') {
    lang = 'pt-BR'
  }
  const epicStore = `https://www.epicgames.com/store/${lang}/`
  return (
    <div className="NavBar">
      <div className="Links">
        <NavLink
          activeStyle={{ color: '#FFA800', fontWeight: 500 }}
          isActive={(match, location) => {
            if (match) {
              return true
            }
            return location.pathname.includes('gameconfig')
          }}
          exact
          to="/"
        >
          {t('Library')}
        </NavLink>
        <NavLink
          activeStyle={{ color: '#FFA800', fontWeight: 500 }}
          isActive={(match, location) => location.pathname.includes('settings')}
          to={{
            pathname: '/settings/default/general',
          }}
        >
          {t('Settings')}
        </NavLink>
        <a
          style={{ cursor: 'pointer' }}
          onClick={() => createNewWindow(epicStore)}
        >
          {t('store', 'Store')}
        </a>
      </div>
      <SearchBar />
      <UserSelector />
    </div>
  )
}
