import {sameTeam} from './teams.js';
import {waterDistances} from './water-navigation.js';

const storesPrice=6;
const sailingBonus=2;
export function voyageAllowance(unit) {
  return unit.maxMoves+(unit.voyageUnderway?sailingBonus:0);
}

export function voyageQuote(state,unit,def) {
  if(state.campaignVariety!==1 || def.domain!=='sea' || state.intel && state.intel.seat!==unit.seat)return null;
  const harbor=state.cities.find(c=>c.seat===unit.seat && c.portTile===unit.tile && c.buildings.includes('harbor'));
  if(!harbor && !unit.voyageUnderway && !unit.voyageStores)return null;
  const gold=state.players[unit.seat].capital;
  return {harbor:harbor?.name,price:storesPrice,budget:gold,bonus:sailingBonus,
    base:unit.maxMoves,after:unit.maxMoves+sailingBonus,stocked:Boolean(unit.voyageStores),underway:Boolean(unit.voyageUnderway),
    ready:Boolean(harbor && unit.moves && gold>=storesPrice && !unit.voyageStores)};
}

export function buyVoyageStores(state,unit,def) {
  const quote=voyageQuote(state,unit,def);
  if(!quote?.ready)throw new Error('Return a ship with movement to your own berth and pay 6 gold to provision it.');
  state.players[unit.seat].capital-=quote.price;
  unit.voyageStores=true;
  unit.moves=0;
}

export function beginVoyageTurn(unit) {
  if(unit.voyageUnderway) {
    delete unit.voyageUnderway;
    delete unit.voyagePlan;
  }
  if(unit.voyageStores){
    delete unit.voyageStores;
    unit.voyageUnderway=true;
    unit.moves+=sailingBonus;
  }
}

// Compare both orders against a firing position. Firing requires one movement
// point after sailing, even if the target is already visible from a spotter.
export function chartSortie(state,unit,map,types,distance) {
  const quote=voyageQuote(state,unit,types[unit.type]);
  if(!quote?.ready || !quote.harbor || unit.moves!==1 || !types[unit.type].strength)return null;
  const visible=new Set(state.intel.visible);
  const enemies=state.units.filter(other=>visible.has(other.tile) && !sameTeam(state,unit.seat,other.seat));
  const port=state.cities.find(city=>city.seat===unit.seat && city.portTile===unit.tile);
  // Keep a threatened berth's last move available to the defense.
  if(enemies.some(other=>types[other.type]?.strength &&
    (distance(other.tile,unit.tile)<=types[other.type].range ||
     types[other.type].captures && distance(other.tile,port.tile)<=2)))return null;
  const range=types[unit.type].range, maxSteps=quote.after-1;
  const targets=[...enemies,...state.cities.filter(city=>city.hp>1 &&
    visible.has(city.tile) && !sameTeam(state,unit.seat,city.seat))]
    .filter(target=>distance(unit.tile,target.tile)<=maxSteps+range);
  if(!targets.length)return null;
  const water=new Set(state.intel.explored);
  for(const other of state.units)if(other.id!==unit.id)water.delete(other.tile);
  for(const other of [...(state.barbarians?.parties||[]),...(state.barbarians?.camps||[])])water.delete(other.tile);
  const routes=waterDistances(unit.tile,map.byId,map.neighbors,maxSteps,water);
  // Water distances are in breadth-first order. The first possible shot is
  // the earliest, including shots at closer opponents along the route.
  for(const [tile,steps] of routes) {
    const target=targets.find(target=>distance(tile,target.tile)<=range);
    if(!target)continue;
    if(steps<unit.moves+unit.maxMoves)return null;
    return {station:tile,target:target.tile};
  }
  return null;
}

export function navalStoresOrder(state,unit,types,map,distance) {
  const def=types[unit.type];
  if(state.campaignVariety!==1 || def.domain!=='sea' || !def.strength || unit.moves!==1 || unit.voyageUnderway)return null;
  const quote=voyageQuote(state,unit,def);
  if(!quote?.ready || quote.budget<quote.price*3)return null;
  if(state.fieldCommandRevision===1) {
    return chartSortie(state,unit,map,types,distance)?{type:'provisionVoyage',unit:unit.id,chartSortie:true}:null;
  }
  // Earlier campaigns retain their original straight-line decision.
  const range=unit.maxMoves+def.range;
  const reachableTarget=[...state.units,...state.cities].some(other=>{
    if(sameTeam(state,unit.seat,other.seat))return false;
    if(!state.intel.visible.includes(other.tile))return false;
    const gap=distance(unit.tile,other.tile);
    if(gap<=range || gap>range+quote.bonus)return false;
    return map.byId[other.tile]?.terrain==='ocean' || state.cities.includes(other);
  });
  return reachableTarget?{type:'provisionVoyage',unit:unit.id}:null;
}
