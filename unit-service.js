import {seatMayOrder} from './team-turns.js';

const specializations={
  cutter:[{to:'frigate',cost:13},{to:'ironclad',cost:15}],
  frigate:[{to:'destroyer',cost:14}],
  ironclad:[{to:'destroyer',cost:13}],
  scout:[{to:'skirmisher',cost:7},{to:'cavalry',cost:9}],
  melee:[{to:'pikes',cost:7},{to:'sappers',cost:11}],
  ranged:[{to:'skirmisher',cost:7}],
  pikes:[{to:'riflemen',cost:9}],
  skirmisher:[{to:'riflemen',cost:10},{to:'signals',cost:12}],
  sappers:[{to:'artillery',cost:13}]
};
// Existing save files identify formations by type. Derive their service paths from
// the current unit catalogue, so veterans loaded from older campaigns retain them.
export function advancementRoutes(type, definitions) {
  const source=definitions[type];
  const legacy=source?.upgrade ? [{to:source.upgrade,cost:source.upgradeCost}] : [];
  return [...legacy,...(specializations[type] || [])];
}

export function promotionOutcome(unit, source, destination, fasterShips) {
  const veteranBonus=unit.maxHp-source.maxHp;
  const maxHp=destination.maxHp+veteranBonus;
  return {
    maxHp,hp:Math.max(1,Math.floor(unit.hp/unit.maxHp*maxHp)),
    moves:0,maxMoves:destination.moves+Number(destination.domain==='sea' && fasterShips),
    strength:destination.strength,range:destination.range
  };
}

export function recoveryAt(state,unit,definition,distance) {
  const sea=definition.domain==='sea';
  const city=state.cities.find(c=>c.seat===unit.seat && c.tile===unit.tile);
  const harbor=sea && state.cities.find(c=>c.seat===unit.seat && c.portTile && distance(c.portTile,unit.tile)<=1);
  const field=definition.strength>0 && !sea && state.board[unit.tile]?.owner===unit.seat &&
    state.players[unit.seat].technologies?.includes('fieldMedicine');
  const station=city?'city':harbor?'harbor':field?'field':'none';
  const rate=city || harbor ? 12 : field ? 6 : 0;
  const owner=state.board[unit.tile]?.owner;
  const canRestHere=sea ? Boolean(city || harbor) : owner==null || owner===unit.seat;
  const missing=unit.maxHp-unit.hp;
  const restBonus=unit.resting && canRestHere ? 4 : 0;
  const gain=Math.min(missing,rate+restBonus);
  const restGain=Math.min(missing,rate+(canRestHere?4:0));
  const canRest=restGain>gain && unit.moves>0 && seatMayOrder(state,unit.seat);
  return {station,rate,gain,hpAfter:unit.hp+gain,place:city?.name || harbor?.name || null,canRest,
    resting:Boolean(unit.resting),restGain};
}

export function nearestServiceStation(state,unit,definition,distance) {
  const sea=definition.domain==='sea';
  let nearest=null;
  for (const city of state.cities) {
    if (city.seat!==unit.seat || (sea && !city.portTile)) continue;
    const tile=sea ? city.portTile : city.tile;
    const hexes=distance(unit.tile,tile);
    if (!nearest || hexes<nearest.hexes)
      nearest={type:sea?'harbor':'city',tile,name:city.name,hexes};
  }
  return nearest;
}
