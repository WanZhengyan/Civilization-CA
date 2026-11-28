import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAction,campaignView,chooseBotActionFromView,createGame,getMap,getUnitOptions,hexDistance,UNIT_TYPES} from '../docs/rules.js';
import {navalStoresOrder} from '../docs/voyage-stores.js';

// Two founding settlers. The rival settles across a crooked channel. A scout
// spots that city before the cutter charts the channel and returns to port.
function bayOpening(){
  let state=createGame(['Coast','Bank'],'sf',{seed:5,mapSize:'large',victoryMode:'conquest'});
  state.fieldCommandRevision=1;
  const order=a=>{state=applyAction(state,state.turn,a);};
  const end=()=>order({type:'end'});
  const nextTurn=()=>{end();end();assert.ok(state.round<30);};
  const unit=type=>state.units.find(u=>u.seat===state.turn && u.type===type);
  function walk(type,tiles){
    for(const tile of tiles.split(' ')){
      while(!getUnitOptions(campaignView(state,state.turn),unit(type).id).moves.includes(tile))nextTurn();
      order({type:'move',unit:unit(type).id,tile});
    }
  }
  order({type:'found',unit:unit('settler').id});end();
  walk('settler','24,24 23,24 22,24 21,24 20,24 19,23 19,22 18,21 18,20');
  order({type:'found',unit:unit('settler').id});end();
  function commission(item,site){
    order({type:'produce',city:state.cities[0].id,item,site});
    while(state.cities[0].queue)nextTurn();
  }
  commission('harbor','16,16');commission('scout');
  walk('scout','15,17 16,17 17,18');
  commission('cutter');
  walk('cutter','17,16 17,17 18,18 18,19 18,18 17,17 17,16 16,16');
  nextTurn();walk('cutter','17,16 16,16');
  assert.equal(unit('cutter').moves,1);
  assert.equal(state.round,17);
  return state;
}
function observed(state){
  return {...campaignView(state,state.turn),fieldCommandRevision:state.fieldCommandRevision};
}
function orderStores(view){
  const ship=view.units.find(u=>u.type==='cutter' && u.seat===0);
  return navalStoresOrder(view,ship,UNIT_TYPES,getMap(view),hexDistance);
}

test('a governor brings a charted sortie back into sight and lands its first hit on the next turn',()=>{
  let state=bayOpening();
  const view=observed(state),ship=view.units.find(u=>u.type==='cutter'),target=view.cities.find(c=>c.seat===1);
  const order=orderStores(view);
  assert.equal(order.type,'provisionVoyage');
  assert.equal(orderStores({...view,fieldCommandRevision:undefined}),null);
  state=applyAction(state,0,order);
  assert.equal(state.players[0].capital,view.players[0].capital-6);
  const planned=state.units.find(u=>u.id===ship.id).voyagePlan;
  assert.deepEqual(planned,{station:'18,19',target:target.tile});
  assert.ok(!campaignView(state,1).units.some(u=>u.voyagePlan));
  state=JSON.parse(JSON.stringify(state));
  let sailedFromMemory=false,hit=false;
  for(let n=0;n<100 && !hit && state.round<=18;n++){
    const active=observed(state);
    const move=state.turn===0?chooseBotActionFromView(active):{type:'end'};
    if(move.unit===ship.id && move.type==='move' && !active.intel.visible.includes(target.tile)){
      const changed=structuredClone(state);
      changed.cities.find(city=>city.tile===target.tile).hp=1;
      const hidden=observed(changed);
      assert.deepEqual(hidden,active);
      assert.deepEqual(chooseBotActionFromView(hidden),move);
      sailedFromMemory=true;
    }
    if(move.unit===ship.id && move.type==='attack' && move.tile===target.tile){
      assert.equal(state.round,18);
      assert.ok(active.intel.visible.includes(target.tile));hit=true;
    }
    state=applyAction(state,state.turn,move);
  }
  assert.ok(sailedFromMemory);assert.ok(hit);
  assert.equal(state.battleReports[0].at(-1).damage,36);
  assert.equal(state.battleReports[0].at(-1).retaliation,0);
  while(state.turn!==0 || state.round<19)state=applyAction(state,state.turn,{type:'end'});
  assert.ok(!state.units.find(u=>u.id===ship.id).voyagePlan);
});

test('a captain reserves six gold only for a shorter, unobstructed firing approach',()=>{
  const view=observed(bayOpening());
  function refuses(edit){
    const changed=structuredClone(view);edit(changed);
    assert.equal(orderStores(changed),null);
  }
  refuses(s=>{s.players[0].capital=17;});
  refuses(s=>{s.cities.find(c=>c.seat===1).hp=1;});
  refuses(s=>{s.intel.visible=s.intel.visible.filter(id=>id!=='18,20');});
  refuses(s=>{s.intel.explored=s.intel.explored.filter(id=>hexDistance(id,'16,16')<=2);});
  refuses(s=>{s.units.push({id:'blocker',seat:0,type:'workboat',tile:'18,19'});});
  refuses(s=>{s.cities.find(c=>c.seat===1).tile='17,18';});
  refuses(s=>{s.units.push({id:'threat',seat:1,type:'melee',tile:s.cities[0].tile});});
});
