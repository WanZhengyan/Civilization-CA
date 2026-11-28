import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassicGame} from './classic-game.js';
import {UNIT_TYPES,applyAction,getUnitOptions} from '../docs/rules.js';
import {advancementRoutes} from '../docs/unit-service.js';
function fixture(){
  const state=createClassicGame(['West','East']);
  const unit=state.units.find(u=>u.seat===0 && u.type==='melee');
  return {state,unit};
}
test('legacy unit identities keep their original direct advancement and price',()=>{
  assert.deepEqual(advancementRoutes('melee',UNIT_TYPES)[0],{to:'riflemen',cost:10});
  assert.deepEqual(advancementRoutes('cavalry',UNIT_TYPES)[0],{to:'armor',cost:18});
  assert.deepEqual(advancementRoutes('settler',UNIT_TYPES),[]);
});

import {getUpgradePlans} from '../docs/rules.js';
test('owned locked plans disclose every gate, costs and real funds even after movement is spent',()=>{
  const {state,unit}=fixture(); unit.moves=0;state.board[unit.tile].owner=null;state.players[0].capital=4;
  const plan=getUpgradePlans(state,unit.id,0)[0];
  assert.equal(plan.to,'riflemen');assert.equal(plan.tech,'ballistics');assert.equal(plan.techReady,false);
  assert.equal(plan.qualified,false);assert.equal(plan.legalSite,false);assert.equal(plan.moves,0);
  assert.equal(plan.cost,10);assert.equal(plan.capital,4);assert.equal(plan.blockers.length,4);
  assert.deepEqual(getUpgradePlans(state,unit.id,1),[]);
});

test('the authority accepts only the selected valid promotion and rejects stale orders atomically',()=>{
  const {state,unit}=fixture();state.players[0].technologies=['tactics','ballistics'];
  const before=JSON.stringify(state);
  for(const item of ['armor','__proto__',null]) assert.throws(()=>applyAction(state,0,{type:'upgrade',unit:unit.id,item}));
  assert.equal(JSON.stringify(state),before);
  const next=applyAction(state,0,{type:'upgrade',unit:unit.id,item:'riflemen'});
  assert.equal(next.units.find(u=>u.id===unit.id).type,'riflemen');
  assert.throws(()=>applyAction(next,0,{type:'upgrade',unit:unit.id,item:'riflemen'}));
  assert.equal(next.players[0].capital,state.players[0].capital-10);
});

test('infantry can specialize through a civic, while scouts choose two distinct discoveries',()=>{
  const {state,unit}=fixture();
  const pike=()=>getUpgradePlans(state,unit.id,0).find(p=>p.to==='pikes');
  assert.equal(pike().civic,'mutualAid');assert.equal(pike().enabled,false);
  state.players[0].civics=['mutualAid'];assert.equal(pike().enabled,true);
  const n=applyAction(state,0,{type:'upgrade',unit:unit.id,item:'pikes'});
  assert.equal(n.units.find(u=>u.id===unit.id).type,'pikes');
  unit.type='scout';state.players[0].technologies=['tactics'];
  const plans=getUpgradePlans(state,unit.id,0);
  assert.deepEqual(plans.map(o=>[o.to,o.enabled]),[['skirmisher',true],['cavalry',false]]);
});

import {getMap} from '../docs/rules.js';
test('ships may refit only on friendly or neutral water beside their own operational yard',()=>{
  const {state,unit}=fixture();const home=state.cities[0];
  unit.type='cutter';
  unit.tile=getMap(state).tiles.find(t=>t.terrain==='ocean').id;home.portTile=unit.tile;
  home.buildings=['harbor'];state.players[0].capital=20;state.players[0].technologies=['industry','steam'];
  const plan=()=>getUpgradePlans(state,unit.id,0).find(p=>p.to==='frigate');
  assert.equal(plan().enabled,false);
  home.buildings.push('shipyard');assert.equal(plan().enabled,true);
  const upgraded=applyAction(state,0,{type:'upgrade',unit:unit.id,item:'frigate'});
  assert.equal(upgraded.units.find(u=>u.id===unit.id).type,'frigate');
  state.board[unit.tile].owner=1;assert.equal(plan().enabled,false);
  state.board[unit.tile].owner=null; home.seat=1;assert.equal(plan().enabled,false);
});

test('wounded veteran health forecast exactly matches authoritative refit and preserves naval mobility research',()=>{
  const {state,unit}=fixture();const home=state.cities[0];
  unit.type='cutter';unit.maxHp=105;unit.hp=43;
  unit.tile=getMap(state).tiles.find(t=>t.terrain==='ocean').id;
  home.portTile=unit.tile;home.buildings=['harbor','shipyard'];
  state.players[0].capital=24;state.players[0].technologies=['industry','steam','hydrography'];
  const plan=getUpgradePlans(state,unit.id,0).find(p=>p.to==='frigate');
  assert.equal(plan.outcome.hp,53);assert.equal(plan.outcome.maxHp,130);assert.equal(plan.outcome.maxMoves,4);
  const upgraded=applyAction(state,0,{type:'upgrade',unit:unit.id,item:'frigate'}).units.find(u=>u.id===unit.id);
  for(const key of ['hp','maxHp','moves','maxMoves'])assert.equal(upgraded[key],plan.outcome[key]);
});

import {getRecoveryForecast} from '../docs/rules.js';
function advance(state){return applyAction(applyAction(state,0,{type:'end'}),1,{type:'end'});}
test('the next-turn healing forecast matches automatic city, field, and no-service recovery exactly',()=>{
  const {state,unit}=fixture();const home=state.cities[0];unit.hp=70;unit.tile=home.tile;unit.moves=0;
  assert.equal(getRecoveryForecast(state,unit.id,0).gain,12);assert.equal(advance(state).units.find(u=>u.id===unit.id).hp,82);
  unit.hp=97;unit.moves=1;assert.equal(getRecoveryForecast(state,unit.id,0).gain,3);
  assert.equal(getRecoveryForecast(state,unit.id,0).canRest,false);
  assert.throws(()=>applyAction(state,0,{type:'recover',unit:unit.id}),/wounded/);
  const field=Object.keys(state.board).find(t=>state.board[t].owner===0 && t!==home.tile);
  unit.tile=field;unit.hp=70;assert.equal(getRecoveryForecast(state,unit.id,0).gain,0);
  state.players[0].technologies=['fieldMedicine'];
  assert.equal(getRecoveryForecast(state,unit.id,0).station,'field');assert.equal(advance(state).units.find(u=>u.id===unit.id).hp,76);
  assert.equal(getRecoveryForecast(state,unit.id,1),null);
});

test('recovery directions identify only owned cities or owned ports and show true hex distance',()=>{
 const {state,unit}=fixture();const home=state.cities[0],enemy=state.cities[1];
 unit.tile=enemy.tile;assert.equal(getRecoveryForecast(state,unit.id,0).nearest.name,home.name);
 unit.type='cutter';assert.equal(getRecoveryForecast(state,unit.id,0).nearest,null);
 home.portTile=getMap(state).tiles.find(t=>t.terrain==='ocean').id;unit.tile=home.portTile;unit.hp=40;
 const report=getRecoveryForecast(state,unit.id,0);
 assert.equal(report.nearest.tile,home.portTile);assert.equal(report.nearest.hexes,0);
 assert.equal(report.station,'harbor');assert.equal(report.gain,12);
});

test('a deliberate rest spends remaining movement, applies once next turn, and rejects illegal rests',()=>{
  const {state,unit}=fixture();const id=unit.id;
  assert.throws(()=>applyAction(state,0,{type:'recover',unit:id}),/wounded/);
  unit.hp=60;state.board[unit.tile].owner=1;assert.throws(()=>applyAction(state,0,{type:'recover',unit:id}),/wounded/);
  state.board[unit.tile].owner=null;
  if(state.cities.some(c=>c.tile===unit.tile))unit.tile=Object.keys(state.board).find(t=>state.board[t].owner===null && !state.cities.some(c=>c.tile===t));
  const order=applyAction(state,0,{type:'recover',unit:id});
  assert.equal(order.units.find(u=>u.id===id).moves,0);assert.equal(unit.moves,2);
  assert.throws(()=>applyAction(order,0,{type:'recover',unit:id}));
  const forecast=getRecoveryForecast(order,id,0);assert.equal(forecast.gain,4);assert.equal(forecast.resting,true);
  const next=advance(order);assert.equal(next.units.find(u=>u.id===id).hp,64);
  assert.equal(getRecoveryForecast(next,id,0).gain,0);
  unit.type='cutter';assert.equal(getRecoveryForecast(state,id,0).canRest,false);
});

import {advancementPanel} from '../docs/unit-service-ui.js';
test('selected-unit panel names locked discoveries and shows each path’s real cost, purse and resulting health',()=>{
  const {state,unit}=fixture();const markup=advancementPanel(getUpgradePlans(state,unit.id,0),'open');
  for(const label of ['Upgrade paths','Pike Guard','Ballistics','Price in capital','Treasury','Remaining movement','Upgrade to']) {
    assert.ok(markup.includes(label),label);
  }
  assert.match(markup,/data-order="upgrade:riflemen" disabled/);assert.match(markup,/110 \/ 110/);
});

import {recoveryPanel} from '../docs/unit-service-ui.js';
test('wounded-unit panel reports the timing, actual next HP, rest order and safe station direction',()=>{
  const {state,unit}=fixture();unit.tile=state.cities[0].tile;unit.hp=65;
  state.cities[0].name='<custom city>';
  const markup=recoveryPanel(unit,getRecoveryForecast(state,unit.id,0));
  for(const value of ['At the start of your next turn','77 / 100','+12','+16','data-order="recover"','data-order="locate-care"','&lt;custom city&gt;'])assert.ok(markup.includes(value),value);
  assert.ok(!markup.includes('<custom city>'));
});

import {translate} from '../docs/i18n.js';
import {advancementGuide,recoveryGuide} from '../docs/unit-service-copy.js';
test('both languages cover the actual service orders, rules, blockers and locations',()=>{
 for(const term of [...advancementGuide,...recoveryGuide,'Own shipyard waters','Next recovery','Rest this turn','The unit is resting until its next turn.']){
   assert.match(translate(term,'zh-CN'),/[\u4e00-\u9fff]/,term);
   assert.equal(translate(term,'en'),term);
 }
});

test('paths expose subsequent upgrades, and the comparison displays the original and target stats',()=>{
 const {state,unit}=fixture();const plans=getUpgradePlans(state,unit.id,0);
 assert.deepEqual(plans.find(p=>p.to==='riflemen').future,['armor']);
 const panel=advancementPanel(plans);
 for(const s of ['Later upgrades','Armored Column','42 → 55','Price in capital','Spends all remaining movement'])assert.ok(panel.includes(s),s);
});

import {handbookRows} from '../docs/army-handbook.js';
test('the army handbook and field orders publish the same branches and prices',()=>{
  for(const era of ['frontier','industrial','modern']) for(const row of handbookRows(era)){
    const id=Object.keys(UNIT_TYPES).find(k=>UNIT_TYPES[k].name===row.name);
    assert.deepEqual(row.routes,advancementRoutes(id,UNIT_TYPES).map(r=>({name:UNIT_TYPES[r.to].name,cost:r.cost})));
  }
});

import {newTeamPhase} from '../docs/team-turns.js';
test('an active teammate can refit or rest before the lead seat passes; recovery waits for the next team phase',()=>{
  const state=createClassicGame(['First','Second','Rival']);
  state.teams=[0,0,1];state.teamPhase=newTeamPhase(state,0,()=>2);
  const unit=state.units.find(u=>u.seat===1 && u.type==='melee');
  unit.tile=state.cities.find(c=>c.seat===1).tile;unit.hp=66;
  state.players[1].technologies=['tactics','ballistics'];
  assert.ok(getUpgradePlans(state,unit.id,1).some(p=>p.to==='riflemen' && p.enabled));
  assert.equal(getRecoveryForecast(state,unit.id,1).canRest,true);
  let s=applyAction(state,1,{type:'recover',unit:unit.id});
  s=applyAction(s,1,{type:'end'});s=applyAction(s,0,{type:'end'});
  assert.equal(s.units.find(u=>u.id===unit.id).hp,66);
  assert.equal(getRecoveryForecast(s,unit.id,1).canRest,false);
  s=applyAction(s,2,{type:'end'});
  assert.equal(s.units.find(u=>u.id===unit.id).hp,82);
});
