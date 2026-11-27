// A camp has no civilization seat. Neutral parties are separate from player
// units so they cannot count as a faction, own a capital, or take a player turn.
export const WILDS = {
  camp: {name:'Barbarian camp', maxHp:48, strength:12},
  lookout: {name:'Barbarian lookout', maxHp:24, strength:6},
  raider: {name:'Barbarian raiders', maxHp:44, strength:14}
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

function legalNeighbors(state,id,map,neighbors) {
  const crossings=(map.bridgesByTile?.[id]||[]).map(bridge=>bridge.to);
  return [...neighbors(id),...crossings].filter(tile=>!['ocean','mountains'].includes(map.byId[tile].terrain));
}
function free(state,tile) {
  return !state.units.some(u=>u.tile===tile) && !state.cities.some(c=>c.tile===tile) && !wildAt(state,tile);
}

// Path only through empty land. A scout seeks a lookout position or returns
// beside its home. Neither the bridge span nor the destination city is occupied.
function nextStep(state,party,goals,map,neighbors) {
  const desired=new Set(goals);
  if (desired.has(party.tile) || !desired.size) return null;
  const search=[party.tile], first=new Map([[party.tile,null]]);
  for (let i=0;i<search.length;i++) {
    const origin=search[i];
    for (const tile of legalNeighbors(state,origin,map,neighbors)) {
      if (first.has(tile) || !free(state,tile)) continue;
      const step=first.get(origin)||tile;
      if (desired.has(tile)) return step;
      first.set(tile,step);search.push(tile);
    }
  }
  return null;
}
function scoutTurn(state,party,camp,settled,map,neighbors,distance,record) {
  if (!camp) return false;
  let town=settled.find(c=>c.id===party.report);
  if (!town) {
    delete party.report;
    town=settled.filter(c=>distance(party.tile,c.tile)<=2).sort((a,b)=>distance(party.tile,a.tile)-distance(party.tile,b.tile))[0];
    if (town) {
      party.report=town.id;
      record(state,town.seat,'barbarian','A lookout spotted your city. Intercept it before it returns to camp.',party.tile);
      return true; // The player always gets an interception turn, even beside a camp.
    }
  }
  if (town) {
    if (distance(party.tile,camp.tile)<=1) {
      if(!camp.target && (camp.cooldown||0)<=state.round) {
        camp.target=town.id;camp.prepare=state.round+2;
        record(state,town.seat,'barbarian','A lookout returned to camp. A raiding party is preparing.',town.tile);
      }
      return false;
    }
    const step=nextStep(state,party,legalNeighbors(state,camp.tile,map,neighbors),map,neighbors);
    if(step)party.tile=step;
  } else {
    const nearby=legalNeighbors(state,party.tile,map,neighbors).filter(tile=>free(state,tile) && distance(tile,camp.tile)<=3);
    const history=[...(party.trail||[]),party.tile].slice(-5);
    const rank=tile=>(history.includes(tile)?-1e11:0)+distance(tile,camp.tile)*1e10+randomRank(state.seed,'patrol/'+party.id+'/'+state.round+'/'+tile);
    const step=nearby.sort((a,b)=>rank(b)-rank(a))[0];
    if(step){party.tile=step;party.trail=history;}
  }
  return true;
}
function raidTurn(state,party,town,defs,map,neighbors,distance,record) {
  if (!town) return false;
  if (distance(party.tile,town.tile)<=1) {
    const guard=state.units.some(u=>u.seat===town.seat && defs[u.type]?.strength>0 && distance(u.tile,town.tile)<=1);
    if (guard || town.buildings.includes('walls')) {
      record(state,town.seat,'barbarian','The city defenses repelled the raid.',town.tile);
    } else {
      state.players[town.seat].capital=Math.max(0,state.players[town.seat].capital-3);
      town.hp=Math.max(1,town.hp-12);
      record(state,town.seat,'barbarian','Raiders struck the city and looted up to 3 capital.',town.tile);
    }
    return false;
  }
  const foe=state.units.find(u=>defs[u.type]?.strength>0 && defs[u.type]?.domain!=='sea' && u.seat===town.seat && distance(u.tile,party.tile)===1);
  if (foe) {
    foe.hp=Math.max(0,foe.hp-14);
    party.hp-=Math.max(4,Math.round(defs[foe.type].strength*.4));
    if(!foe.hp)state.units=state.units.filter(u=>u.id!==foe.id);
    record(state,foe.seat,'barbarian','Barbarian raiders clashed with your military unit.',foe.tile);
    return party.hp>0;
  }
  const step=nextStep(state,party,legalNeighbors(state,town.tile,map,neighbors),map,neighbors);
  if(step)party.tile=step;
  return true;
}
export function barbarianRound(state,map,neighbors,distance,defs,record) {
  if (!state.barbarians) return;
  const old=state.barbarians;
  // No retroactive raids on a new city, including a player who delays founding.
  const settledSince={};
  for(const city of state.cities)settledSince[city.id]=old.settledSince?.[city.id]??state.round;
  const settled=state.cities.filter(c=>state.round-settledSince[c.id]>=3);
  const wilds=state.barbarians={nextPiece:old.nextPiece??1,settledSince,camps:old.camps.map(c=>({...c})),parties:old.parties.map(p=>({...p}))};
  // Resolve one neutral phase per completed round, independent of seat count.
  for (const party of [...wilds.parties]) {
    const camp=wilds.camps.find(c=>c.id===party.campId);
    const town=settled.find(c=>c.id===party.target);
    const stays=party.type==='lookout'
      ? scoutTurn(state,party,camp,settled,map,neighbors,distance,record)
      : raidTurn(state,party,town,defs,map,neighbors,distance,record);
    if (!stays) wilds.parties=wilds.parties.filter(p=>p.id!==party.id);
  }
  for (const camp of wilds.camps) {
    if(!camp.target && (camp.cooldown||0)>state.round)continue;
    if(camp.target && !settled.some(city=>city.id===camp.target)) {delete camp.target;delete camp.prepare;}
    const raiding=Boolean(camp.target), type=raiding?'raider':'lookout';
    if((raiding && state.round<camp.prepare) || wilds.parties.some(p=>p.campId===camp.id))continue;
    const tile=legalNeighbors(state,camp.tile,map,neighbors).find(id=>free(state,id));
    if(!tile)continue;
    const maxHp=WILDS[type].maxHp;
    wilds.parties.push({id:'w'+wilds.nextPiece++,type,campId:camp.id,tile,hp:maxHp,maxHp,...(raiding?{target:camp.target}:{})});
    if(raiding) {delete camp.target;delete camp.prepare;camp.cooldown=state.round+5;}
  }
}
