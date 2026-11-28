import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAction,createGame,campaignView,getCitizenWorkforce} from '../docs/rules.js';
import {advisorReport} from '../docs/advisors.js';

const start=()=>createGame([{name:'Planner',civilization:'arroyo'}],'la',{seed:624101,practice:true});
const capital=()=>{const s=start();return applyAction(s,0,{type:'found',unit:s.units[0].id});};
const read=(s,lang='en')=>advisorReport(campaignView(s,0),0,lang);
test('the food desk quotes actual worker assignments and accepts only the requesting seat’s chart',()=>{
  const s=capital(),city=s.cities[0];city.population=3;city.focus='science';city.food=0;
  const v=campaignView(s,0),food=getCitizenWorkforce(v,city.id,'food').yields;
  assert.deepEqual(advisorReport(s,0),[]);
  assert.deepEqual(advisorReport(v,1),[]);
  const card=read(s).find(r=>r.desk==='food');assert.ok(card);assert.equal(card.link.city,city.id);
  assert.ok(food.food>getCitizenWorkforce(v,city.id).yields.food);
  assert.match(read(s,'zh-CN').find(r=>r.desk==='food').detail,/粮食/);
});

test('the founding desk compares only charted sites and quotes a legal route',()=>{
  const s=start(),v=campaignView(s,0),sites=read(s).filter(x=>x.desk==='settle');
  assert.ok(sites.length);assert.ok(sites.length<=2);
  for(const site of sites){assert.ok(v.intel.explored.includes(site.link.tile));assert.equal(site.link.unit,s.units[0].id);}
  assert.equal(read(capital()).filter(x=>x.desk==='settle').length,0);
});

test('scout proposals report real sight gains and stop advising a skipped unit',()=>{
  const s=capital(),u={...start().units[0],id:'scout-test',type:'scout',moves:3,maxMoves:3,tile:s.cities[0].tile};s.units.push(u);
  const choice=read(s).find(r=>r.desk==='explore');assert.ok(choice);
  const before=campaignView(s,0).intel.explored.length;
  const after=applyAction(s,0,{type:'move',unit:u.id,tile:choice.link.tile});
  assert.ok(choice.detail.includes('chart '+(campaignView(after,0).intel.explored.length-before)+' new'));
  u.skippedRound=s.round;assert.ok(!read(s).some(r=>r.desk==='explore'));
});

test('the works advisor follows the authority’s visible connected deposit and charge quote',()=>{
  const s=capital(),c=s.cities[0],u={...start().units[0],id:'builder-test',type:'builder',charges:2,moves:2,maxMoves:2,tile:c.tile};
  s.units.push(u);
  const view=campaignView(s,0),site=Object.keys(view.intel.workSites[u.id]||{}).find(id=>id!==c.tile);
  assert.ok(site);
  s.board[site].resource='grain';
  const card=read(s).find(r=>r.desk==='improve');assert.ok(card);assert.match(card.detail,/one of 2 charges/);
  const fog=campaignView(s,0);fog.intel.visible=[];assert.ok(!advisorReport(fog,0).some(r=>r.desk==='improve'));
});

test('the housing advisor prices a legal city project only when housing caps a positive harvest',()=>{
  const s=capital(),c=s.cities[0];c.population=3;c.focus='food';
  const card=read(s).find(r=>r.desk==='housing' && r.link.item==='granary');assert.ok(card);assert.match(card.detail,/from 3 to 5/);
  c.buildings.push('granary');assert.ok(!read(s).some(r=>r.desk==='housing'));
});

test('the industrial desk waits for the correct research and quotes the paid workshop output',()=>{
  const s=capital();assert.ok(!read(s).some(r=>r.desk==='industry'));
  s.players[0].technologies=['industry'];
  const card=read(s).find(r=>r.desk==='industry');assert.equal(card.link.item,'workshop');assert.match(card.detail,/after 7 producing turns/);
});
