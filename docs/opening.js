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
  const minimumSeparation=map.mapSize==='large' ? 9 : 5;
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
