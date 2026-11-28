import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAction,createGame,campaignView,getProductionOptions,getCitizenWorkforce} from '../docs/rules.js';
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

test('rush advice uses only affordable current quotes and preserves the purchase decision',()=>{
  let s=capital();const city=s.cities[0];
  s=applyAction(s,0,{type:'produce',item:'scout',city:city.id});s.players[0].capital=100;
  const card=read(s).find(r=>r.desk==='treasury');assert.equal(card.link.buy,true);
  const paid=applyAction(s,0,{type:'buyProduction',item:'scout',city:city.id,expected:s.cities[0].productionRevision||1,gold:getProductionOptions(s,city.id).find(p=>p.item==='scout').gold});assert.ok(card.detail.includes('leaves '+paid.players[0].capital));
  s.players[0].capital=0;assert.ok(!read(s).some(r=>r.desk==='treasury'));
});

test('technology planning prices the complete route to an unbuilt facility after savings',()=>{
  const s=capital();s.players[0].science=2;
  const advice=read(s).find(r=>r.desk==='science');assert.ok(advice);assert.match(advice.detail,/after savings/);
  s.players[0].research=advice.link.item;assert.ok(!read(s).some(r=>r.desk==='science'));
});

test('civic proposals count only cities that meet each policy’s requirements',()=>{
  const s=capital(),p=s.players[0];p.civics=['publicWorks','charter'];
  const frontier=read(s).find(r=>r.desk==='civic');
  assert.equal(frontier.link.item,'federation');assert.match(frontier.detail,/gain 2 border points/);
  p.civics.push('federation');
  assert.ok(!read(s).some(r=>r.desk==='civic'));s.cities[0].population=3;
  const school=read(s).find(r=>r.desk==='civic');assert.equal(school.link.item,'normalSchools');assert.match(school.detail,/gain 2 science/);
  s.cities[0].population=1;s.cities[0].buildings.push('harbor');assert.equal(read(s).find(r=>r.desk==='civic').link.item,'harborCommission');
});

test('charter advice shows the natural alternative and disappears after a charter is spent',()=>{
  const s=capital(),c=s.cities[0];s.players[0].influence=18;
  const deal=read(s).find(r=>r.desk==='borders');assert.ok(deal);assert.match(deal.detail,/leaving 12/);
  c.borderCharterRound=s.round;assert.ok(!read(s).some(r=>r.desk==='borders'));
});

test('material dispatch quotes the capped remaining construction and its cash alternative',()=>{
  let s=capital();const c=s.cities[0];s=applyAction(s,0,{type:'produce',item:'scout',city:c.id});
  s.players[0].stockpile={iron:3};s.cities[0].queue.progress=s.cities[0].queue.required-2;
  const card=read(s).find(r=>r.desk==='supplies');assert.equal(card.link.city,c.id);assert.match(card.detail,/\+2 production/);
  const after=applyAction(s,0,{type:'shipment',resource:'iron',city:c.id,market:'city'});assert.ok(!read(after).some(r=>r.desk==='supplies'));
});


test('recovery advice compares the two real health forecasts before consuming movement',()=>{
  const s=capital(),u={...start().units[0],id:'patient',type:'melee',tile:s.cities[0].tile,hp:30,maxHp:100,moves:2};
  s.units.push(u);
  const card=read(s).find(r=>r.desk==='recovery');
  assert.match(card.detail,/42\/100/);assert.match(card.detail,/46\/100/);assert.equal(card.link.rest,true);
  u.resting=true;assert.ok(!read(s).some(r=>r.desk==='recovery'));
});

test('the launch office compares construction sites only in campaigns that permit a science victory',()=>{
  const s=capital(),c=s.cities[0];s.victoryMode='science';s.players[0].technologies=['rocketry'];
  const choice=read(s).find(r=>r.desk==='launch');assert.equal(choice.link.city,c.id);assert.match(choice.detail,/0\/60/);
  c.queue={item:'orbitalSurvey',progress:38,required:60};assert.match(read(s).find(r=>r.desk==='launch').detail,/38\/60/);
  s.victoryMode='conquest';assert.ok(!read(s).some(r=>r.desk==='launch'));
});

test('priority briefing caps its list, keeps each department accessible and handles quiet turns',async()=>{
  const {advisorAgenda}=await import('../docs/advisors-ui.js');
  const cards=['food','science','civic','treasury','recovery'].map(desk=>({desk}));
  assert.deepEqual(advisorAgenda(cards).visible,cards.slice(0,3));
  assert.deepEqual(advisorAgenda(cards,'knowledge').visible,cards.slice(1,3));
  assert.deepEqual(advisorAgenda(cards,'all').visible,cards);
  assert.deepEqual(advisorAgenda([],'cities'),{groups:[],topic:'brief',visible:[]});
});
