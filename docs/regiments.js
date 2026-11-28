import {trainedAs} from './unit-service.js';
import {sameTeam} from './teams.js';

// Definitions and combat roles for specialized formations. The forecast and
// authoritative order use the same modifiers so the two views stay in sync.
export const REGIMENTS = {
  ironclad: {
    name:'Harbor Ironclad', role:'Coastal siege unit', domain:'sea', era:'industrial', tech:'metallurgy',
    shipyard:true, moves:3, range:2, maxHp:125, strength:40, required:19, captures:false,
    description:'An armored ship that deals 14 extra damage to cities. Requires a shipyard.'
  },
  destroyer: {
    name:'Escort Destroyer', role:'Fleet escort unit', domain:'sea', era:'modern', tech:'radar',
    shipyard:true, moves:4, range:2, maxHp:130, strength:52, required:19, captures:false,
    description:'A fast escort with four movement points. It deals 18 extra damage to armed ships. Requires a shipyard.'
  },
  sappers: {
    name:'Siege Engineers', role:'Siege infantry unit', era:'industrial', tech:'steam',
    moves:2, range:1, maxHp:105, strength:45, required:16, captures:true,
    description:'Siege Engineers deal 18 extra damage to a walled city and can capture it.'
  },
  signals: {
    name:'Signal Corps', role:'Communications unit', era:'modern', tech:'radio',
    moves:3, range:0, maxHp:70, strength:0, required:14, captures:false,
    description:'Supports adjacent friendly formations. They deal 8 more damage against rival civilizations. Multiple signal units do not stack.'
  },
  skirmisher: {
    name:'Trail Skirmishers', role:'Light infantry unit', era:'frontier', tech:'tactics',
    moves:3, range:2, maxHp:85, strength:37, required:11, captures:false,
    description:'Light ranged infantry. Woodland and foothills cost only one movement point.'
  },
  pikes: {
    name:'Pike Guard', role:'Defensive infantry unit', era:'frontier', civic:'mutualAid',
    moves:2, range:1, maxHp:105, strength:42, required:12, captures:true,
    description:'Guards gain 14 attack damage against mounted scouts and cut their incoming charge damage by 14.'
  }
};

export function matchup(unit, defender, town, state, distance, definitions) {
  const notes=[];
  let damage=0;
  if (trainedAs(unit,'pikes') && defender?.type==='cavalry') {
    damage+=14;
    notes.push('Pikes against cavalry · +14 damage');
  }
  if (unit.type==='cavalry' && trainedAs(defender,'pikes')) {
    damage-=14;
    notes.push('Defending pike line · −14 damage');
  }
  if (trainedAs(unit,'sappers') && town?.buildings.includes('walls') && !defender) {
    damage+=18;
    notes.push('Siege engineers at the walls · +18 damage');
  }
  if (trainedAs(unit,'ironclad') && town) {
    damage+=14;
    notes.push('Coastal bombardment · +14 damage');
  }
  if (unit.type==='destroyer' && defender && definitions[defender.type].domain==='sea' && definitions[defender.type].strength>0) {
    damage+=18;
    notes.push('Escort against a warship · +18 damage');
  }
  const hasSignal=state.units.some(other=>sameTeam(state,other.seat,unit.seat) && other.type==='signals'
    && distance(other.tile,unit.tile)===1);
  if (hasSignal) {
    damage+=8;
    notes.push('Adjacent signal corps · +8 damage');
  }
  return {damage,notes};
}

export function formationChoices(state,city,units,count,nearbyTerrain) {
  const visibleRiders=state.units.some(other=>!sameTeam(state,other.seat,city.seat) && other.type==='cavalry');
  const plans=[];
  if (!count('sappers') && state.cities.some(other=>!sameTeam(state,other.seat,city.seat))) plans.push('sappers');
  if (!count('signals') && units.filter(unit=>unit.type!=='scout' && unit.maxHp>=80).length>=2) plans.push('signals');
  if (!count('pikes') && (visibleRiders || units.some(unit=>unit.type==='ranged'))) plans.push('pikes');
  if (!count('skirmisher') && nearbyTerrain.some(t=>t==='forest'||t==='hills')) plans.push('skirmisher');
  return plans;
}

// A communications team holds an adjacent position instead of trying to occupy
// its own ally’s hex. Visible rivals give front-line formations priority.
export function signalPosition(state, unit, moves, definitions, distance) {
  const allies=state.units.filter(other=>sameTeam(state,other.seat,unit.seat) && definitions[other.type].strength>0
    && definitions[other.type].domain!=='sea');
  const rivals=state.units.filter(other=>!sameTeam(state,other.seat,unit.seat));
  if (!allies.length) return null;
  const postValue=tile=>Math.max(...allies.map(ally=>{
    const range=distance(tile,ally.tile);
    const atFront=rivals.some(enemy=>distance(enemy.tile,ally.tile)<=3);
    return -Math.abs(range-1)+(atFront ? 2 : 0);
  }));
  let best=unit.tile, score=postValue(best);
  for (const tile of moves) {
    const next=postValue(tile);
    if (next>score) {best=tile;score=next;}
  }
  return best===unit.tile ? null : {type:'move',unit:unit.id,tile:best};
}
