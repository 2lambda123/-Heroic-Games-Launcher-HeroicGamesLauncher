import React from 'react'

import { ContextType } from 'src/types'

const initialContext: ContextType = {
  category: 'epic',
  epicLibrary: [],
  gogLibrary: [],
  wineVersions: [],
  error: false,
  filter: 'all',
  filterText: '',
  filterPlatform: 'all',
  gameUpdates: [],
  handleCategory: () => null,
  handleFilter: () => null,
  handleGameStatus: async () => Promise.resolve(),
  handleLayout: () => null,
  handlePlatformFilter: () => null,
  handleSearch: () => null,
  layout: 'grid',
  libraryStatus: [],
  libraryTopSection: 'disabled',
  handleLibraryTopSection: () => null,
  platform: 'unknown',
  refresh: async () => Promise.resolve(),
  recentGames: [],
  refreshLibrary: async () => Promise.resolve(),
  refreshWineVersionInfo: async () => Promise.resolve(),
  refreshing: false,
  refreshingInTheBackground: true,
  isRTL: false,
  hiddenGames: {
    list: [],
    add: () => null,
    remove: () => null
  },
  showHidden: false,
  setShowHidden: () => null,
  favouriteGames: {
    list: [],
    add: () => null,
    remove: () => null
  },
  theme: '',
  setTheme: () => null
}

export default React.createContext(initialContext)
