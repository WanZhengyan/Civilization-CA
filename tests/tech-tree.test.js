import assert from 'node:assert/strict';
import {test} from 'node:test';
import {applyAction, createGame, getCityYield, getEra, getResearchOptions, getStats} from '../docs/rules.js';
const fresh = () => createGame(['West', 'East']);
const learn = (s,item) => applyAction(s,0,{type:'research',item});

test('science cannot skip either prerequisite and a technology advances the era only on completion', () => {
  let s=fresh();
  const wall = state => getResearchOptions(state,0).find(x=>x.item==='motorization');
  assert.match(wall(s).reason,/Steam Power.*Ballistics/);
  s.players[0].science=100;
  assert.throws(()=>learn(s,'motorization'),/Requires/);
  assert.equal(getEra(s,0).id,'frontier');
  s=learn(s,'industry');
  s=learn(s,'steam');
  assert.equal(getEra(s,0).id,'industrial');
  assert.match(wall(s).reason,/Ballistics/);
  s=learn(s,'tactics'); s=learn(s,'ballistics');
  assert.equal(wall(s).enabled,true);
  s=learn(s,'motorization');
  assert.equal(getEra(s,0).id,'modern');
  assert.equal(getEra(s,1).id,'frontier');
});

test('branch benefits match their required city and terrain', () => {
  const s=fresh();
  const home=s.cities.find(city=>city.seat===0);
  const port=s.cities.find(city=>city.seat===1);
  const homeRate=getCityYield(s,home.id).production;
  const portIncome=getStats(s,1).capitalIncome;
  const oldScience=getStats(s,0).scienceIncome;
  s.players[0].technologies=['navigation','industry','steam','radio'];
  s.players[1].technologies=['navigation'];
  assert.equal(getCityYield(s,home.id).production,homeRate+2);
  assert.equal(getCityYield(s,home.id).capital,home.population);
  home.buildings.push('workshop');
  assert.equal(getCityYield(s,home.id).production,homeRate+6);
  assert.equal(getCityYield(s,port.id).capital,port.population+2);
  assert.equal(getStats(s,1).capitalIncome,portIncome+2);
  assert.equal(getStats(s,0).scienceIncome,oldScience+2);
});
