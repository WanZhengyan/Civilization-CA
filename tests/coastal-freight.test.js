import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAction,campaignView,createGame,getFreightManifest,getMap,getUnitOptions} from '../docs/rules.js';
import {freightPanel} from '../docs/harbor-ledger-ui.js';

function twoPorts() {
  let s=createGame(['Coast','Valley'],'la',{seed:17,mapSize:'large',victoryMode:'conquest'});
  s.campaignVariety=1;
  const unit=type=>s.units.find(u=>u.seat===0 && u.type===type);
  const city=()=>s.cities.filter(c=>c.seat===0);
  const order=a=>{s=applyAction(s,s.turn,a)};
  const until=condition=>{
    while(s.turn!==0 || !condition()){
      assert.ok(s.round<25);
      if(s.turn===1 && !s.cities.some(c=>c.seat===1))order({type:'found',unit:s.units.find(u=>u.seat===1).id});
      order({type:'end'});
    }
  };
  order({type:'found',unit:unit('settler').id});
  order({type:'produce',city:city()[0].id,item:'harbor',site:'9,19'});
  until(()=>city()[0].portTile);
  order({type:'produce',city:city()[0].id,item:'settler'});
  until(()=>unit('settler'));
  order({type:'move',unit:unit('settler').id,tile:'9,17'});
  order({type:'produce',city:city()[0].id,item:'workboat'});
  until(()=>unit('settler').moves);
  order({type:'move',unit:unit('settler').id,tile:'9,16'});
  order({type:'found',unit:unit('settler').id});
  order({type:'produce',city:city()[1].id,item:'harbor',site:'8,16'});
  until(()=>city()[1].portTile && city()[0].food>=4 && unit('workboat').moves);
  return s;
}

test('two new cities build harbors and physically ship four food for the distance-based tariff',()=>{
  let s=twoPorts();
  const [source,dest]=s.cities.filter(c=>c.seat===0),crew=s.units.find(u=>u.type==='workboat');
  const manifest=getFreightManifest(s,crew);
  assert.equal(manifest.ready,true);
  assert.deepEqual(manifest.routes,[{id:dest.id,name:dest.name,berth:'8,16',steps:3,gold:5}]);
  const markup=freightPanel(manifest,String,()=>'',false);
  assert.match(markup,/8,16/);assert.match(markup,/3 hexes/);assert.match(markup,/\+5/);
  const loaded=applyAction(s,0,{type:'loadFreight',unit:crew.id});
  assert.equal(loaded.cities.find(c=>c.id===source.id).food,source.food-4);
  assert.equal(loaded.units.find(u=>u.id===crew.id).moves,0);
  assert.throws(()=>applyAction(loaded,0,{type:'loadFreight',unit:crew.id}));
  function nextTurn(state){do{state=applyAction(state,state.turn,{type:'end'})}while(state.turn!==0);return state}
  s=nextTurn(loaded);
  const refunded=applyAction(s,0,{type:'returnFreight',unit:crew.id});
  assert.equal(refunded.players[0].capital,s.players[0].capital);
  assert.equal(refunded.cities.find(c=>c.id===source.id).food,s.cities.find(c=>c.id===source.id).food+4);
  assert.throws(()=>applyAction(s,0,{type:'haulFish',unit:crew.id}));
  assert.deepEqual(getUnitOptions(s,crew.id).improvements,[]);
  s=nextTurn(applyAction(s,0,{type:'move',unit:crew.id,tile:dest.portTile}));
  const rival=campaignView(s,1);
  assert.ok(!rival.units.some(u=>u.freight));assert.ok(!rival.log.some(e=>e.type==='loadFreight'));
  const delivered=applyAction(JSON.parse(JSON.stringify(s)),0,{type:'landFreight',unit:crew.id});
  assert.equal(delivered.cities.find(c=>c.id===dest.id).food,s.cities.find(c=>c.id===dest.id).food+4);
  assert.equal(delivered.players[0].capital,s.players[0].capital+5);
  assert.throws(()=>applyAction(delivered,0,{type:'landFreight',unit:crew.id}));
});

test('only a charted allied harbor can receive food; its city stores and cargo stay private',()=>{
  const s=twoPorts(),crew=s.units.find(u=>u.type==='workboat'),dest=s.cities.filter(c=>c.seat===0)[1];
  dest.seat=1;s.teams=[0,0];
  const view=campaignView(s,0);
  assert.deepEqual(view.intel.alliedFreightPorts,[{id:dest.id,seat:1,name:dest.name,portTile:dest.portTile}]);
  assert.equal(view.cities.find(c=>c.id===dest.id).food,undefined);
  const privateChart=new Set([crew.tile,dest.portTile]);
  // The seat cannot trace the connection from the destination alone.
  view.campaignVariety=1;view.intel.visible=[...privateChart];view.intel.explored=[...privateChart];
  assert.equal(getFreightManifest(view,view.units.find(u=>u.id===crew.id)).ready,false);
  const loaded=applyAction(s,0,{type:'loadFreight',unit:crew.id});
  const delivery=structuredClone(loaded);
  const carrier=delivery.units.find(u=>u.id===crew.id);carrier.tile=dest.portTile;carrier.moves=1;
  const finish=applyAction(delivery,0,{type:'landFreight',unit:crew.id});
  assert.equal(finish.cities.find(c=>c.id===dest.id).food,dest.food+4);assert.equal(finish.players[1].capital,delivery.players[1].capital);
  delivery.teams=[0,1];
  assert.throws(()=>applyAction(delivery,0,{type:'landFreight',unit:crew.id}));
  delete s.campaignVariety;
  assert.equal(getFreightManifest(s,crew),null);
  assert.throws(()=>applyAction(s,0,{type:'loadFreight',unit:crew.id}));
});

test('remembering a distant water tile cannot reveal a newly built allied berth there',()=>{
  const s=twoPorts(),crew=s.units.find(u=>u.type==='workboat'),dest=s.cities.filter(c=>c.seat===0)[1];
  dest.seat=1;s.teams=[0,0];
  const visible=new Set(campaignView(s,0).intel.visible);
  const hidden=getMap(s).tiles.find(t=>t.terrain==='ocean' && !visible.has(t.id));
  dest.portTile=hidden.id;
  s.exploration[0]=Object.fromEntries(getMap(s).tiles.map(t=>[t.id,null]));
  const projected=campaignView(s,0);
  assert.deepEqual(projected.intel.alliedFreightPorts,[]);
  assert.deepEqual(getFreightManifest(s,crew).routes,[]);
});
