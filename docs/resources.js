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
    const sites = region.tiles.filter(tile => item.terrains.includes(tile.terrain) && !assigned.has(tile.id) && !state.board[tile.id].naturalWonder
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
      tile && !state.board[tile.id].naturalWonder && !['mountains','ocean'].includes(tile.terrain) && !state.cities.some(c=>c.tile===tile.id));
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

export const SPECIAL_IMPROVEMENTS = {
  orchard: {name: 'Orchard'}, lumberCamp: {name: 'Lumber camp'}, quarry: {name: 'Quarry'}
};

// Two supply steps through friendly land. Equal-distance cities use their
// stable IDs, so a single site never supplies two cities at once.
export function serviceCity(state, tileId, byId, neighbors) {
  const holding=state.board[tileId];
  if (holding?.owner == null) return null;
  if (holding.improvement==='fishery') {
    return state.cities.find(city=>city.id===holding.portCity && city.seat===holding.owner && city.portTile && city.buildings.includes('harbor')) || null;
  }
  if (['ocean','mountains'].includes(byId[tileId]?.terrain)) return null;
  let frontier=[tileId];
  const seen=new Set(frontier);
  for(let distance=0;distance<=2;distance++) {
    const candidates=state.cities.filter(city=>city.seat===holding.owner && frontier.includes(city.tile));
    if(candidates.length) return candidates.sort((a,b)=>a.id.localeCompare(b.id))[0];
    if(distance===2) break;
    const next=[];
    for (const cell of frontier) for (const id of neighbors(cell)) {
      if(seen.has(id)||state.board[id]?.owner!==holding.owner || ['ocean','mountains'].includes(byId[id]?.terrain))continue;
      seen.add(id);next.push(id);
    }
    frontier=next;
  }
  return null;
}
export function connectedDeposit(holding) {
  return Boolean(holding && RESOURCES[holding.resource] && RESOURCES[holding.resource].improvement===holding.improvement && !holding.pillaged);
}

export const isProduce = resource => ['grain','citrus','fish'].includes(resource);
export function resourceAccounts(state, seat, byId, neighbors) {
  const stock=state.players[seat]?.stockpile || {};
  const result=Object.fromEntries(Object.keys(RESOURCES).map(key=>[key,{stock:stock[key]||0,income:0}]));
  for (const [id,holding] of Object.entries(state.board)) {
    if (holding?.owner!==seat || !connectedDeposit(holding) || !serviceCity(state,id,byId,neighbors)) continue;
    result[holding.resource].income++;
  }
  return result;
}
export function bankHarvest(state, seat, byId, neighbors) {
  const balances=resourceAccounts(state,seat,byId,neighbors);
  state.players[seat].stockpile=Object.fromEntries(Object.entries(balances).map(([key,b])=>[key,b.stock+b.income]));
}
export function shipGoods(state, seat, order) {
  const player=state.players[seat];
  const {resource,market}=order;
  if (!Object.hasOwn(RESOURCES,resource) || (player.stockpile?.[resource]||0)<2) throw new Error('This shipment requires two stored goods.');
  if (player.lastShipment===state.round) throw new Error('Your shipment for this turn has already left.');
  const city=state.cities.find(c=>c.id===order.city && c.seat===seat);
  if (market==='sell') player.capital+=5;
  else if (city && market==='city') {
    if (isProduce(resource)) city.food+=4;
    else if (city.queue && city.queue.required>city.queue.progress) city.queue.progress=Math.min(city.queue.required,city.queue.progress+4);
    else throw new Error('Select a city with an unfinished production project.');
  } else throw new Error('Choose one of your cities to receive goods.');
  player.stockpile={...player.stockpile,[resource]:player.stockpile[resource]-2};
  player.lastShipment=state.round;
}
export function planShipment(state,seat) {
  const p=state.players[seat];
  if (!p.stockpile || p.lastShipment===state.round) return null;
  const resource=Object.keys(RESOURCES).filter(k=>p.stockpile[k]>=2).sort((a,b)=>p.stockpile[b]-p.stockpile[a])[0];
  if (!resource) return null;
  const towns=state.cities.filter(c=>c.seat===seat);
  const city=isProduce(resource)
    ? towns.slice().sort((a,b)=>a.population-b.population)[0]
    : towns.find(c=>c.queue && c.queue.required-c.queue.progress>=4);
  return {type:'shipment',market:city?'city':'sell',resource,...(city?{city:city.id}:{})};
}
