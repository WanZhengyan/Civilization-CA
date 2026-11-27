import {createClassicGame} from './classic-game.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {getMap, migrateGame, getUnitOptions, applyAction, neighbors, getPortSite, getRouteDetail, combatPreview} from '../docs/rules.js';
import {mapPicker} from '../docs/regions-ui.js';

function connectedWater(map,start,end) {
  const seen = new Set([start]), fringe=[start];
  for(const tile of fringe){
    if(tile===end)return true;
    for(const id of neighbors(tile)) if(!seen.has(id)&&map.byId[id].terrain==='ocean'){
      seen.add(id); fringe.push(id);
    }
  }
  return false;
}

test('San Francisco Bay opens at four local cities with a navigable Golden Gate',()=>{
  const bay=createClassicGame(undefined,'sf'), map=getMap(bay);
  assert.equal(map.tiles.length,221);
  assert.deepEqual(bay.cities.map(c=>c.name),['San Francisco','Oakland','Richmond','San Rafael']);
  assert.ok(connectedWater(map,'0,3','10,5'));
  assert.ok(map.tiles.filter(t=>t.terrain==='ocean').length>60);
  assert.ok(mapPicker('sf').includes('value="sf" checked'));
  assert.throws(()=>createClassicGame(undefined,'unknown'));
  for(const unit of bay.units)assert.ok(!['mountains','ocean'].includes(map.byId[unit.tile].terrain));
});

test('map terrain and event text are isolated across interleaved games and restored saves',()=>{
  const bay=createClassicGame(undefined,'sf'), la=createClassicGame();
  const unit=bay.units.find(u=>u.type==='settler'&&u.seat===0);
  const moves=getUnitOptions(bay,unit.id).moves;
  assert.deepEqual(getMap(la).name,'The Los Angeles Basin');
  const old={...la};delete old.mapId;
  assert.equal(getMap(migrateGame(old)).id,'la');
  const restored=migrateGame(JSON.parse(JSON.stringify(bay)));
  assert.deepEqual(getUnitOptions(restored,unit.id).moves,moves);
  const move=moves.find(id=>getMap(bay).byId[id].name!==getMap(la).byId[id].name);
  assert.ok(move);
  const next=applyAction(restored,0,{type:'move',unit:unit.id,tile:move});
  assert.equal(next.log.at(-1).text,'Settler moved to '+getMap(bay).byId[move].name+'.');
  assert.equal(getMap(la).byId['11,7'].name,'Downtown LA');
});

function checkRegionalFleet(mapId) {
  let state=createClassicGame([{name:'Port'},{name:'Rival'}], mapId);
  const region=getMap(state),cityId=state.cities[0].id;
  for(const city of createClassicGame(undefined,mapId).cities){
    const site=getPortSite(createClassicGame(undefined,mapId),city.id);
    assert.ok(site,city.name+' can reach a port with its opening districts');
    assert.equal(region.byId[site].terrain,'ocean');
  }
  function commission(item) {
    state=applyAction(state,0,{type:'produce',city:cityId,item});
    for(let i=0;i<12 && state.cities[0].queue;i++){
      state=applyAction(state,0,{type:'end'});
      state=applyAction(state,1,{type:'end'});
    }
    assert.equal(state.cities[0].queue,null);
  }
  commission('harbor'); commission('cutter');
  const ship=state.units.find(unit=>unit.type==='cutter');
  assert.equal(region.byId[ship.tile].terrain,'ocean');
  const options=getUnitOptions(state,ship.id);
  assert.ok(options.moves.length>1);
  for(const id of options.moves) assert.equal(region.byId[id].terrain,'ocean');
  const moved=applyAction(state,0,{type:'move',unit:ship.id,tile:options.moves[0]});
  assert.equal(moved.units.find(unit=>unit.id===ship.id).tile,options.moves[0]);
}

test('Bay Area harbors commission ships into the Bay Area water network',()=>checkRegionalFleet('sf'));
test('San Diego Bay has its own capitals, harbor mouth and accessible coastal settlements',()=>{
  const state=createClassicGame(undefined,'sd'), map=getMap(state);
  assert.equal(map.tiles.length,221);
  assert.deepEqual(state.cities.map(c=>c.name),['Downtown San Diego','La Jolla','Coronado','Chula Vista']);
  assert.ok(connectedWater(map,'0,7','10,8'));
  assert.ok(connectedWater(map,'0,3','6,4'));
  for(const ids of map.starts){
    assert.ok(ids.every(id=>!['ocean','mountains'].includes(map.byId[id].terrain)));
    assert.ok(ids.some(id=>neighbors(id).some(n=>map.byId[n].terrain==='ocean')));
  }
  assert.equal(map.byId['5,8'].landmark,'lighthouse');
  assert.notEqual(getMap('sf').byId['5,8'].name,map.byId['5,8'].name);
});

test('San Diego fleets stay in their own connected waterways',()=>checkRegionalFleet('sd'));

test('every campaign has a traversable land route between all participating capitals',()=>{
  for(const mapId of ['la','sf','sd']) for(const count of [2,3,4]){
    const state=createClassicGame(Array.from({length:count},(_,i)=>({name:'Seat '+i})),mapId);
    const capitals=state.cities.map(c=>c.tile);
    const unit=state.units.find(u=>u.type==='melee');
    // Terrain reachability ignores temporary garrisons. Traverse the same moves offered by the game.
    const probe={...state,units:[unit],cities:[]};
    const seen=new Set([capitals[0]]),queue=[capitals[0]];
    for(const tile of queue){
      unit.tile=tile;
      for(const next of getUnitOptions(probe,unit.id).moves)if(!seen.has(next)){seen.add(next);queue.push(next);}
    }
    assert.ok(capitals.every(id=>seen.has(id)),mapId+' '+count+' factions');
  }
});

test('the Golden Gate carries land units and its shipping channel remains navigable',()=>{
  let state=createClassicGame([{name:'Host'},{name:'Guest'}],'sf');
  const map=getMap(state), bridge=map.crossings[0], unit=state.units.find(u=>u.type==='melee'&&u.seat===0);
  unit.tile=bridge.a;
  const detail=getRouteDetail(state,unit.id,bridge.b);
  assert.deepEqual(detail,{path:[bridge.a,bridge.b],cost:2,crossings:['Golden Gate Bridge']});
  assert.ok(!getUnitOptions(state,unit.id).moves.includes('5,3'));
  unit.moves=1;
  assert.equal(getRouteDetail(state,unit.id,bridge.b),null);
  unit.moves=2;
  const passed=applyAction(state,unit.seat,{type:'move',unit:unit.id,tile:bridge.b});
  assert.equal(passed.units.find(other=>other.id===unit.id).moves,0);
  const guard=state.units.find(u=>u.type==='melee'&&u.seat===1);
  guard.tile=bridge.b;
  assert.ok(!getUnitOptions(state,unit.id).moves.includes(bridge.b));
  assert.ok(combatPreview(state,unit.id,bridge.b));
  unit.type='cutter';unit.tile='5,3';unit.moves=3;
  const vessel=getUnitOptions(state,unit.id);
  assert.ok(vessel.moves.length && vessel.moves.every(id=>map.byId[id].terrain==='ocean'));
  assert.ok(connectedWater(map,'0,3','10,5'));
});
