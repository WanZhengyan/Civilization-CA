export const PORT_BUILDINGS = {
  harbor: {name: 'Harbor', required: 10, description: 'Earns 2 capital per turn. A city may use its own shore or a connected coastal district within two hexes.'},
  shipyard: {name: 'Shipyard', required: 13, description: 'Adds 2 production per turn to this harbor city and equips it for larger vessels.'}
};

// A slipway must touch the shore reached from the city via its owned land.
// Reserve the water hex when the order is placed so simultaneous queues never overlap.
export function findPortSite(state, city, byId, neighbors, visible) {
  if (!city) return null;
  if (city.portTile) return city.portTile;
  if (city.queue?.item === 'harbor' && city.queue.portTile) return city.queue.portTile;
  const reserved = new Set(state.cities.flatMap(other => [other.portTile, other.queue?.portTile]).filter(Boolean));
  const seen = new Set([city.tile]);
  let frontier = [city.tile];
  for (let distance = 0; distance <= 2; distance++) {
    const next = [];
    for (const shore of frontier) {
      for (const id of neighbors(shore)) {
        const tile = byId[id];
        if (tile.terrain === 'ocean') {
          if ((!visible || visible.has(id)) && !reserved.has(id) && state.board[id].owner == null && !state.board[id].improvement && !state.board[id].naturalWonder) return id;
        } else if (!seen.has(id) && tile.terrain !== 'mountains' && state.board[id].owner === city.seat) {
          seen.add(id);
          next.push(id);
        }
      }
    }
    frontier = next;
  }
  return null;
}

export const VESSELS = {
  workboat: {name: 'Fishing crew', role: 'Maritime engineering unit', domain: 'sea', era: 'frontier', required: 7, maxHp: 60, moves: 3, range: 0, strength: 0, charges: 2, description: 'Builds two offshore fisheries within two water hexes of a friendly port.'},
  cutter: {name: 'Revenue cutter', role: 'Naval patrol unit', domain: 'sea', era: 'frontier', required: 9, maxHp: 85, moves: 3, range: 1, strength: 36, description: 'A fast sailing vessel for fighting nearby ships and bombarding the shoreline.'},
  frigate: {name: 'Steam frigate', role: 'Naval artillery unit', domain: 'sea', era: 'industrial', tech: 'steam', required: 16, maxHp: 110, moves: 3, range: 2, strength: 48, description: 'A shipyard warship that bombards targets up to two hexes away.'}
};

// Fishing fleets work sheltered water connected to an actual port by sea.
export function fisheryPort(state, seat, tile, byId, neighbors) {
  const holding = state.board[tile];
  if (byId[tile]?.terrain !== 'ocean' || holding.naturalWonder || holding.improvement || (holding.owner !== null && holding.owner !== seat)) return null;
  if (state.cities.some(city => city.portTile === tile || city.queue?.portTile === tile)) return null;
  const ports = state.cities.filter(city => city.seat === seat && city.portTile && city.buildings.includes('harbor'));
  if (!ports.length) return null;
  const adjacentWater = neighbors(tile).filter(id => byId[id].terrain === 'ocean');
  const near = ports.find(city => adjacentWater.includes(city.portTile));
  return near || ports.find(city => adjacentWater.some(id => neighbors(id).includes(city.portTile))) || null;
}
