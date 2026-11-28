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
  },
  ballonaWetlands: {
    region:'la', name:'Ballona Wetlands',
    bonus:[1,0,1], effect:'Each adjacent worked district gains 1 food and 1 science.',
    description:'Near the mouth of Ballona Creek, salt marsh and coastal dunes shelter birds along Santa Monica Bay.'
  },
  muirWoods: {
    region:'sf', name:'Muir Woods',
    bonus:[0,0,2], effect:'Each adjacent worked district gains 2 science.',
    description:'Old-growth coast redwoods shade Redwood Creek in a sheltered canyon in Marin County.'
  },
  missionGorge: {
    region:'sd', name:'Mission Gorge',
    bonus:[0,1,1], effect:'Each adjacent worked district gains 1 production and 1 science.',
    description:'The San Diego River cuts through steep rock walls between the ridges of Mission Trails Regional Park.'
  }
};

const candidateSites={
  laBrea:['9,6','9,7','10,6','8,7'],
  topanga:['2,3','3,4','2,4','2,2'],
  mountTam:['3,1','4,2','4,0','3,0'],
  southBayMarsh:['11,11','12,11','10,11','11,10'],
  torreyPines:['4,0','5,0','6,0','5,1'],
  cabrilloTidePools:['4,8','5,9','6,8','6,7'],
  ballonaWetlands:['5,9','6,9','6,10','7,10'],
  muirWoods:['4,2','3,1','3,0','4,0'],
  missionGorge:['12,2','11,1','12,3','13,3']
};

const siteTerrain={
  ballonaWetlands:['coast','plains'],
  muirWoods:['forest','hills'],
  missionGorge:['hills','forest']
};

// On compact charts the San Diego River and Mission Valley Lake can inundate
// every surveyed ridge. The woodland on their southern bank stays in the same valley.
const alternateSites={missionGorge:['11,5']};

export function placeNaturalWonders(state,map) {
  const occupied=new Set(state.units.map(unit=>unit.tile));
  const homeRings=new Set([...occupied].flatMap(tile=>map.neighbors(tile)));
  const protectedHexes=new Set();
  const placed=new Set(Object.values(state.board).map(cell=>cell.naturalWonder).filter(Boolean));
  for(const [id,wonder] of Object.entries(NATURAL_WONDERS)){
    if(wonder.region!==map.id || placed.has(id))continue;
    const candidates=map.anchorId ? candidateSites[id].map(map.anchorId) : candidateSites[id];
    const order=shuffled(candidates,seededRandom(state.seed,'nature/'+id));
    function vacant(tile) {
      const ground=map.byId[tile], cell=state.board[tile];
      return ground && cell && !ground.landmark && !occupied.has(tile) && !cell.naturalWonder && !protectedHexes.has(tile);
    }
    const parcels=tile=>map.neighbors(tile).filter(next=>vacant(next) && !['ocean','mountains'].includes(map.byId[next].terrain));
    const available=tile=>vacant(tile) && (!siteTerrain[id] || siteTerrain[id].includes(map.byId[tile].terrain)) && parcels(tile).length>0;
    // A starting unit or a river can occupy a survey center. Stay within the
    // same locality rather than moving the landscape to an unrelated district.
    const alternates=(alternateSites[id] || []).map(tile=>map.anchorId ? map.anchorId(tile) : tile);
    const site=order.find(available) || order.flatMap(tile=>map.neighbors(tile)).find(available) || alternates.find(available);
    if(!site)continue;
    state.board[site]={...state.board[site],naturalWonder:id};
    protectedHexes.add(site);
    // Reserve one distinct construction parcel through setup. Prefer land away
    // from the settlers' starting resource rings. Cities can use it normally once play begins.
    const choices=parcels(site);
    protectedHexes.add(choices.find(tile=>!homeRings.has(tile)) || choices[0]);
  }
  return protectedHexes;
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
