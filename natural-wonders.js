import {seededRandom,shuffled} from './opening.js';

// Each candidate is in the named feature's local valley, shore or headland.
// Locations enter the campaign board at setup, never the public map template.
export const NATURAL_WONDERS = {
  laBrea: {
    region:'la', name:'La Brea Tar Pits',
    bonus:[0,0,2], effect:'Each adjacent worked district gains 2 science.',
    description:'Dark asphalt seeps through the city floor, preserving the bones of Ice Age animals.'
  },
  topanga: {
    region:'la', name:'Topanga Canyon',
    bonus:[0,1,1], effect:'Each adjacent worked district gains 1 production and 1 science.',
    description:'Sandstone walls rise above a winding creek in the Santa Monica Mountains.'
  },
  mountTam: {
    region:'sf', name:'Mount Tamalpais',
    bonus:[0,1,1], effect:'Each adjacent worked district gains 1 production and 1 science.',
    description:'From the summit in Marin, wooded ridges fall away toward the Pacific and the bay.'
  },
  southBayMarsh: {
    region:'sf', name:'South Bay Salt Marshes',
    bonus:[2,0,0], effect:'Each adjacent worked district gains 2 food.',
    description:'Tidal channels wind between salt-tolerant plants at the shallow southern end of the bay.'
  },
  torreyPines: {
    region:'sd', name:'Torrey Pines',
    bonus:[1,1,0], effect:'Each adjacent worked district gains 1 food and 1 production.',
    description:'Wind-shaped pines cling to sandstone bluffs above the Pacific near La Jolla.'
  },
  cabrilloTidePools: {
    region:'sd', name:'Cabrillo Tide Pools',
    bonus:[1,0,1], effect:'Each adjacent worked district gains 1 food and 1 science.',
    description:'At the foot of Point Loma, receding water leaves small rock pools alive with intertidal creatures.'
  }
};

const candidateSites={
  laBrea:['9,6','9,7','10,6','8,7'],
  topanga:['2,3','3,4','2,4','2,2'],
  mountTam:['3,1','4,2','4,0','3,0'],
  southBayMarsh:['11,11','12,11','10,11','11,10'],
  torreyPines:['4,0','5,0','6,0','5,1'],
  cabrilloTidePools:['4,8','5,9','6,8','6,7']
};

export function placeNaturalWonders(state,map) {
  const occupied=new Set(state.units.map(unit=>unit.tile));
  for(const [id,wonder] of Object.entries(NATURAL_WONDERS)){
    if(wonder.region!==map.id)continue;
    const order=shuffled(candidateSites[id],seededRandom(state.seed,'nature/'+id));
    const site=order.find(tile=>map.byId[tile] && !occupied.has(tile) && !map.byId[tile].landmark);
    state.board[site]={...state.board[site],naturalWonder:id};
  }
}

// A room client must use its seat projection for both the journal and the map.
export function discoveredNaturalWonders(view) {
  if(!view?.intel)return [];
  return view.intel.explored.filter(tile=>view.board[tile]?.naturalWonder).map(tile=>{
    const id=view.board[tile].naturalWonder;
    return {id,tile,...NATURAL_WONDERS[id]};
  });
}

export function neighboringWonders(board,map,tile,known) {
  return map.neighbors(tile).filter(id=>!known || known(id)).map(id=>board[id]?.naturalWonder).filter(Boolean);
}
