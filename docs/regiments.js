// Definitions and combat roles for specialized formations. The forecast and
// authoritative order use the same modifiers so the two views stay in sync.
export const REGIMENTS = {
  skirmisher: {
    name:'Trail Skirmishers', role:'Light infantry unit', era:'frontier', tech:'tactics',
    moves:3, range:2, maxHp:65, strength:26, required:11, captures:false,
    description:'Light ranged infantry. Woodland and foothills cost only one movement point.'
  },
  pikes: {
    name:'Pike Guard', role:'Defensive infantry unit', era:'frontier', civic:'charter',
    moves:2, range:1, maxHp:95, strength:34, required:12, captures:true,
    description:'Guards gain 14 attack damage against mounted scouts and cut their incoming charge damage by 14.'
  }
};

export function matchup(unit, defender) {
  const notes=[];
  let damage=0;
  if (unit.type==='pikes' && defender?.type==='cavalry') {
    damage+=14;
    notes.push('Pikes against cavalry · +14 damage');
  }
  if (unit.type==='cavalry' && defender?.type==='pikes') {
    damage-=14;
    notes.push('Defending pike line · −14 damage');
  }
  return {damage,notes};
}

export function formationChoices(state,city,units,count,nearbyTerrain) {
  const visibleRiders=state.units.some(other=>other.seat!==city.seat && other.type==='cavalry');
  const plans=[];
  if (!count('pikes') && (visibleRiders || units.some(unit=>unit.type==='ranged'))) plans.push('pikes');
  if (!count('skirmisher') && nearbyTerrain.some(t=>t==='forest'||t==='hills')) plans.push('skirmisher');
  return plans;
}
