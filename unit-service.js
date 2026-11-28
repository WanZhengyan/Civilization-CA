import {seatMayOrder} from './team-turns.js';

const specializations={
  cutter:[{to:'frigate',cost:13},{to:'ironclad',cost:15}],
  frigate:[{to:'destroyer',cost:14}],
  ironclad:[{to:'destroyer',cost:13}],
  scout:[{to:'skirmisher',cost:7},{to:'cavalry',cost:9}],
  melee:[{to:'pikes',cost:7},{to:'sappers',cost:11}],
  ranged:[{to:'skirmisher',cost:7}],
  pikes:[{to:'riflemen',cost:9}],
  skirmisher:[{to:'artillery',cost:13}],
  sappers:[{to:'armor',cost:16}]
};
// Existing save files identify formations by type. Derive their service paths from
// the current unit catalogue, so veterans loaded from older campaigns retain them.
export function advancementRoutes(type, definitions) {
  const source=definitions[type];
  const legacy=source?.upgrade ? [{to:source.upgrade,cost:source.upgradeCost}] : [];
  return [...legacy,...(specializations[type] || [])];
}

// A formation keeps the schools it has actually served in. A newly trained
// rifle company does not gain a pike guard's training simply by sharing its type.
export function trainedAs(unit,type) {
  return unit?.type===type || Boolean(unit?.serviceHistory?.includes(type));
}

export const serviceSpecialties={
  scout:'Survey resources, chart routes and carry out field expeditions.',
  cavalry:'With Topographic Mapping, foothills cost one movement point.',
  pikes:'Gain 14 attack and defense against mounted scouts.',
  skirmisher:'Woodland and foothills cost one movement point.',
  sappers:'Gain 18 attack against walled cities.',
  ironclad:'Gain 14 attack against cities.',
  destroyer:'Gain 18 attack against armed ships.'
};

export function promotionOutcome(unit, source, destination, fasterShips) {
  const veteranBonus=unit.maxHp-source.maxHp;
  const maxHp=destination.maxHp+Math.max(0,veteranBonus);
  return {
    maxHp,hp:Math.max(1,Math.floor(unit.hp/unit.maxHp*maxHp)),
    moves:0,maxMoves:destination.moves+Number(destination.domain==='sea' && fasterShips),
    strength:destination.strength,range:destination.range
  };
}

// Previous editions stored each unit's health and speed on its game piece.
const previousHealth={artillery:75,skirmisher:65,sappers:90,pikes:95,destroyer:90};
export function modernizeFormations(state,definitions) {
  if (!state || state.formationVersion===1) return state;
  const formerNames=new Map(Object.entries(definitions).map(([id,def])=>[def.name,id]));
  const history=new Map();
  for (const event of state.log || []) {
    if (event.type!=='upgrade' || !event.unit || !event.text) continue;
    const former=formerNames.get(event.text.split(' upgraded to ')[0]);
    if(former) history.set(event.unit,[...(history.get(event.unit) || []),former]);
  }
  const units=state.units.map(unit=>{
    const def=definitions[unit.type], oldHp=previousHealth[unit.type];
    if (!def) return unit;
    const previous=history.get(unit.id) || [];
    if(unit.fieldNotes?.length || state.players[unit.seat]?.fieldCrews?.[unit.id]) previous.push('scout');
    const healthChange=oldHp && (unit.maxHp===oldHp || unit.maxHp===oldHp+20) ? def.maxHp-oldHp : 0;
    const maxMoves=Math.max(unit.maxMoves,def.moves+Number(def.domain==='sea' && state.players[unit.seat]?.technologies?.includes('hydrography')===true));
    if(!previous.length && !healthChange && maxMoves===unit.maxMoves) return unit;
    const maxHp=unit.maxHp+healthChange;
    return {...unit,maxHp,maxMoves,hp:Math.max(1,Math.round(unit.hp/unit.maxHp*maxHp)),
      ...(previous.length && {serviceHistory:[...new Set([...(unit.serviceHistory || []),...previous])].filter(type=>type!==unit.type)})};
  });
  return {...state,units,formationVersion:1};
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
