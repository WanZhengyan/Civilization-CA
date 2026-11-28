import assert from 'node:assert/strict';
import test from 'node:test';
import {createClassicGame} from './classic-game.js';
import {applyAction,BUILDINGS,UNIT_TYPES,campaignView,chooseBotAction,getBatteryTargets,getMap,getProductionOptions,getProjectSites,migrateGame} from '../docs/rules.js';
import {batteryOrder} from '../docs/city-defenses.js';
import {draftOrder,orderReview} from '../docs/work-orders.js';
import {describeBattle} from '../docs/battle-history.js';

const fresh=()=>createClassicGame(['Pacific','Sierra']);
function buy(state,item,site){
  const city=state.cities[0],option=getProductionOptions(state,city.id,{replace:true}).find(o=>o.item===item);
  return applyAction(state,0,{type:'buyProduction',city:city.id,item,site,...{gold:option.gold,expected:city.productionRevision||0}});
}

test('construction and direct purchases always place city fortifications in the center',()=>{
  let s=fresh();const city=s.cities[0],edge=getMap(s).neighbors(city.tile)[0];s.players[0].capital=500;
  assert.equal(getProjectSites(s,city.id,'walls').length,0);
  s.players[0].technologies=['tactics','motorization'];
  assert.deepEqual(getProjectSites(s,city.id,'walls').map(t=>t.id),[city.tile]);
  assert.ok(!getProductionOptions(s,city.id).some(o=>o.item==='modernWalls'));
  assert.throws(()=>applyAction(s,city.seat,{type:'produce',city:city.id,item:'modernWalls'}),/walls/i);
  assert.throws(()=>buy(s,'walls',edge),/construction tile/);
  assert.throws(()=>applyAction(s,0,{type:'produce',city:city.id,item:'walls',site:edge}),/construction tile/);
  s=buy(s,'walls');assert.equal(s.cities[0].buildingSites.walls,city.tile);
  assert.equal(s.cities[0].hp,150);
  const option=getProductionOptions(s,city.id).find(o=>o.item==='modernWalls');
  const review=orderReview(draftOrder(s.cities[0],option,false),s.cities[0],option,[],String);
  assert.match(review,/City center/);assert.ok(review.includes(city.tile));assert.doesNotMatch(review,/data-work-site/);
  s=buy(s,'modernWalls');assert.equal(s.cities[0].hp,185);assert.equal(s.cities[0].buildingSites.modernWalls,city.tile);
  assert.equal(s.board[city.tile].facility,undefined);
});

test('legacy off-center walls keep health and investment while releasing only their own marker',()=>{
  const old=fresh(),city=old.cities[0],land=getMap(old).neighbors(city.tile)[0];
  city.buildings.push('walls');city.hp=83;city.maxHp=150;city.buildingSites={walls:land};
  old.board[land]={...old.board[land],facility:'walls',facilityCity:city.id};
  const next=migrateGame(old);
  assert.equal(next.cities[0].buildingSites.walls,city.tile);assert.equal(next.cities[0].hp,83);assert.equal(next.cities[0].maxHp,150);
  assert.equal(next.board[land].facility,undefined);assert.equal(old.board[land].facility,'walls');
  assert.equal(migrateGame(next),next);
  const saved=fresh(),host=saved.cities[0];
  host.queue={item:'walls',required:14,progress:8,site:land};
  const resumed=migrateGame(saved);assert.equal(resumed.cities[0].queue.site,host.tile);assert.equal(resumed.cities[0].queue.progress,8);
  assert.equal(saved.cities[0].queue.site,land);
  old.board[land].facility='academy';assert.equal(migrateGame(old).board[land].facility,'academy');
});

function battlefield(){
  const s=fresh(),map=getMap(s),city=s.cities[0];city.buildings=['walls','modernWalls'];s.units=[];
  const [foe,friend,civilian,otherCity,raider]=map.neighbors(city.tile);
  function add(id,type,tile,seat){const def=UNIT_TYPES[type];s.units.push({id,type,tile,seat,hp:def.maxHp,maxHp:def.maxHp,moves:1,maxMoves:def.moves});}
  add('enemy','melee',foe,1); add('friend','ranged',friend,0);add('civilian','settler',civilian,1);add('garrison','melee',otherCity,1);
  s.cities[1].tile=otherCity;s.barbarians={camps:[],parties:[{id:'raiding',type:'raider',tile:raider,hp:8,maxHp:35}],nextPiece:9};
  return {s,city,foe,raider};
}
test('modern city fire uses a visible target, actual health, round, range and city ownership',()=>{
  const {s,city,foe}=battlefield();
  const list=getBatteryTargets(s,0,city.id),t=list.find(t=>t.tile===foe);assert.deepEqual(list.map(t=>t.id),['raiding','enemy']);
  assert.deepEqual(getBatteryTargets(campaignView(s,0),0,city.id),list);
  const shot=batteryOrder(city,s.round,t);
  assert.throws(()=>applyAction(s,0,{...shot,expectedHp:t.hp-1}),/changed/);
  assert.throws(()=>applyAction(s,0,{...shot,target:'garrison'}),/changed/);
  assert.throws(()=>applyAction(s,0,{...shot,round:s.round+1}),/changed/);
  assert.equal(getBatteryTargets(s,1,city.id).length,0);
  assert.equal(getBatteryTargets({...s,teams:[0,0]},0,city.id).some(t=>t.id==='enemy'),false);
  const v=campaignView(s,0);assert.equal(getBatteryTargets({...v,intel:{...v.intel,visible:[city.tile]}},0,city.id).length,0);
  const fired=applyAction(s,0,shot);assert.equal(fired.units.find(u=>u.id===t.id).hp,t.hp-32);
  assert.equal(fired.cities[0].hp,city.hp);assert.equal(fired.actionsLeft,s.actionsLeft);
  assert.throws(()=>applyAction(fired,0,shot),/changed/);
  const report=fired.battleReports[0].at(-1);assert.equal(report.attacker.kind,'city');assert.equal(report.attackMode,'ranged');
  assert.ok(describeBattle(report,s.players,getMap(s),0,'en').source.includes(city.name));
  const advanced=applyAction(applyAction(fired,0,{type:'end'}),1,{type:'end'});
  assert.ok(getBatteryTargets(advanced,0,city.id).length);
  assert.throws(()=>applyAction(advanced,0,shot),/changed/);
});
test('a governor can fire a city battery and defeat a hostile field party without retaliation',()=>{
  const {s,city}=battlefield(),shot=chooseBotAction(s,'hard');
  assert.equal(shot.type,'cityBattery');assert.equal(shot.city,city.id);
  const next=applyAction(s,0,shot);
  assert.equal(next.barbarians.parties.length,0);assert.equal(s.barbarians.parties.length,1);
  assert.equal(next.battleReports[0].at(-1).outcome,'destroyed');assert.equal(next.battleReports[0].at(-1).retaliation,0);
  assert.equal(BUILDINGS.modernWalls.tech,'motorization');
});
