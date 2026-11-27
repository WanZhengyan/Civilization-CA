// All regions use the same odd-row, point-up hex grid. Cached footprints contain
// only public geometry; never cache occupancy, observations, or player data here.
const sight = {
  settler:1, builder:1, scout:3, melee:2, ranged:2, cavalry:3, riflemen:2,
  artillery:2, armor:2, workboat:2, cutter:3, frigate:3, city:2
};
const footprints = new Map();
export function getSightRadius(type) { return sight[type] ?? 1; }

function footprint(id, radius) {
  const key=id+'@'+radius;
  if (footprints.has(key)) return footprints.get(key);
  const [col,row] = id.split(',').map(Number);
  const q = col-Math.floor(row/2);
  const tiles=[];
  for (let dr=-radius; dr<=radius; dr++) {
    for (let dq=Math.max(-radius,-dr-radius); dq<=Math.min(radius,-dr+radius); dq++) {
      const r=row+dr;
      tiles.push((q+dq+Math.floor(r/2))+','+r);
    }
  }
  footprints.set(key,tiles);
  return tiles;
}

export function getVisibleTiles(state, seat) {
  if (state.intel?.seat===seat) return new Set(state.intel.visible);
  const visible = new Set();
  const reveal=(tile,radius)=>{
    for (const id of footprint(tile,radius)) if (Object.hasOwn(state.board,id)) visible.add(id);
  };
  for (const unit of state.units) if (unit.seat===seat) reveal(unit.tile,getSightRadius(unit.type));
  for (const city of state.cities) if (city.seat===seat) reveal(city.tile,getSightRadius('city'));
  for (const [id,holding] of Object.entries(state.board)) if (holding.owner===seat) visible.add(id);
  return visible;
}
