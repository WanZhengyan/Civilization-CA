import {settlerPopulationReason} from './population.js';
// Wagon roads follow charted land. Unseen hexes cannot shorten the journey.
export function tradeCorridors(state,seat,originId,map,explored) {
  const cities=state.cities.filter(c=>c.seat===seat);
  const origin=cities.find(c=>c.id===originId);
  if (!origin || cities.length<2) return [];
  return roadsFrom(origin.tile,origin.id,cities,map,explored).map(route=>{
    const graded=state.players[seat].wagonRoads?.includes(roadKey(origin.id,route.destination)) || false;
    return {...route,graded,turns:Math.ceil(route.steps/(graded?5:3))};
  });
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
  returnMail:{en:'Return mail',zh:'回程邮运',culture:3,market:3},
  fair:{en:'County fair contract',zh:'地区集市订单',stock:2,market:11},
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
  const mailKey=JSON.stringify([route.origin,route.destination]),mailThrough=player.mailTickets?.[mailKey];
  if(item==='returnMail' && !(mailThrough>=state.round))return null;
  const season=Math.floor((state.round-1)/3);
  const [q,r]=destination.tile.split(',').map(Number);
  const resource=item==='fair'?['grain','citrus','timber'][(season+q+r)%3]:cargo.resource;
  const gold=(cargo.freight ? Math.min(9,2+Math.floor(route.steps/2)) : 0)+(cargo.market || 0);
  const speed=(service==='express'?6:3)+(route.graded?2:0),turns=Math.ceil(route.steps/speed);
  if(service==='express' && turns>=route.turns)return null;
  const fare=(cargo.fare || 0)+(service==='express'?3:0);
  const capacity=tradeCapacity(state,seat);
  const departures=player.caravanDay?.round===state.round ? player.caravanDay.origins :
    player.lastCaravan===state.round ? ['legacy'] : [];
  const reason=item==='fair' && player.fairBookings?.[destination.id]===season?'booked':(departures.length>=capacity || departures.includes(origin.id))?'departure':fleet.length>=capacity?'crew':
    player.capital<fare?'fare':(origin.food || 0)<(cargo.food || 0)?'food':
    resource && (player.stockpile?.[resource] || 0)<cargo.stock?'stock':'';
  return {origin:origin.id,destination:destination.id,item,service,speed,turns,fare,gold,reason,resource,...(item==='returnMail'?{mailThrough}:{}),...(item==='fair'?{season}: {})};
}
export function dispatchCaravan(state,seat,order,routes) {
  const route=routes.find(r=>r.destination===order.destination);
  const offer=route && freightOffer(state,seat,route,order.item,order.service);
  if (!offer || offer.reason || order.item==='fair' && order.season!==offer.season) throw new Error('Review the available wagon, cargo and charted trade route.');
  const cargo=CARGO[order.item],player=state.players[seat],origin=state.cities.find(c=>c.id===route.origin);
  player.capital-=offer.fare;
  origin.food-=(cargo.food || 0);
  if(offer.resource)player.stockpile={...player.stockpile,[offer.resource]:player.stockpile[offer.resource]-cargo.stock};
  if(order.item==='returnMail'){
    const tickets={...player.mailTickets};
    delete tickets[JSON.stringify([route.origin,route.destination])];
    player.mailTickets=tickets;
  }
  if(order.item==='fair')player.fairBookings={...player.fairBookings,[route.destination]:offer.season};
  player.caravans=[...(player.caravans || []),{...offer,id:'wagon-'+state.round+'-'+seat+'-'+origin.id,path:route.path,cursor:0,remaining:offer.turns,launched:state.round}];
  const origins=player.caravanDay?.round===state.round?player.caravanDay.origins:[];
  player.caravanDay={round:state.round,origins:[...origins,origin.id]};
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
      const resource=wagon.resource || cargo.resource;
      if(resource)player.stockpile={...player.stockpile,[resource]:(player.stockpile?.[resource] || 0)+cargo.stock};
      player.tradeReceipt={...wagon,arrived:state.round,paid:0};
      continue;
    }
    city.food=(city.food || 0)+(cargo.deliverFood || 0);
    if(wagon.item!=='returnMail'){
      const tickets=Object.fromEntries(Object.entries(player.mailTickets || {}).filter(([,through])=>through>=state.round));
      tickets[JSON.stringify([city.id,wagon.origin])]=state.round+3;
      player.mailTickets=tickets;
    }
    if(cargo.culture)player.culture=(player.culture || 0)+cargo.culture;
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
  if(!current || wagon.returning || wagon.item==='returnMail')return [];
  const cargo=CARGO[wagon.item];
  const speed=wagon.service==='express'?6:3;
  const towns=state.cities.filter(c=>c.seat===seat && c.id!==wagon.destination &&
    (!cargo.atDestination || c.buildings.includes(cargo.atDestination)));
  return roadsFrom(current,wagon.origin,towns,map,explored).map(route=>({...route,speed,turns:Math.max(1,Math.ceil(route.steps/speed))}));
}
export function divertWagon(state,seat,order,routes) {
  const player=state.players[seat],wagon=player.caravans?.find(w=>w.id===order.wagon);
  const route=routes.find(r=>r.destination===order.destination);
  if(!wagon || !route || wagon.diverted===state.round || player.capital<2)throw new Error('Review the alternate destination and its two-gold diversion fee.');
  player.capital-=2;
  player.caravans=player.caravans.map(w=>w!==wagon ? w : {...w,destination:route.destination,
    gold:w.item==='fair'?5:w.gold,speed:route.speed,path:route.path,cursor:0,remaining:route.turns,diverted:state.round,returnPath:[...(w.returnPath || []),...w.path.slice(0,w.cursor)]});
}

export function tradeCapacity(state,seat) {
  return state.cities.some(c=>c.seat===seat && c.wagonDepot)?2:1;
}
export function establishDepot(state,seat,id) {
  const city=state.cities.find(c=>c.id===id && c.seat===seat);
  if(!city || !city.buildings.includes('shop') || tradeCapacity(state,seat)>1 || state.players[seat].capital<18)
    throw new Error('A wagon depot needs a local Shop, 18 gold and an unassigned depot charter.');
  state.players[seat].capital-=18;
  city.wagonDepot=true;
}

const roadKey=(a,b)=>JSON.stringify([a,b].sort());
export const roadCost=route=>4+2*route.steps;
export function gradeRoad(state,seat,order,routes) {
  const route=routes.find(r=>r.destination===order.destination),player=state.players[seat];
  if(!route || route.graded || !player.civics.includes('publicWorks') || player.capital<roadCost(route))
    throw new Error('Grading needs Public Works, the quoted gold and an ungraded corridor.');
  player.capital-=roadCost(route);
  player.wagonRoads=[...(player.wagonRoads || []),roadKey(route.origin,route.destination)];
}

export function planOverlandCommerce(state,seat,routesFor) {
  const player=state.players[seat],towns=state.cities.filter(c=>c.seat===seat);
  if(state.campaignVariety!==1 || towns.length<2 || player.lastCaravan===state.round ||
     (player.caravans?.length || 0)>=tradeCapacity(state,seat))return null;
  const routesByOrigin=new Map(),stock=player.stockpile || {};
  let best;
  const consider=(city,destination,item,priority)=>{
    if(!routesByOrigin.has(city.id))routesByOrigin.set(city.id,routesFor(state,seat,city.id));
    const route=routesByOrigin.get(city.id).find(r=>r.destination===destination.id);
    const offer=route && freightOffer(state,seat,route,item);
    if(!offer || offer.reason || offer.resource && (stock[offer.resource] || 0)<3)return;
    const score=priority/offer.turns;
    if(!best || score>best.score)best={score,order:{type:'dispatchCaravan',origin:city.id,destination:destination.id,item,...(item==='fair'?{season:offer.season}:{})}};
  };
  for(const city of towns){
    for(const destination of towns){
      if(city===destination)continue;
      if(city.food>=10 && destination.food<4)consider(city,destination,'provisions',8);
      if(destination.queue && !destination.freightTimber && (stock.timber || 0)>=3)consider(city,destination,'lumber',6);
      if(player.capital<20 && destination.buildings.includes('shop') && (stock.citrus || 0)>=3)consider(city,destination,'citrusMarket',5);
      if(player.capital<15 && Object.values(stock).some(n=>n>=3))consider(city,destination,'fair',4);
      if(player.research && player.capital>=24 && city.buildings.includes('academy'))consider(city,destination,'scholars',3);
    }
  }
  return best?.order || null;
}
