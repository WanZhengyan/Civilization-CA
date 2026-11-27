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

import {policyOptions} from '../docs/policy.js';
import {campaignView} from '../docs/rules.js';
import {translate} from '../docs/i18n.js';
const policy=(s,id)=>applyAction(s,0,{type:'policy',item:id});

test('one ruling program is private, paid only on changes, and carries through reload',()=>{
  let s=fresh();
  const city=s.cities[0],base=getCityYield(s,city.id),before=s.players[0].influence;
  assert.throws(()=>policy(s,'contracts'),/Civic required/);
  s.players[0].civics=['publicWorks','irrigationDistricts'];
  s=policy(s,'contracts');
  assert.equal(s.players[0].influence,before);
  assert.equal(getCityYield(s,city.id).food,base.food-1);
  assert.equal(getCityYield(s,city.id).production,base.production+3);
  assert.throws(()=>policy(s,'relief'),/already voted/);
  assert.equal(campaignView(s,1).players[0].policy,undefined);
  assert.ok(campaignView(s,0).log.some(e=>e.type==='policy'));
  s=JSON.parse(JSON.stringify(round(s)));
  const bank=s.players[0].influence;
  s=policy(s,'relief');
  assert.equal(s.players[0].influence,bank-3);
  assert.equal(getCityYield(s,city.id).production,base.production);
  assert.equal(getCityYield(s,city.id).food,base.food+2);
});

test('adopted stances modify banked income and council labels translate',()=>{
  let s=fresh(); s.players[0].civics=['normalSchools','charter'];
  const base=getStats(s,0);
  s=policy(s,'grants');
  const changed=getStats(s,0);
  assert.equal(changed.scienceIncome,base.scienceIncome+2);
  assert.equal(changed.capitalIncome,base.capitalIncome-2);
  const bank=s.players[0].capital;
  s=round(s);assert.equal(s.players[0].capital,bank+changed.capitalIncome);
  s.players[0].influence=2;
  assert.throws(()=>policy(s,'balanced'),/need 3 influence/);
  for (const p of policyOptions(s,0)) {
    assert.match(translate(p.name,'zh-CN'),/\p{Script=Han}/u);
    assert.match(translate(p.description,'zh-CN'),/\p{Script=Han}/u);
  }
});

import {councilAgenda,proposePolicy} from '../docs/assembly-plan.js';

test('assembly looks at its own cities and chooses policies with a stable reconsideration window',()=>{
  const s=fresh(),p=s.players[0],city=s.cities[0];
  p.civics=['charter','publicWorks'];city.buildings.push('harbor');
  assert.equal(councilAgenda(s,0),'harborCommission');
  city.hp-=8;assert.equal(councilAgenda(s,0),'mutualAid');
  p.civics.push('irrigationDistricts');p.capital=20;
  const forecast=()=>({surplus:-1});
  assert.deepEqual(proposePolicy(s,0,forecast),{type:'policy',item:'relief'});
  const enacted=policy(s,'relief');enacted.round+=2;
  assert.equal(proposePolicy(enacted,0,forecast),null);
});
