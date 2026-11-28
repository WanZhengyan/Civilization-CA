// Independent streams keep a new resource or map roll from changing seat assignments.
export function seededRandom(seed, stream) {
  let state = seed >>> 0;
  for (const char of stream) state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ state >>> 15, state | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}
export function campaignSeed(value) {
  if (value === undefined) return crypto.getRandomValues(new Uint32Array(1))[0];
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('Choose an unsigned 32-bit campaign seed.');
  return value;
}
export function shuffled(values, random) {
  const items = [...values];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
const habitable = terrain => terrain !== 'mountains' && terrain !== 'ocean';
const fertile = terrain => ['urban','plains','coast'].includes(terrain);

export function selectStarts(map, count, seed, neighbors, distance) {
  // Use the same crossings as land movement. An island without a bridge
  // cannot host a capital that every faction is expected to be able to take.
  const first = map.starts[0][0], mainland = new Set([first]);
  for (const id of mainland) {
    const links = (map.bridgesByTile?.[id] || []).map(bridge => bridge.to);
    for (const next of [...neighbors(id), ...links]) {
      if (habitable(map.byId[next].terrain)) mainland.add(next);
    }
  }
  const random = seededRandom(seed, map.id + '/starts');
  const candidates = shuffled([...mainland].filter(id => {
    const terrain = neighbors(id).map(n => map.byId[n].terrain);
    return fertile(map.byId[id].terrain) && terrain.filter(habitable).length >= 3
      && terrain.filter(fertile).length >= 2;
  }), random);
  // Backtrack on small peninsulas when a first pick would squeeze a fourth player.
  const minimumSeparation=4*(map.scaleFactor||1)+1;
  function pick(chosen, offset) {
    if (chosen.length === count) return chosen;
    for (let i = offset; i < candidates.length; i++) {
      const id = candidates[i];
      if (chosen.every(other => distance(other,id) >= minimumSeparation)) {
        const found = pick([...chosen,id],i+1);
        if (found) return found;
      }
    }
    return null;
  }
  const homes = pick([],0);
  if (!homes) throw new Error('This region has too few separate settlement sites.');
  return homes.map(id => [id,...shuffled(neighbors(id).filter(next => habitable(map.byId[next].terrain)),random).slice(0,2)]);
}

// Farms, workshops and ships use normal city rules from the first harvest.
// Reserve every home (including the human's first ring of founding choices)
// before assigning satellite towns to any single governor.
export function planGovernorTowns(map, homes, quotas, seed, distance, protectedHexes) {
  const towns=homes.map(()=>[]);
  if (!quotas.some(n=>n>1)) return towns;

  const walking=homes.map(home=>{
    const steps=new Map([[home,0]]);
    for(const [tile,depth] of steps){
      const links=(map.bridgesByTile?.[tile] || []).map(bridge=>bridge.to);
      for(const next of [...map.neighbors(tile),...links]){
        if(!steps.has(next) && habitable(map.byId[next].terrain))steps.set(next,depth+1);
      }
    }
    return steps;
  });
  const candidates=map.tiles.filter(tile=>habitable(tile.terrain) && walking[0].has(tile.id) &&
    !protectedHexes.has(tile.id) && homes.every((home,seat)=>distance(home,tile.id)>=(quotas[seat] ? 3 : 4)) &&
    map.neighbors(tile.id).some(id=>fertile(map.byId[id].terrain)));
  const scored=quotas.map((quota,seat)=>{
    if(quota<2)return [];
    return candidates.map(tile=>{
      const own=walking[seat].get(tile.id);
      const rival=Math.min(...walking.filter((_,other)=>other!==seat).map(steps=>steps.get(tile.id)));
      const fields=map.neighbors(tile.id).filter(id=>fertile(map.byId[id].terrain)).length;
      return {id:tile.id, rank:own*4 + Math.max(0,own-rival+2)*8 - fields - Number(fertile(tile.terrain))*2};
    });
  });
  // Try local, well-fed towns first. Crowded old charts may need a different
  // packing; each trial still enforces the founding separation and human buffer.
  const trials=map.scaleFactor===1 ? 24 : 3;
  for(let trial=0;trial<trials;trial++){
    const random=seededRandom(seed,map.id+'/governor-towns/'+trial);
    const choices=scored.map(list=>list.map(site=>({...site,rank:site.rank+random()*(trial ? 20 : 3)}))
      .sort((a,b)=>a.rank-b.rank).map(site=>site.id));
    const assigned=homes.map(()=>[]),used=[];
    let pending=quotas.reduce((n,quota)=>n+Math.max(0,quota-1),0);
    while(pending){
      // Alternate seats, prioritizing the governor who still needs the most towns.
      let seat=-1,need=0;
      for(let i=0;i<quotas.length;i++){
        const left=quotas[i]-1-assigned[i].length;
        if(left>need){need=left;seat=i;}
      }
      const tile=choices[seat].find(id=>used.every(other=>distance(other,id)>=3));
      if(!tile)break;
      assigned[seat].push(tile);used.push(tile);pending--;
    }
    if(!pending)return assigned;
  }
  return null;
}
