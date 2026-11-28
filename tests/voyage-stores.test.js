import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAction,campaignView,createGame,getRouteDetail,getUnitOptions,hexDistance,UNIT_TYPES} from '../docs/rules.js';
import {voyageAllowance,voyageQuote} from '../docs/voyage-stores.js';

function launched() {
  let s=createGame(['Coast','Valley'],'la',{seed:17,mapSize:'large',victoryMode:'conquest'});
  s.campaignVariety=1;
  while(!s.units.some(u=>u.seat===0 && u.type==='cutter') || s.turn!==0){
    assert.ok(s.round<16);
    const c=s.cities.find(c=>c.seat===s.turn);
    let a={type:'end'};
    if(!c)a={type:'found',unit:s.units.find(u=>u.seat===s.turn && u.type==='settler').id};
    else if(s.turn===0 && !c.queue)a=c.portTile?{type:'produce',city:c.id,item:'cutter'}:{type:'produce',city:c.id,item:'harbor',site:'9,19'};
    s=applyAction(s,s.turn,a);
  }
  return s;
}
function turn(s){do{s=applyAction(s,s.turn,{type:'end'})}while(s.turn!==0);return s}

test('a newly launched ship can buy one longer sailing turn and its normal budget returns next round',()=>{
  let s=launched();
  const ship=s.units.find(u=>u.type==='cutter'),price=voyageQuote(s,ship,UNIT_TYPES.cutter);
  assert.equal(price.price,6);assert.equal(price.after,5);assert.equal(price.ready,true);
  let extra=applyAction(s,0,{type:'provisionVoyage',unit:ship.id});
  assert.equal(extra.players[0].capital,s.players[0].capital-6);
  assert.equal(extra.units.find(u=>u.id===ship.id).moves,0);
  assert.equal(ship.moves,3);
  assert.throws(()=>applyAction(extra,0,{type:'provisionVoyage',unit:ship.id}));
  assert.ok(!campaignView(extra,1).units.some(u=>u.voyageStores));
  extra=turn(JSON.parse(JSON.stringify(extra)));
  const stocked=extra.units.find(u=>u.id===ship.id);
  assert.equal(stocked.moves,5);assert.equal(voyageAllowance(stocked),5);
  const normal=turn(s);assert.equal(normal.units.find(u=>u.id===ship.id).moves,3);
  const start=ship.tile;
  // Reveal the next ring after each single-hex order, as on the player's map.
  const sailOut=state=>{
    const u=state.units.find(u=>u.id===ship.id);
    if(!u.moves)return state;
    const view=campaignView(state,0);
    for(const tile of getUnitOptions(view,ship.id).moves){
      if(getRouteDetail(view,ship.id,tile).cost!==1 || hexDistance(start,tile)!==6-u.moves)continue;
      const result=sailOut(applyAction(state,0,{type:'move',unit:ship.id,tile}));
      if(result)return result;
    }
  };
  extra=sailOut(extra);assert.ok(extra);
  assert.equal(extra.units.find(u=>u.id===ship.id).moves,0);
  assert.equal(hexDistance(start,extra.units.find(u=>u.id===ship.id).tile),5);
  const reset=turn(extra).units.find(u=>u.id===ship.id);
  assert.equal(reset.moves,3);assert.equal(voyageAllowance(reset),3);
});

test('a crew needs gold, its own completed berth and a new-rules campaign to buy stores',()=>{
  let s=launched();const ship=s.units.find(u=>u.type==='cutter'),order={type:'provisionVoyage',unit:ship.id};
  const poor=structuredClone(s);poor.players[0].capital=5;
  assert.equal(voyageQuote(poor,ship,UNIT_TYPES.cutter).ready,false);
  assert.throws(()=>applyAction(poor,0,order));
  const away=applyAction(s,0,{type:'move',unit:ship.id,tile:getUnitOptions(s,ship.id).moves[0]});
  assert.throws(()=>applyAction(away,0,order));
  const foreign=structuredClone(s);foreign.cities.find(c=>c.seat===0).seat=1;foreign.teams=[0,0];
  assert.throws(()=>applyAction(foreign,0,order));
  delete s.campaignVariety;
  assert.equal(voyageQuote(s,ship,UNIT_TYPES.cutter),null);
  assert.throws(()=>applyAction(s,0,order));
});
