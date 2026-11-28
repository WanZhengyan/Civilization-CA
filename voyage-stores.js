import {sameTeam} from './teams.js';

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
  if(unit.voyageUnderway)delete unit.voyageUnderway;
  if(unit.voyageStores){
    delete unit.voyageStores;
    unit.voyageUnderway=true;
    unit.moves+=sailingBonus;
  }
}

// A governor with only one sailing point left can prepare to reach a visible
// opponent just outside tomorrow's normal movement and bombardment range.
export function navalStoresOrder(state,unit,def,byId,distance) {
  if(state.campaignVariety!==1 || def.domain!=='sea' || !def.strength || unit.moves!==1 || unit.voyageUnderway)return null;
  const quote=voyageQuote(state,unit,def);
  if(!quote?.ready || quote.budget<quote.price*3)return null;
  const range=unit.maxMoves+def.range;
  const reachableTarget=[...state.units,...state.cities].some(other=>{
    if(sameTeam(state,unit.seat,other.seat))return false;
    if(!state.intel.visible.includes(other.tile))return false;
    const gap=distance(unit.tile,other.tile);
    if(gap<=range || gap>range+quote.bonus)return false;
    return byId[other.tile]?.terrain==='ocean' || state.cities.includes(other);
  });
  return reachableTarget?{type:'provisionVoyage',unit:unit.id}:null;
}
