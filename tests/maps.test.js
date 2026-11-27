import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame, getMap, migrateGame, getUnitOptions, applyAction, neighbors, getPortSite} from '../docs/rules.js';
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
  const bay=createGame(undefined,'sf'), map=getMap(bay);
  assert.equal(map.tiles.length,221);
  assert.deepEqual(bay.cities.map(c=>c.name),['San Francisco','Oakland','Richmond','San Rafael']);
  assert.ok(connectedWater(map,'0,3','10,5'));
  assert.ok(map.tiles.filter(t=>t.terrain==='ocean').length>60);
  assert.ok(mapPicker('sf').includes('value="sf" checked'));
  assert.throws(()=>createGame(undefined,'unknown'));
  for(const unit of bay.units)assert.ok(!['mountains','ocean'].includes(map.byId[unit.tile].terrain));
});

test('map terrain and event text are isolated across interleaved games and restored saves',()=>{
  const bay=createGame(undefined,'sf'), la=createGame();
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
  let state=createGame([{name:'Port'},{name:'Rival'}], mapId);
  const region=getMap(state),cityId=state.cities[0].id;
  for(const city of createGame(undefined,mapId).cities){
    const site=getPortSite(createGame(undefined,mapId),city.id);
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
