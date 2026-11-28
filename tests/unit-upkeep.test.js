import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassicGame} from './classic-game.js';
import {createGame,getStats,applyAction,campaignView,getProductionOptions,getUpgradePlans,UNIT_TYPES} from '../docs/rules.js';
import {rosterUpkeep,unitUpkeep,ARREARS_REASON} from '../docs/unit-upkeep.js';
import {ledgerBody} from '../docs/resource-ledger.js';
import {RESOURCES} from '../docs/resources.js';

const end=(state,seat)=>applyAction(state,seat,{type:'end'});

test('fresh founding expeditions need no gold and deployed rosters pay net income once per owner harvest',()=>{
  let s=createGame(['A','B'],'la',{seed:23}),bank=s.players[0].capital;
  assert.equal(getStats(s,0).unitMaintenance,0);
  s=end(s,0);assert.equal(s.players[0].capital,bank);
  for(const id of Object.keys(UNIT_TYPES))if(id!=='settler')assert.ok(unitUpkeep(id)>0,id);
  assert.ok(unitUpkeep('melee')<unitUpkeep('riflemen') && unitUpkeep('riflemen')<unitUpkeep('armor'));
  assert.ok(unitUpkeep('cutter')<unitUpkeep('frigate') && unitUpkeep('frigate')<unitUpkeep('destroyer'));
  const historical=createClassicGame(['A','B']), initial=historical.players.map(p=>p.capital);
  const stats=getStats(historical,0);
  assert.equal(stats.unitMaintenance,1);assert.equal(stats.capitalIncome,stats.grossCapitalIncome-1);
  s=end(historical,0);
  assert.equal(s.players[0].capital,initial[0]+stats.capitalIncome);
  assert.equal(s.players[1].capital,initial[1]);assert.equal(historical.players[0].capital,initial[0]);
  assert.equal(campaignView(s,1).players[0].maintenanceArrears,undefined);
});

test('an oversized army carries its unpaid bill, cannot expand payroll and can retire survivors to restore its budget',()=>{
  let s=createClassicGame(['A','B']);
  const me=s.units.find(u=>u.type==='melee' && u.seat===0), base=getStats(s,0).capitalIncome;
  const top='armor',n=Math.ceil((base+5)/unitUpkeep(top)),tiles=Object.keys(s.board);
  for(let i=0;i<n;i++)s.units.push({...me,id:'b'+i,tile:tiles[i],type:top,moves:0});
  s.players[0].capital=0;const bill=-getStats(s,0).capitalIncome;assert.ok(bill>0);
  const hid=campaignView(s,1);assert.equal(hid.players[0].capital,undefined);
  s=end(s,0);
  assert.equal(s.players[0].capital,0);assert.equal(s.players[0].maintenanceArrears,bill);
  assert.equal(s.units.filter(u=>u.seat===0 && u.type===top).length,n);
  s=end(JSON.parse(JSON.stringify(s)),1);
  const c=s.cities.find(c=>c.seat===0);
  let opts=getProductionOptions(s,c.id);
  const scout=opts.find(o=>o.item==='scout');
  assert.equal(scout.upkeep,1);assert.equal(scout.enabled,false);assert.equal(scout.buyReason,ARREARS_REASON);
  assert.equal(opts.find(o=>o.item==='granary').enabled,true);
  assert.throws(()=>applyAction(s,0,{type:'produce',city:c.id,item:'scout'}),/maintenance/);
  assert.throws(()=>applyAction(s,0,{type:'buyProduction',city:c.id,item:'scout',expected:0,gold:scout.gold}),/maintenance/);
  assert.throws(()=>applyAction(s,0,{type:'retireUnit',unit:me.id,expectedType:'armor'}),/you control/);
  assert.throws(()=>applyAction(s,0,{type:'retireUnit',unit:s.units.find(u=>u.seat===1 && u.type==='melee').id,expectedType:'melee'}),/you control/);
  assert.equal(getUpgradePlans(s,me.id,0)[0].blockers.includes(ARREARS_REASON),true);
  for(let i=0;i<n;i++)s=applyAction(s,0,{type:'retireUnit',unit:'b'+i,expectedType:top});
  const net=getStats(s,0).capitalIncome;
  s=end(s,0);assert.equal(s.players[0].maintenanceArrears || 0,Math.max(0,bill-net));assert.equal(s.players[0].capital,Math.max(0,net-bill));
  while(s.players[0].maintenanceArrears){s=end(s,1);s=end(s,0);}
  s=end(s,1);opts=getProductionOptions(s,c.id);
  assert.equal(opts.find(o=>o.item==='scout').enabled,true);
});

test('the treasury lists owned payroll and unit costs without exposing another seat',()=>{
  const s=createClassicGame(['A','B']);s.units=s.units.map(u=>u.seat===1 && u.type==='melee'?{...u,type:'destroyer'}:u);
  const stats=getStats(s,0), accounts=Object.fromEntries(Object.keys(RESOURCES).map(k=>[k,{stock:0,income:0}]));
  const html=ledgerBody(s,0,accounts,null,false,String,stats);
  assert.match(html,/Income before upkeep/);assert.match(html,/Roster upkeep/);assert.match(html,/Militia × 1/);
  assert.match(html,/Review retirement/);assert.doesNotMatch(html,/Escort Destroyer/);
  assert.equal(rosterUpkeep(s.units,1),unitUpkeep('destroyer'));
  assert.equal(getProductionOptions(s,s.cities[0].id).find(o=>o.item==='melee').upkeep,1);
});
