import {waterKind,waterDistances} from './water-navigation.js';
export const PORT_BUILDINGS = {
  harbor: {name: 'Harbor', required: 10, description: 'Earns 2 capital per turn. A city may use its own shore or a connected coastal district within two hexes.'},
  shipyard: {name: 'Shipyard', era:'industrial', tech:'steam', required: 13, description: 'Adds 2 production per turn to this harbor city and equips it for larger vessels.'}
};

// A slipway must touch the shore reached from the city via its owned land.
// Reserve the water hex when the order is placed so simultaneous queues never overlap.
export function findPortSite(state, city, byId, neighbors, visible, prospective=false, acceptBerth) {
  if (!city) return null;
  if (city.portTile) return city.portTile;
  if (city.queue?.item === 'harbor' && city.queue.portTile) return city.queue.portTile;
  const reserved = new Set([...(state.intel?.visibleBerths || []),...state.cities.flatMap(other => [other.portTile,other.queue?.portTile]).filter(Boolean)]);
  const seen = new Set([city.tile]);
  let frontier = [city.tile];
  for (let distance = 0; distance <= 2; distance++) {
    const next = [];
    for (const shore of frontier) {
      for (const id of neighbors(shore)) {
        const tile = byId[id];
        // A future harbor may use surveyed coast beyond our borders. Consult only
        // its known terrain until the city can actually reserve a working berth.
        if (visible && !visible.has(id)) continue;
        if (waterKind(tile)) {
          if (!state.board[id].naturalWonder && (prospective || (!reserved.has(id) && state.board[id].owner == null && !state.board[id].improvement)) &&
            (!acceptBerth || acceptBerth(id))) return id;
        } else if (!seen.has(id) && tile.terrain !== 'mountains' && (prospective || state.board[id].owner === city.seat)) {
          seen.add(id);
          next.push(id);
        }
      }
    }
    frontier = next;
  }
  return null;
}

export function harborSites(state,city,byId,neighbors,visible) {
  if (city.portTile) return [city.portTile];
  if (city.queue?.item==='harbor' && city.queue.portTile) return [city.queue.portTile];
  const ids=new Set();
  findPortSite(state,city,byId,neighbors,visible,false,id=>{ids.add(id);return false;});
  return [...ids];
}

export const VESSELS = {
  workboat: {name: 'Fishing crew', role: 'Maritime engineering unit', domain: 'sea', era: 'frontier', required: 7, maxHp: 60, moves: 3, range: 0, strength: 0, charges: 2, description: 'Builds two fisheries within two connected water steps at sea or three on a charted river or lake. Can bring a catch back to your harbor.'},
  cutter: {name: 'Revenue cutter', role: 'Naval patrol unit', domain: 'sea', era: 'frontier', required: 9, maxHp: 85, moves: 3, range: 1, strength: 36, description: 'A fast sailing vessel for fighting nearby ships and bombarding the shoreline.'},
  frigate: {name: 'Steam frigate', role: 'Naval artillery unit', domain: 'sea', era: 'industrial', tech: 'steam', required: 16, maxHp: 110, moves: 3, range: 2, strength: 48, description: 'A shipyard warship that bombards targets up to two hexes away.'}
};

// Fishing fleets work sheltered water connected to an actual port by sea.
export function fisheryPort(state, seat, tile, byId, neighbors, charted) {
  const holding = state.board[tile];
  if (!waterKind(byId[tile]) || holding.naturalWonder || holding.improvement || (holding.owner !== null && holding.owner !== seat)) return null;
  if (state.intel?.visibleBerths?.includes(tile) || state.cities.some(city => city.portTile === tile || city.queue?.portTile === tile)) return null;
  const ports = state.cities.filter(city => city.seat === seat && city.portTile && city.buildings.includes('harbor'));
  if (!ports.length) return null;
  const reach=waterKind(byId[tile])==='sea' ? 2 : 3;
  const distances=waterDistances(tile,byId,neighbors,reach,charted);
  return ports.filter(c=>distances.has(c.portTile)).sort((a,b)=>distances.get(a.portTile)-distances.get(b.portTile))[0] || null;
}

// A crew can work its gear or carry one catch. Loading and landing each spend
// the rest of its turn. The optional manifest also works for older saved crews.
export function fishingTask(state,unit,byId) {
  if (unit.type!=='workboat' || unit.freight || !waterKind(byId[unit.tile])) return null;
  const port=state.cities.find(c=>c.seat===unit.seat && c.portTile===unit.tile && c.buildings.includes('harbor'));
  if (unit.fishCargo) return port ? {type:'landCatch',city:port.id} : null;
  if(port)return null;
  const site=state.board[unit.tile];
  if(!site || site.pillaged || site.naturalWonder || (site.owner!=null && site.owner!==unit.seat))return null;
  const surveyed=state.players[unit.seat].surveyEnabled || state.cities.some(c=>c.seat===unit.seat);
  return site.improvement==='fishery' && site.owner===unit.seat || surveyed && site.resource==='fish' ? {type:'haulFish'} : null;
}

export function runFishingTask(state,unit,action,byId) {
  const task=fishingTask(state,unit,byId);
  if(task?.type!==action.type)throw new Error('Work a fish shoal or fishery, then land the catch at your own harbor.');
  if(task.type==='haulFish') unit.fishCargo=true;
  else {
    const port=state.cities.find(c=>c.id===task.city);
    port.food+=3;
    const player=state.players[unit.seat];
    player.stockpile={...player.stockpile,fish:(player.stockpile?.fish||0)+1};
    delete unit.fishCargo;
  }
  unit.moves=0;
}
