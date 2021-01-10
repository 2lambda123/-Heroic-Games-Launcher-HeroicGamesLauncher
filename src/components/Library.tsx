import React from 'react'
import { Game } from '../types'
import GameCard from './UI/GameCard'

interface Props {
  library: Array<Game>
}

// TODO: Add a list options instead of Grid only
export const Library = ({ library }: Props) => {
  return (
    <>
    <div className="gameList">
     {Boolean(library.length) &&
       library.map(({title, art_square, app_name, isInstalled}: Game) => 
       <GameCard 
          cover={art_square}
          title={title}
          appName={app_name}
          isInstalled={isInstalled}
          />
        )
       }
    </div>
    </>
  )
}
