export const PORT_BUILDINGS = {
  harbor: {name: 'Harbor', required: 10, description: 'Earns 2 capital per turn. A city may use its own shore or a connected coastal district within two hexes.'},
  shipyard: {name: 'Shipyard', required: 13, description: 'Adds 2 production per turn to this harbor city and equips it for larger vessels.'}
};

// A slipway must touch the shore reached from the city via its owned land.
// Reserve the water hex when the order is placed so simultaneous queues never overlap.
export function findPortSite(state, city, byId, neighbors) {
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
          if (!reserved.has(id) && state.board[id].owner == null && !state.board[id].improvement) return id;
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
