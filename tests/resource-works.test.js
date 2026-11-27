import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame, getMap, applyAction, getUnitOptions, getCityYield, getWorkingCity, UNIT_TYPES, neighbors} from '../docs/rules.js';
function fixture() {
  let s=createGame(['Harvester','Visitor'],'la',{seed:51});
  s.cities=[];s.units=[];s.turn=0;
  const city={id:'orchard-town',name:'Market town',seat:0,tile:'9,6',hp:100,maxHp:100,food:0,population:1,buildings:[],queue:null};
  const tile=neighbors(city.tile).find(id=>getMap(s).byId[id].terrain==='urban');
  const def=UNIT_TYPES.builder;
  const u={id:'builder',seat:0,type:'builder',tile,moves:def.moves,maxMoves:def.moves,hp:def.maxHp,maxHp:def.maxHp,charges:2};
  s.cities=[city];s.units=[u];
  s.board[city.tile]={owner:0,level:1};s.board[tile]={owner:0,level:0,resource:'citrus'};
  return {s,city,u,tile};
}
test('a builder must use the correct work on a deposit and the city gets its food',()=>{
  const {s,city,u,tile}=fixture();
  const before=getCityYield(s,city.id);
  assert.deepEqual(getUnitOptions(s,u.id).improvements,['orchard']);
  assert.throws(()=>applyAction(s,0,{type:'improve',unit:u.id,item:'mine'}));
  const next=applyAction(s,0,{type:'improve',unit:u.id,item:'orchard'});
  assert.equal(s.board[tile].improvement,undefined);
  assert.equal(next.units[0].charges,1);
  assert.equal(next.units[0].moves,0);
  assert.equal(getCityYield(next,city.id).food-before.food,3);
  assert.equal(getWorkingCity(next,tile).id,city.id);
  next.board[tile]={...next.board[tile],owner:1};
  // The worker is reassigned when the tile changes hands. Compare two cities
  // with identical remaining territory to isolate the orchard's contribution.
  const lost={...s,board:{...s.board,[tile]:{...s.board[tile],owner:1}}};
  assert.equal(getCityYield(next,city.id).food,getCityYield(lost,city.id).food);
});
test('distant, rival or reserved campus sites cannot be improved',()=>{
  const {s,u,tile,city}=fixture();
  s.board[tile].owner=1;
  assert.deepEqual(getUnitOptions(s,u.id).improvements,[]);
  s.board[tile].owner=0;
  city.queue={item:'campus',site:tile};
  assert.deepEqual(getUnitOptions(s,u.id).improvements,[]);
  city.queue=null;s.board[tile].wonder='ucla';
  assert.deepEqual(getUnitOptions(s,u.id).improvements,[]);
  delete s.board[tile].wonder;city.tile='16,12';
  assert.equal(getWorkingCity(s,tile),null);
  assert.deepEqual(getUnitOptions(s,u.id).improvements,[]);
});
