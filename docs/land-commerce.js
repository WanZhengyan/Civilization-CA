import {settlerPopulationReason} from './population.js';
// Wagon roads follow charted land. Unseen hexes cannot shorten the journey.
export function tradeCorridors(state,seat,originId,map,explored) {
  const cities=state.cities.filter(c=>c.seat===seat);
  const origin=cities.find(c=>c.id===originId);
  if (!origin || cities.length<2) return [];
  const parents=new Map([[origin.tile,null]]), queue=[origin.tile];
  for (let i=0;i<queue.length;i++) {
    for (const id of map.neighbors(queue[i])) {
      if (parents.has(id) || !explored.has(id)) continue;
      const tile=map.byId[id];
      if (!tile || ['mountains','ocean'].includes(tile.terrain)) continue;
      parents.set(id,queue[i]);queue.push(id);
    }
  }
  return cities.filter(c=>c.id!==originId && parents.has(c.tile)).map(city=>{
    const path=[];
    for (let id=city.tile;id!=null;id=parents.get(id)) path.push(id);
    path.reverse();
    const steps=path.length-1;
    return {origin:origin.id,destination:city.id,path,steps,turns:Math.max(1,Math.ceil(steps/3))};
  }).sort((a,b)=>a.turns-b.turns || a.steps-b.steps || a.destination.localeCompare(b.destination));
}

export const CARGO={
  lumber:{en:'Lumber train',zh:'木材运输队',resource:'timber',stock:2,production:6},
  provisions:{en:'Food wagon',zh:'粮食马车',food:4,deliverFood:4,freight:true}
};

export function freightOffer(state,seat,route,item,service='standard') {
  const cargo=Object.hasOwn(CARGO,item)?CARGO[item]:null;
  const origin=state.cities.find(c=>c.id===route.origin && c.seat===seat);
  const destination=state.cities.find(c=>c.id===route.destination && c.seat===seat);
  if (!cargo || !origin || !destination || service!=='standard') return null;
  const player=state.players[seat], fleet=player.caravans || [];
  const gold=cargo.freight ? Math.min(9,2+Math.floor(route.steps/2)) : 0;
  const reason=player.lastCaravan===state.round?'departure':fleet.length>=1?'crew':
    (origin.food || 0)<(cargo.food || 0)?'food':
    cargo.resource && (player.stockpile?.[cargo.resource] || 0)<cargo.stock?'stock':'';
  return {origin:origin.id,destination:destination.id,item,service,turns:route.turns,gold,reason};
}
export function dispatchCaravan(state,seat,order,routes) {
  const route=routes.find(r=>r.destination===order.destination);
  const offer=route && freightOffer(state,seat,route,order.item,order.service);
  if (!offer || offer.reason) throw new Error('Review the available wagon, cargo and charted trade route.');
  const cargo=CARGO[order.item],player=state.players[seat],origin=state.cities.find(c=>c.id===route.origin);
  origin.food-=(cargo.food || 0);
  if(cargo.resource)player.stockpile={...player.stockpile,[cargo.resource]:player.stockpile[cargo.resource]-cargo.stock};
  player.caravans=[...(player.caravans || []),{...offer,id:'wagon-'+state.round+'-'+seat,remaining:offer.turns,launched:state.round}];
  player.lastCaravan=state.round;
}
export function harvestCaravans(state,seat) {
  const player=state.players[seat];
  if(!player.caravans?.length)return;
  const pending=[];
  for(const wagon of player.caravans){
    const remaining=Math.max(0,wagon.remaining-1);
    const city=state.cities.find(c=>c.id===wagon.destination && c.seat===seat);
    if(remaining || !city){pending.push({...wagon,remaining});continue;}
    const cargo=CARGO[wagon.item];
    city.food=(city.food || 0)+(cargo.deliverFood || 0);
    if(cargo.production) city.freightTimber=(city.freightTimber || 0)+cargo.production;
    player.capital+=wagon.gold;
    player.tradeReceipt={...wagon,arrived:state.round,paid:wagon.gold};
  }
  player.caravans=pending;
}

export function workTimber(city) {
  if(!city.freightTimber || !city.queue || settlerPopulationReason(city))return;
  const spent=Math.min(3,city.freightTimber,Math.max(0,city.queue.required-city.queue.progress));
  city.freightTimber-=spent;
  city.queue.progress+=spent;
}
