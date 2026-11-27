import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createClassicGame} from './classic-game.js';
import {applyAction,getCityYield,getCivicOptions,getPopulationReport,getStats} from '../docs/rules.js';

const fresh=()=>createClassicGame(['West','East']);
const choose=(state,item)=>applyAction(state,0,{type:'civic',item});
const round=state=>applyAction(applyAction(state,0,{type:'end'}),1,{type:'end'});

test('regional civic branches pay culture and honor all predecessors',()=>{
  let s=fresh(); s.players[0].culture=100;
  assert.equal(getCivicOptions(s,0).filter(o=>o.item==='housingTrust')[0].locked,true);
  for (const id of ['publicWorks','irrigationDistricts','charter']) s=choose(s,id);
  assert.throws(()=>choose(s,'housingTrust'),/County Federation/);
  assert.equal(s.players[0].culture,77);
  s=choose(choose(s,'federation'),'housingTrust');
  assert.equal(getPopulationReport(s,s.cities[0].id).housing,5);
});

test('county projects use worked land, residents, campuses and each city’s true buildings',()=>{
  const s=fresh(),city=s.cities[0]; city.buildings.push('harbor','ucla');city.population=3; s.board[city.tile].improvement='orchard';
  const income=getStats(s,0), output=getCityYield(s,city.id);
  s.players[0].civics=['irrigationDistricts','exposition','harborCommission','normalSchools'];
  const updated=getStats(s,0),worked=getCityYield(s,city.id);
  assert.equal(updated.cultureIncome,income.cultureIncome+2);
  assert.equal(updated.influenceIncome,income.influenceIncome+2);
  assert.equal(updated.scienceIncome,income.scienceIncome+2);
  assert.equal(updated.capitalIncome,income.capitalIncome+3);
  assert.equal(worked.food,output.food+2);
  assert.equal(worked.influence,output.influence+2);
  assert.equal(worked.capital,output.capital+3);
  s.board[city.tile].pillaged=true;
  const stalled=getCityYield(s,city.id).food;
  s.players[0].civics=[];
  assert.equal(getCityYield(s,city.id).food,stalled);
});

test('mutual aid doubles damaged city recovery without crossing maximum health',()=>{
  let s=fresh(); s.players[0].culture=100; s.cities[0].hp-=17;
  s=choose(choose(s,'charter'),'mutualAid');
  s=round(s);assert.equal(s.cities[0].hp,s.cities[0].maxHp-5);
  s=round(s);assert.equal(s.cities[0].hp,s.cities[0].maxHp);
});
