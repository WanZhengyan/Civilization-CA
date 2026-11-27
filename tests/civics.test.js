import {createClassicGame} from './classic-game.js';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {applyAction, getCityYield, getCivicOptions, getStats, migrateGame} from '../docs/rules.js';
const fresh=()=>createClassicGame(['West','East']);
const act=(s,type,item)=>applyAction(s,s.turn,{type,item});
const round=s=>act(act(s,'end'),'end');

test('research and civic agendas advance concurrently and retain their own balances',()=>{
  let s=fresh();
  const income=getStats(s,0);
  s=act(s,'research','tactics'); s=act(s,'civic','publicWorks');
  s=round(s);
  assert.equal(s.players[0].science,income.scienceIncome);
  assert.equal(s.players[0].culture,income.cultureIncome);
  assert.equal(s.players[0].research,'tactics');
  assert.equal(s.players[0].civic,'publicWorks');
  s=act(s,'civic','charter');
  assert.equal(s.players[0].culture,income.cultureIncome);
  for(let i=0;i<3;i++) s=round(s);
  assert.ok(s.players[0].technologies.includes('tactics'));
  assert.deepEqual(s.players[0].civics,['charter']);
  assert.ok(s.log.some(x=>x.type==='adoption'));
  assert.equal(getStats(s,0).cultureIncome,income.cultureIncome+1);
});

test('civic branches grant real order and production bonuses, with no repeated purchase',()=>{
  let s=fresh();
  const original=getCityYield(s,s.cities[0].id).production;
  s.players[0].culture=80;
  assert.ok(getCivicOptions(s,0).find(x=>x.item==='federation').locked);
  assert.throws(()=>act(s,'civic','federation'),/Requires/);
  s=act(s,'civic','publicWorks');
  assert.equal(getCityYield(s,s.cities[0].id).production,original+1);
  s=act(s,'civic','charter'); s=act(s,'civic','federation');
  assert.throws(()=>act(s,'civic','federation'));
  s=round(s);
  assert.equal(s.actionsLeft,3);
  s=act(s,'end');
  assert.equal(s.actionsLeft,2);
});

test('existing saves retain cities, science and projects when civics are introduced',()=>{
  const prior=fresh();
  prior.players[0].science=8;prior.players[0].research='tactics';
  for(const p of prior.players){ delete p.culture;delete p.civic;delete p.civics; }
  const next=migrateGame(prior);
  assert.equal(prior.players[0].culture,undefined);
  assert.equal(next.players[0].science,8);
  assert.equal(next.players[0].research,'tactics');
  assert.equal(next.players[0].culture,0);
  assert.deepEqual(next.cities,prior.cities);
  assert.equal(migrateGame(next),next);
});
