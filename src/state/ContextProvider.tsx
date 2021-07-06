import React from 'react'

import { ContextType } from 'src/types'

const initialContext: ContextType = {
  category: 'games',
  data: [],
  error: false,
  filter: 'all',
  gameUpdates: [],
  handleCategory: () => null,
  handleFilter: () => null,
  handleGameStatus: () => Promise.resolve(),
  handleLayout: () => null,
  handleSearch: () => null,
  layout: 'grid',
  libraryStatus: [],
  platform: 'unknown',
  refresh: () => Promise.resolve(),
  refreshLibrary: () => Promise.resolve(),
  refreshing: false
}

export default React.createContext(initialContext)
