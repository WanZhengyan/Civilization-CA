// Deposits belong to the campaign, never to the public geographical template.
export const RESOURCES = {
  grain:  {name:'Grain',        terrains:['plains','urban'], improvement:'farm',       color:'#e6c365', mark:'G'},
  citrus: {name:'Citrus',       terrains:['coast','plains','urban'], improvement:'orchard', color:'#eda056', mark:'C'},
  timber: {name:'Timber',       terrains:['forest'], improvement:'lumberCamp',          color:'#99b88b', mark:'T'},
  stone:  {name:'Stone',        terrains:['hills','urban'], improvement:'quarry',       color:'#d2c1a5', mark:'S'},
  iron:   {name:'Iron ore',     terrains:['hills'], improvement:'mine',                 color:'#c5a6aa', mark:'I'},
  fish:   {name:'Fish shoal',   terrains:['ocean'], improvement:'fishery',              color:'#85cbd6', mark:'F'}
};

// A fixed, independent draw per hex means a later change to start placement
// never shifts every resource. Only the authority runs this during setup.
function roll(seed, tile, salt) {
  let n = (seed >>> 0) ^ Math.imul(tile.q + 37, 2246822519) ^ Math.imul(tile.r + 47, 3266489917) ^ salt;
  n = Math.imul(n ^ n >>> 16, 2146121005);
  n = Math.imul(n ^ n >>> 15, 2221713035);
  return ((n ^ n >>> 16) >>> 0) / 4294967296;
}
export function populateDeposits(state, region, seed, adjacent) {
  const assigned = new Set();
  for (const [i,[key, item]] of Object.entries(RESOURCES).entries()) {
    const sites = region.tiles.filter(tile => item.terrains.includes(tile.terrain) && !assigned.has(tile.id)
      && !state.cities.some(city => city.tile === tile.id || city.portTile === tile.id));
    // Hills are shared by quarries and ore; place a modest number of each.
    const count = Math.min(sites.length, Math.max(sites.length ? 1 : 0,
      Math.round(sites.length * (key === 'fish' ? 0.22 : key === 'timber' || key === 'iron' ? 0.4 : 0.12))));
    sites.sort((a,b)=>roll(seed,a,Math.imul(i+1,2654435761))-roll(seed,b,Math.imul(i+1,2654435761)));
    for (const tile of sites.slice(0,count)) {
      state.board[tile.id] = {...state.board[tile.id],resource:key};
      assigned.add(tile.id);
    }
  }
  // Viable first settlements should not depend on winning a resource lottery.
  // Reserve a workable deposit beside each undecided starting settler. Its
  // location is still private until that player's first survey or founding.
  if (adjacent) for (const unit of state.units || []) {
    if (unit.type!=='settler') continue;
    const ring=adjacent(unit.tile).map(id=>region.byId[id]).filter(tile=>
      tile && !['mountains','ocean'].includes(tile.terrain) && !state.cities.some(c=>c.tile===tile.id));
    if (ring.some(tile=>RESOURCES[state.board[tile.id]?.resource])) continue;
    ring.sort((a,b)=>roll(seed,a,0x3da7)-roll(seed,b,0x3da7));
    const tile=ring[0];
    if (tile) {
      const choices=Object.entries(RESOURCES).filter(([,r])=>r.terrains.includes(tile.terrain));
      const [resource]=choices[Math.floor(roll(seed,tile,0x4db7)*choices.length)];
      state.board[tile.id]={...state.board[tile.id],resource};
    }
  }
  state.resourceVersion=1;
  return state;
}
export function canSeeDeposits(state, seat) {
  return state.players[seat]?.surveyEnabled === true || state.cities.some(city => city.seat === seat);
}
export function canSurvey(state, unit) {
  return Boolean(unit && unit.moves>0 && ['settler','scout','builder'].includes(unit.type) && !canSeeDeposits(state,unit.seat));
}
