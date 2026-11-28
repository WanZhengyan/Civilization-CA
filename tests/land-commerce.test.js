import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAction,campaignView,createGame,getLandRoutes,getMap} from '../docs/rules.js';

function market() {
  let state=createGame([{civilization:'valley'}],'la',{seed:323,practice:true,victoryMode:'science'});
  state=applyAction(state,0,{type:'found',unit:state.units[0].id});
  const home=state.cities[0],map=getMap(state);
  const neighbors=id=>map.neighbors(id).filter(i=>!['mountains','ocean'].includes(map.byId[i].terrain));
  const path=[home.tile];
  while(path.length<6){
    const next=neighbors(path.at(-1)).find(id=>!path.includes(id) && !path.slice(0,-1).some(old=>neighbors(old).includes(id)));
    if(!next)break;
    path.push(next);
  }
  assert.ok(path.length>=4);
  state.exploration[0]=Object.fromEntries(path.map(id=>[id,null]));
  state.cities.push({...structuredClone(home),id:'destination',tile:path.at(-1),name:'Depot',originalSeat:null,food:0});
  home.food=12;
  return {state,home:home.id,dest:'destination'};
}
test('a land corridor uses only charted land and is reciprocal for its two owners’ cities',()=>{
  const {state,home,dest}=market(),route=getLandRoutes(state,0,home)[0];
  assert.equal(route.destination,dest);
  assert.deepEqual(getLandRoutes(campaignView(state,0),0,home),[route]);
  assert.equal(getLandRoutes(state,0,dest)[0].steps,route.steps);
  assert.equal(route.turns,Math.ceil(route.steps/3));
  assert.deepEqual(getLandRoutes(campaignView(state,0),1,home),[]);
});
test('food is reserved at departure and paid only once when the wagon arrives',()=>{
  const {state,home,dest}=market(),route=getLandRoutes(state,0,home)[0];
  const order={type:'dispatchCaravan',origin:home,destination:dest,item:'provisions'};
  let next=applyAction(state,0,order);
  assert.equal(next.cities[0].food,state.cities[0].food-4);
  assert.equal(state.players[0].caravans,undefined);
  assert.throws(()=>applyAction(next,0,order),/wagon/);
  for(let i=0;i<route.turns;i++)next=applyAction(next,0,{type:'end'});
  assert.equal(next.players[0].caravans.length,0);
  assert.equal(next.players[0].tradeReceipt.destination,dest);
  assert.equal(next.players[0].tradeReceipt.paid,2+Math.floor(route.steps/2));
});
import {workTimber} from '../docs/land-commerce.js';
test('a lumber train leaves six stored production at an idle destination; the yard releases up to three per harvest',()=>{
  const {state,home,dest}=market();state.players[0].stockpile={timber:2};
  let next=applyAction(state,0,{type:'dispatchCaravan',origin:home,destination:dest,item:'lumber'});
  assert.equal(next.players[0].stockpile.timber,0);
  while(next.players[0].caravans.length)next=applyAction(next,0,{type:'end'});
  const city=next.cities.find(c=>c.id===dest);assert.equal(city.freightTimber,6);
  city.queue={item:'settler',progress:0,required:14};city.population=2;workTimber(city);
  assert.equal(city.freightTimber,6);
  city.queue={item:'granary',progress:8,required:10};workTimber(city);
  assert.equal(city.freightTimber,4);assert.equal(city.queue.progress,10);
});
test('shops open wholesale citrus markets and pay the quoted premium on arrival',()=>{
  const {state,home,dest}=market(),order={type:'dispatchCaravan',item:'citrusMarket',origin:home,destination:dest};
  state.players[0].stockpile={citrus:2};
  assert.throws(()=>applyAction(state,0,order));
  state.cities[1].buildings.push('shop');
  let next=applyAction(state,0,order);const quote=next.players[0].caravans[0].gold;
  assert.ok(quote>=10);assert.equal(next.players[0].stockpile.citrus,0);
  while(next.players[0].caravans.length)next=applyAction(next,0,{type:'end'});
  assert.equal(next.players[0].tradeReceipt.paid,quote);
});
test('a sending academy can finance scholars who deliver seven science into the bank at arrival',()=>{
  const {state,home,dest}=market();state.players[0].capital=6;
  const order={type:'dispatchCaravan',origin:home,destination:dest,item:'scholars'};
  assert.throws(()=>applyAction(state,0,order));
  state.cities[0].buildings=['academy'];let control=structuredClone(state),next=applyAction(state,0,order);
  assert.equal(next.players[0].capital,0);
  while(next.players[0].caravans.length){next=applyAction(next,0,{type:'end'});control=applyAction(control,0,{type:'end'});}
  assert.equal(next.players[0].science-control.players[0].science,7);
});
test('express wagons charge three more gold only for a genuinely earlier delivery',()=>{
  const {state,home,dest}=market(),route=getLandRoutes(state,0,home)[0];assert.ok(route.steps>3);
  const next=applyAction(state,0,{type:'dispatchCaravan',origin:home,destination:dest,item:'provisions',service:'express'});
  assert.equal(next.players[0].capital,state.players[0].capital-3);
  assert.ok(next.players[0].caravans[0].turns<route.turns);
});
test('recalling cargo retraces the traveled corridor and returns stock without paying freight',()=>{
  const {state,home,dest}=market();state.players[0].stockpile={citrus:2};state.cities[1].buildings=['shop'];
  let next=applyAction(state,0,{type:'dispatchCaravan',origin:home,destination:dest,item:'citrusMarket'});
  next=applyAction(next,0,{type:'end'});
  const wagon=next.players[0].caravans[0];assert.ok(wagon.cursor>0);
  next=applyAction(next,0,{type:'recallWagon',wagon:wagon.id});
  assert.equal(next.players[0].stockpile.citrus,0);
  assert.throws(()=>applyAction(next,0,{type:'recallWagon',wagon:wagon.id}));
  next=applyAction(next,0,{type:'end'});
  assert.equal(next.players[0].stockpile.citrus,2);assert.equal(next.players[0].tradeReceipt.paid,0);
});
test('a lost destination holds payment until the owner diverts the stranded cargo to a friendly alternate',()=>{
  const {state,home,dest}=market();let next=applyAction(state,0,{type:'dispatchCaravan',origin:home,destination:dest,item:'provisions'});
  const route=next.players[0].caravans[0],alternate={...structuredClone(next.cities[0]),id:'rescue',tile:route.path[1],originalSeat:null};
  next.cities=next.cities.filter(c=>c.id!==dest).concat(alternate);
  for(let i=0;i<route.turns;i++)next=applyAction(next,0,{type:'end'});
  assert.equal(next.players[0].caravans[0].remaining,0);assert.equal(next.players[0].tradeReceipt,undefined);
  const before=next.players[0].capital;
  next=applyAction(next,0,{type:'divertWagon',wagon:route.id,destination:'rescue'});
  assert.equal(next.players[0].capital,before-2);
  while(next.players[0].caravans.length)next=applyAction(next,0,{type:'end'});
  assert.equal(next.players[0].tradeReceipt.destination,'rescue');
});
import {freightOffer} from '../docs/land-commerce.js';
test('county fair books the quoted seasonal commodity and locks the price until delivery',()=>{
  const {state,home,dest}=market(),route=getLandRoutes(state,0,home)[0];state.round=3;
  const offer=freightOffer(state,0,route,'fair');
  state.players[0].stockpile={[offer.resource]:2};
  const order={type:'dispatchCaravan',origin:home,destination:dest,item:'fair',season:offer.season};
  assert.throws(()=>applyAction(state,0,{...order,season:100}));
  let next=applyAction(state,0,order);assert.equal(next.players[0].stockpile[offer.resource],0);
  assert.equal(freightOffer(next,0,route,'fair').reason,'booked');
  while(next.players[0].caravans.length)next=applyAction(next,0,{type:'end'});
  assert.equal(next.players[0].tradeReceipt.paid,11);
  assert.notEqual(freightOffer(next,0,route,'fair').resource,offer.resource);
});
test('a depot buys a second crew and allows two distinct cities to ship on the same day',()=>{
  const {state,home,dest}=market();state.players[0].capital=20;
  state.cities[0].buildings.push('shop');state.cities[1].food=8;
  let next=applyAction(state,0,{type:'establishDepot',origin:home});
  assert.equal(next.players[0].capital,2);
  assert.throws(()=>applyAction(next,0,{type:'establishDepot',origin:home}));
  const run=(s,o,d)=>applyAction(s,0,{type:'dispatchCaravan',origin:o,destination:d,item:'provisions'});
  next=run(next,home,dest);assert.throws(()=>run(next,home,dest));next=run(next,dest,home);
  assert.equal(new Set(next.players[0].caravans.map(w=>w.id)).size,2);
});
