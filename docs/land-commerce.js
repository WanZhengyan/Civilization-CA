import {settlerPopulationReason} from './population.js';
// Wagon roads follow charted land. Unseen hexes cannot shorten the journey.
export function tradeCorridors(state,seat,originId,map,explored) {
  const cities=state.cities.filter(c=>c.seat===seat);
  const origin=cities.find(c=>c.id===originId);
  if (!origin || cities.length<2) return [];
  return roadsFrom(origin.tile,origin.id,cities,map,explored);
}
function roadsFrom(start,originId,cities,map,explored) {
  const parents=new Map([[start,null]]), queue=[start];
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
    return {origin:originId,destination:city.id,path,steps,turns:Math.max(1,Math.ceil(steps/3))};
  }).sort((a,b)=>a.turns-b.turns || a.steps-b.steps || a.destination.localeCompare(b.destination));
}

export const CARGO={
  scholars:{en:'Traveling scholars',zh:'学者交流团',atOrigin:'academy',fare:6,science:7},
  citrusMarket:{en:'Citrus market consignment',zh:'柑橘批销',resource:'citrus',stock:2,atDestination:'shop',market:8,freight:true},
  lumber:{en:'Lumber train',zh:'木材运输队',resource:'timber',stock:2,production:6},
  provisions:{en:'Food wagon',zh:'粮食马车',food:4,deliverFood:4,freight:true}
};

export function freightOffer(state,seat,route,item,service='standard') {
  const cargo=Object.hasOwn(CARGO,item)?CARGO[item]:null;
  const origin=state.cities.find(c=>c.id===route.origin && c.seat===seat);
  const destination=state.cities.find(c=>c.id===route.destination && c.seat===seat);
  if (!cargo || !origin || !destination || !['standard','express'].includes(service)) return null;
  if(cargo.atOrigin && !origin.buildings.includes(cargo.atOrigin))return null;
  if(cargo.atDestination && !destination.buildings.includes(cargo.atDestination))return null;
  const player=state.players[seat], fleet=player.caravans || [];
  const gold=(cargo.freight ? Math.min(9,2+Math.floor(route.steps/2)) : 0)+(cargo.market || 0);
  const speed=service==='express'?6:3,turns=Math.ceil(route.steps/speed);
  if(service==='express' && turns>=route.turns)return null;
  const fare=(cargo.fare || 0)+(service==='express'?3:0);
  const reason=player.lastCaravan===state.round?'departure':fleet.length>=1?'crew':
    player.capital<fare?'fare':(origin.food || 0)<(cargo.food || 0)?'food':
    cargo.resource && (player.stockpile?.[cargo.resource] || 0)<cargo.stock?'stock':'';
  return {origin:origin.id,destination:destination.id,item,service,speed,turns,fare,gold,reason};
}
export function dispatchCaravan(state,seat,order,routes) {
  const route=routes.find(r=>r.destination===order.destination);
  const offer=route && freightOffer(state,seat,route,order.item,order.service);
  if (!offer || offer.reason) throw new Error('Review the available wagon, cargo and charted trade route.');
  const cargo=CARGO[order.item],player=state.players[seat],origin=state.cities.find(c=>c.id===route.origin);
  player.capital-=offer.fare;
  origin.food-=(cargo.food || 0);
  if(cargo.resource)player.stockpile={...player.stockpile,[cargo.resource]:player.stockpile[cargo.resource]-cargo.stock};
  player.caravans=[...(player.caravans || []),{...offer,id:'wagon-'+state.round+'-'+seat,path:route.path,cursor:0,remaining:offer.turns,launched:state.round}];
  player.lastCaravan=state.round;
}
export function harvestCaravans(state,seat) {
  const player=state.players[seat];
  if(!player.caravans?.length)return;
  const pending=[];
  for(const wagon of player.caravans){
    const remaining=Math.max(0,wagon.remaining-1);
    const city=state.cities.find(c=>c.id===wagon.destination && c.seat===seat);
    const cursor=wagon.path?Math.min(wagon.path.length-1,(wagon.cursor || 0)+(wagon.speed || 3)):0;
    if(remaining || !city){pending.push({...wagon,remaining,cursor});continue;}
    const cargo=CARGO[wagon.item];
    if(wagon.returning){
      city.food=(city.food || 0)+(cargo.food || 0);
      if(cargo.resource)player.stockpile={...player.stockpile,[cargo.resource]:(player.stockpile?.[cargo.resource] || 0)+cargo.stock};
      player.tradeReceipt={...wagon,arrived:state.round,paid:0};
      continue;
    }
    city.food=(city.food || 0)+(cargo.deliverFood || 0);
    if(cargo.science)player.science=(player.science || 0)+cargo.science;
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

export function recallWagon(state,seat,id) {
  const player=state.players[seat],fleet=player.caravans || [];
  const wagon=fleet.find(w=>w.id===id);
  if(!wagon || wagon.returning || !state.cities.some(c=>c.id===wagon.origin && c.seat===seat))
    throw new Error('Choose an outgoing wagon with a friendly home city.');
  const path=wagon.path?[...(wagon.returnPath || []),...wagon.path.slice(0,wagon.cursor+1)].reverse():[state.cities.find(c=>c.id===wagon.origin).tile];
  const turns=Math.max(1,Math.ceil((path.length-1)/(wagon.speed || 3)));
  player.caravans=fleet.map(w=>w!==wagon?w:{...w,path,cursor:0,returning:true,destination:w.origin,remaining:turns});
}

export function diversionRoads(state,seat,id,map,explored) {
  const wagon=state.players[seat]?.caravans?.find(w=>w.id===id);
  const current=wagon?.path?.[wagon.cursor];
  if(!current || wagon.returning)return [];
  const cargo=CARGO[wagon.item];
  const towns=state.cities.filter(c=>c.seat===seat && c.id!==wagon.destination &&
    (!cargo.atDestination || c.buildings.includes(cargo.atDestination)));
  return roadsFrom(current,wagon.origin,towns,map,explored).map(route=>({...route,turns:Math.max(1,Math.ceil(route.steps/wagon.speed))}));
}
export function divertWagon(state,seat,order,routes) {
  const player=state.players[seat],wagon=player.caravans?.find(w=>w.id===order.wagon);
  const route=routes.find(r=>r.destination===order.destination);
  if(!wagon || !route || wagon.diverted===state.round || player.capital<2)throw new Error('Review the alternate destination and its two-gold diversion fee.');
  player.capital-=2;
  player.caravans=player.caravans.map(w=>w!==wagon ? w : {...w,destination:route.destination,
    path:route.path,cursor:0,remaining:route.turns,diverted:state.round,returnPath:[...(w.returnPath || []),...w.path.slice(0,w.cursor)]});
}
