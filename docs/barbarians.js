// A camp has no civilization seat. Neutral parties are separate from player
// units so they cannot count as a faction, own a capital, or take a player turn.
export const WILDS = {
  camp: {name:'Barbarian camp', maxHp:48, strength:12},
  lookout: {name:'Barbarian lookout', maxHp:24, strength:6}
};

function randomRank(seed, key) {
  let h=(seed>>>0)^0x6a09e667;
  for (let i=0;i<key.length;i++) h=Math.imul(h^key.charCodeAt(i),16777619);
  h=Math.imul(h^(h>>>16),0x21f0aaad);
  return (h^(h>>>15))>>>0;
}
export function wildAt(state,tile) {
  const wilds=state.barbarians;
  return wilds?.parties.find(p=>p.tile===tile) || wilds?.camps.find(c=>c.tile===tile);
}
export function seedCamps(state,map,neighbors,distance) {
  if (state.barbarians) return;
  const result=state.barbarians={camps:[],parties:[],nextPiece:1};
  const starts=state.units.map(u=>u.tile).concat(state.cities.map(c=>c.tile));
  if (!starts.length) return;
  const dry=id=>!['mountains','ocean'].includes(map.byId[id].terrain);
  const reachable=new Set(starts);
  const queue=[...starts];
  for (let i=0;i<queue.length;i++) {
    const next=[...neighbors(queue[i]),...(map.bridgesByTile?.[queue[i]]||[]).map(link=>link.to)];
    for (const id of next) if (!reachable.has(id) && dry(id)) {reachable.add(id);queue.push(id);}
  }
  const safe=id=>reachable.has(id) && dry(id) && state.board[id].owner==null &&
    starts.every(start=>distance(start,id)>=4);
  const rank=id=>randomRank(state.seed,'camp/'+map.id+'/'+id);
  const candidates=map.tiles.map(t=>t.id).filter(safe).sort((a,b)=>rank(a)-rank(b)||a.localeCompare(b));
  for (const tile of candidates) {
    if (result.camps.length===Math.min(4,state.players.length+1)) break;
    if (result.camps.some(c=>distance(c.tile,tile)<4) || wildAt(state,tile)) continue;
    const neighborsHere=neighbors(tile).filter(id=>safe(id) && !wildAt(state,id));
    if (neighborsHere.length===0) continue;
    const id='w'+result.nextPiece++;
    result.camps.push({id,tile,type:'camp',hp:48,maxHp:48});
    const site=neighborsHere.sort((a,b)=>rank(a)-rank(b))[0];
    result.parties.push({id:'w'+result.nextPiece++,tile:site,type:'lookout',hp:24,maxHp:24,campId:id});
  }
}
export function wildForecast(unit,definition,target) {
  const land=definition.domain!=='sea' && definition.captures===true;
  const hit=Math.max(1,Math.round(definition.strength*(.75+.25*unit.hp/unit.maxHp)));
  const retaliation=land ? Math.min(unit.hp,WILDS[target.type].strength) : 0;
  // Only a surviving close-combat unit can take a camp and collect its spoils.
  const camp=target.type==='camp';
  const canClear=land && unit.hp>retaliation;
  const damage=Math.max(0,Math.min(hit,target.hp-(camp&&!canClear ? 1 : 0)));
  const after=target.hp-damage;
  return {defenderType:'wild', defenderId:target.id, damage, retaliation, capture:false,
    defeated:after===0, advances:land&&after===0&&unit.hp>retaliation, attackerDefeated:unit.hp===retaliation,
    attackerHpBefore:unit.hp,attackerHpAfter:unit.hp-retaliation,
    defenderHpBefore:target.hp,defenderHpAfterHit:after,defenderHpAfter:after};
}
export function resolveWildAttack(state,unit,target,result,record) {
  unit.hp=result.attackerHpAfter;
  unit.moves=0;
  if (result.advances) unit.tile=target.tile;
  if (!unit.hp) state.units=state.units.filter(u=>u.id!==unit.id);
  const old=state.barbarians,key=target.type==='camp'?'camps':'parties';
  const updated=old[key].flatMap(piece=>piece.id!==target.id?[piece]:result.defeated?[]:[{...piece,hp:result.defenderHpAfter}]);
  state.barbarians={...old,[key]:updated};
  if (result.defeated && target.type==='camp') {
    state.players[unit.seat].capital+=12;
    record(state,unit.seat,'barbarian','Camp cleared. Your treasury gains 12 capital.',target.tile);
  } else record(state,unit.seat,'barbarian',result.defeated?'A barbarian patrol was dispersed.':'Your unit engaged the barbarians.',target.tile);
}
