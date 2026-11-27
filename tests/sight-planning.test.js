import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAction,campaignView,chooseBotAction,createGame,getActions,getMap,getSettlementAssessment,getUnitOptions,hexDistance} from '../docs/rules.js';
import {getVisibleTiles} from '../docs/vision.js';

test('a patrol explores, and an unseen enemy capital cannot steer it across the map',()=>{
  let state=createGame(['Bot','Rival'],'la',{seed:4201});
  for(const seat of [0,1]) {
    state=applyAction(state,seat,{type:'found',unit:state.units.find(u=>u.seat===seat).id});
    state=applyAction(state,seat,{type:'end'});
  }
  const [home,enemy]=state.cities;
  const patrol={id:'patrol',seat:0,type:'melee',tile:home.tile,hp:100,maxHp:100,moves:2,maxMoves:2};
  state={...state,units:[patrol],cities:[{...home,queue:{item:'workshop',progress:0,required:15}},enemy]};
  state.players[0].research='industry';
  state.players[0].civic='charter';
  const view=campaignView(state,0), visible=getVisibleTiles(state,0);
  const unknown=getMap(state).tiles.map(tile=>tile.id).filter(id=>!visible.has(id));
  assert.ok(unknown.length>100);
  const order=chooseBotAction(state);
  assert.equal(order.type,'move');
  assert.ok(visible.has(order.tile));
  assert.deepEqual(chooseBotAction(view),order);
  for(const alternate of [unknown[0],unknown.at(-1)]) {
    const hidden={...state,cities:[state.cities[0],{...enemy,tile:alternate,name:'Uncharted rival'}]};
    assert.deepEqual(chooseBotAction(hidden),order);
    assert.deepEqual(getActions(view,0,alternate),[]);
    assert.deepEqual(getActions(state,0,alternate),[]);
    assert.equal(getSettlementAssessment(view,patrol.id,alternate).terrainCost,null);
  }
  const advanced=applyAction(state,0,order);
  assert.ok(Object.keys(advanced.exploration[0]).length>Object.keys(state.exploration[0]).length);
});

test('a settler can check its own site without disclosing a hidden rival town',()=>{
  const state=createGame(['Pioneer','Rival'],'sd',{seed:19});
  const pioneer=state.units[0], location=getMap(state).tiles.find(t=>hexDistance(pioneer.tile,t.id)===3);
  state.cities.push({id:'secret-city',seat:1,name:'Secret city',tile:location.id,buildings:[],hp:100,maxHp:100,population:1});
  const view=campaignView(state,0);
  assert.ok(!view.intel.visible.includes(location.id));
  assert.ok(!JSON.stringify(view).includes('secret-city'));
  assert.equal(getUnitOptions(view,pioneer.id).canFound,true);
  assert.equal(getSettlementAssessment(view,pioneer.id,pioneer.tile).nearestCity,null);
  assert.equal(getSettlementAssessment(view,pioneer.id,pioneer.tile).status,'now');
  const neighbor=getMap(state).tiles.find(t=>hexDistance(pioneer.tile,t.id)===2);
  state.cities[0].tile=neighbor.id;
  const nearby=campaignView(state,0);
  assert.equal(getUnitOptions(nearby,pioneer.id).canFound,false);
  assert.equal(getSettlementAssessment(nearby,pioneer.id,pioneer.tile).nearestCity.id,'secret-city');
});
