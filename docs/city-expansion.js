export function borderBudget(city, player) {
  const progress = city.borderProgress || 0;
  const residents = Math.max(1, city.population);
  const surveying = player?.technologies?.includes('civics') ? 1 : 0;
  const federation = player?.civics?.includes('federation') ? 2 : 0;
  const rate = residents + surveying + federation;
  const required = 8 + Math.min(8, (city.borderClaims || 0) * 2);
  return {progress, rate, residents, surveying, federation, required, turns: Math.ceil((required - progress) / rate)};
}

const availableLand = new Set(['coast', 'plains', 'urban', 'hills', 'forest']);

// Follow contiguous land that this city can reach without crossing another civilization.
export function borderParcels(state, city, map, visible) {
  const occupied = new Set([...state.units.filter(u=>u.seat!==city.seat),
    ...(state.barbarians?.camps || []), ...(state.barbarians?.parties || []), ...state.cities].map(e=>e.tile));
  const visited = new Set([city.tile]), parcels = [];
  let ring = [city.tile];
  for (let distance = 1; distance <= 3 && ring.length; distance++) {
    const next = [];
    for (const source of ring) {
      for (const id of map.neighbors(source)) {
        if (visited.has(id)) continue;
        visited.add(id);
        const holding = state.board[id];
        if (!holding || !availableLand.has(map.byId[id].terrain)) continue;
        if (holding.owner === city.seat) next.push(id);
        else if (holding.owner === null && (!visible || visible.has(id)) && !occupied.has(id) && !holding.improvement && !holding.wonder)
          parcels.push({id, distance});
      }
    }
    ring = next;
  }
  return parcels.sort((a,b) => a.distance-b.distance || map.byId[a.id].r-map.byId[b.id].r || map.byId[a.id].q-map.byId[b.id].q);
}


// Fix all nominations against one snapshot. Nearby cities can never promise the same parcel.
export function planCityBorders(state, seat, map, visible) {
  const allocated = new Set(), reports = new Map();
  for (const city of state.cities.filter(c=>c.seat===seat)) {
    const budget = borderBudget(city, state.players[seat]);
    const parcel = borderParcels(state, city, map, visible).find(site=>!allocated.has(site.id));
    if (parcel) allocated.add(parcel.id);
    reports.set(city.id, {...budget, tile:parcel?.id || null, turns:parcel ? budget.turns : null});
  }
  return reports;
}

export function advanceCityBorder(state, city, report) {
  if (!report.tile) return null;
  const balance = report.progress + report.rate;
  if (balance < report.required) {
    city.borderProgress = balance;
    return null;
  }
  state.board[report.tile] = {...state.board[report.tile], owner:city.seat};
  city.borderProgress = Math.min(report.required - 1, balance - report.required);
  city.borderClaims = (city.borderClaims || 0) + 1;
  return report.tile;
}
