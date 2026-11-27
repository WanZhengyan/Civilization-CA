import {createClassicGame} from './classic-game.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyAction, getProductionOptions, getUnitOptions, getMovePath, getPortSite, getCityYield, getStats, neighbors, TILE_BY_ID, UNIT_TYPES, combatPreview, chooseBotAction} from '../docs/rules.js';
const order=(s,a)=>applyAction(s,s.turn,a);
function portGame() {
  const s=createClassicGame(['Interior','Coast']), c=s.cities[1];
  s.turn=1; c.portTile=getPortSite(s,c.id); c.buildings.push('harbor');
  return s;
}
function vessel(id,seat,type,tile) {
  const d=UNIT_TYPES[type];
  return {id,seat,type,tile,hp:d.maxHp,maxHp:d.maxHp,moves:d.moves,maxMoves:d.moves,charges:d.charges||0};
}
function byId(state,id) {return state.units.find(u=>u.id===id);}
function finishProduction(s,city) {
  for(let i=0;i<16&&s.cities.find(c=>c.id===city.id).queue;i++) s=order(s,{type:'end'});
  assert.equal(s.cities.find(c=>c.id===city.id).queue,null);
  return s;
}
test('a harbor launches ships into water only and a blocked launch waits rather than spawning ashore',()=>{
  let state=portGame();
  const city=state.cities[1], interior=state.cities[0];
  assert.ok(!getProductionOptions({...state,turn:0},interior.id).some(p=>p.item==='cutter'));
  assert.ok(!getProductionOptions(state,city.id).some(p=>p.item==='frigate'));
  state.players[1].technologies.push('steam');
  assert.match(getProductionOptions(state,city.id).find(p=>p.item==='frigate').reason,/shipyard/);
  city.buildings.push('shipyard');
  assert.equal(getProductionOptions(state,city.id).find(p=>p.item==='frigate').enabled,true);
  state=order(state,{type:'produce',city:city.id,item:'cutter'});
  const water=[city.portTile,...neighbors(city.portTile)].filter(id=>TILE_BY_ID[id].terrain==='ocean');
  state.units.push(...water.map((tile,i)=>vessel('block'+i,1,'workboat',tile)));
  for(let i=0;i<8;i++) state=order(state,{type:'end'});
  assert.ok(state.cities[1].queue.progress===state.cities[1].queue.required);
  assert.equal(state.units.some(u=>u.type==='cutter'),false);
  state.units=state.units.filter(u=>u.id!=='block0');
  state=finishProduction(state,city);
  const ship=state.units.find(u=>u.type==='cutter');
  assert.equal(ship.tile,city.portTile);
  assert.equal(ship.moves,0);
  state=order(state,{type:'end'});
  assert.deepEqual(getUnitOptions(state,ship.id).moves,[], 'the surrounding blockade also prevents sailing');
  state.units=state.units.filter(u=>!u.id.startsWith('block'));
  const destinations=getUnitOptions(state,ship.id).moves;
  assert.ok(destinations.length>2);
  for(const dest of destinations) {
    const path=getMovePath(state,ship.id,dest);
    assert.ok(path.every(id=>TILE_BY_ID[id].terrain==='ocean'));
    assert.equal(byId(order(state,{type:'move',tile:dest,unit:ship.id}),ship.id).moves,ship.maxMoves-path.length+1);
  }
  assert.throws(()=>order(state,{type:'move',unit:ship.id,tile:city.tile}),/within movement range/);
});

test('a fishing crew has two offshore charges which feed and fund its own harbor',()=>{
  let state=portGame();
  const c=state.cities[1], crew=vessel('crew',1,'workboat',c.portTile);
  state.units.push(crew);
  assert.deepEqual(getUnitOptions(state,crew.id).improvements,[]);
  let worked=0;
  for(let n=0;n<2;n++){
    const dest=getUnitOptions(state,crew.id).moves.find(id=>{
      const moved=order(state,{type:'move',unit:crew.id,tile:id});
      return getUnitOptions(moved,crew.id).improvements.includes('fishery');
    });
    assert.ok(dest);
    state=order(state,{type:'move',unit:crew.id,tile:dest});
    assert.throws(()=>order(state,{type:'improve',unit:crew.id,item:'farm'}));
    const old=state;
    state=order(state,{type:'improve',unit:crew.id,item:'fishery'});
    worked++;
    assert.equal(state.board[dest].portCity,c.id);
    assert.equal(state.board[dest].owner,1);
    assert.equal(getCityYield(state,c.id).food-getCityYield(old,c.id).food,2+Number(state.board[dest].resource==='fish'));
    assert.equal(getCityYield(state,c.id).capital-getCityYield(old,c.id).capital,1);
    assert.ok(getStats(state,1).capitalIncome>getStats(old,1).capitalIncome);
    assert.equal(byId(state,crew.id)?.charges||0,2-worked);
    state=order(order(state,{type:'end'}),{type:'end'});
  }
  assert.equal(byId(state,crew.id),undefined);
});

test('sea and shore combat honors hit forecasts, coastlines and the last city hit point',()=>{
  let state=portGame();
  const port=state.cities[1], ocean=port.portTile, harbor=port.tile;
  state.turn=0;const frigate=vessel('frigate',0,'frigate',ocean);
  state.units=[frigate];
  port.hp=5;
  const hit=combatPreview(state,frigate.id,harbor);
  assert.ok(hit);
  assert.equal(hit.capture,false); assert.equal(hit.defenderHpAfter,1);
  const s=order(state,{type:'attack',unit:frigate.id,tile:harbor});
  assert.equal(s.cities[1].hp,1); assert.equal(byId(s,frigate.id).tile,ocean);
  port.hp=1;
  assert.equal(combatPreview(state,frigate.id,harbor),null);
  const target=neighbors(ocean).find(id=>TILE_BY_ID[id].terrain==='ocean');
  state.units.push(vessel('enemy-ship',1,'cutter',target));
  const duel=combatPreview(state,frigate.id,target);
  assert.ok(duel.damage>0);
  assert.equal(byId(order(state,{type:'attack',unit:frigate.id,tile:target}),'enemy-ship').hp,duel.defenderHpAfter);
  const infantry=vessel('shore',0,'melee',harbor);
  state.units=[infantry,{...frigate,seat:1,hp:1}];
  assert.equal(combatPreview(state,infantry.id,ocean).advances,false);
  assert.equal(byId(order(state,{type:'attack',unit:infantry.id,tile:ocean}),infantry.id).tile,harbor);
});

test('in the fixed LA opening the AI builds an actual working fishing fleet',()=>{
  let s=createClassicGame([{name:'A',bot:true},{name:'B',bot:true}]);
  const launched=new Set();
  let fisheries=0;
  while(s.phase==='playing') {
    const action=chooseBotAction(s);
    if(action.type==='improve' && action.item==='fishery') fisheries++;
    s=order(s,action);
    s.units.filter(u=>UNIT_TYPES[u.type].domain==='sea').forEach(u=>launched.add(u.type));
  }
  assert.ok(launched.has('workboat') && launched.has('cutter'));
  assert.ok(fisheries>=1);
});
