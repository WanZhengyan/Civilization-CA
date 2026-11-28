import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,applyAction,campaignView} from '../docs/rules.js';
import {rememberVision} from '../docs/vision.js';

function campaign(teams) {
  const s=createGame(['Coast','Valley','Foothills'],'la',{seed:931,teams});
  s.units.forEach((u,i)=>{u.tile=['8,6','2,5','15,8'][i];});
  delete s.contacts;delete s.exploration;
  return rememberVision(s);
}
const ledger=(s,seat)=>campaignView(s,seat).intel.diplomacy;
const entry=(s,seat,target)=>ledger(s,seat).find(r=>r.seat===target);
test('contact requires actual allied sight and persists after units leave it and the campaign reloads',()=>{
  const first=campaign([0,0,1]);assert.deepEqual(ledger(first,0).map(e=>e.relation),['self','ally']);
  const next=structuredClone(first);next.round=4;next.units[2].tile='3,5';
  const contact=rememberVision(next,first);
  assert.equal(entry(contact,0,2).firstMetRound,4);assert.equal(entry(contact,1,2).firstMetRound,4);
  assert.equal(entry(first,0,2),undefined);
  const away=structuredClone(contact);away.units[2].tile='15,8';away.round++;
  assert.equal(entry(JSON.parse(JSON.stringify(rememberVision(away))),0,2).firstMetRound,4);
  assert.equal(campaignView(away,0).contacts,undefined);
});
test('currently observed borders count, while old explored terrain cannot identify an unseen rival',()=>{
  const s=campaign();
  s.exploration[0]['15,8']=null;
  assert.equal(entry(s,0,2),undefined);
  s.board['8,6']={...s.board['8,6'],owner:2};
  assert.equal(entry(s,0,2).relation,'rival');
});

test('city names retain last confirmed ownership and turn; remote growth, hidden cities and private queues stay hidden',()=>{
  const s=campaign();s.cities=[{name:'Market',seat:1,tile:'9,6',buildings:[],population:4,hp:100,queue:{item:'granary'}},
    {name:'Hidden port',seat:1,tile:'15,7',buildings:[],population:2}];
  s.board['9,6'].owner=1;s.units[1].tile='9,6';s.round=3;
  const near=rememberVision(s);
  const record=entry(near,0,1);
  assert.deepEqual(record.knownCities,[{name:'Market',tile:'9,6',lastSeenRound:3,visible:true}]);
  assert.equal(record.visibleUnits,1);assert.equal(record.visibleDistricts,1);
  let away=structuredClone(near);away.units[0].tile='3,3';away.round=4;away.cities[0].name='Changed behind fog';
  away=rememberVision(away);
  assert.deepEqual(entry(away,0,1).knownCities,[{name:'Market',tile:'9,6',lastSeenRound:3,visible:false}]);
  assert.equal(entry(away,0,1).visibleUnits,0);
  const next=structuredClone(away);next.units[0].tile='8,6';next.cities[0].seat=2;
  assert.deepEqual(entry(rememberVision(next),0,1).knownCities,[]);
  assert.deepEqual(entry(next,0,2).knownCities.map(c=>c.name),['Changed behind fog']);
});

test('delegations cost their owner influence once and last for three rounds across reloads',()=>{
  const s=campaign();s.round=7;s.players[0].influence=9;s.units[1].tile='9,6';
  const order={type:'delegation',target:1},offer=entry(s,0,1).delegationOrder;
  assert.deepEqual(offer,{enabled:true,cost:6,reason:''});
  const sent=applyAction(s,0,order);
  assert.equal(sent.players[0].influence,3);assert.equal(s.players[0].influence,9);
  assert.throws(()=>applyAction(sent,0,order),/already active/);
  const restored=JSON.parse(JSON.stringify(sent));restored.round=9;
  assert.equal(entry(restored,0,1).delegation.throughRound,9);
  assert.equal(entry(restored,1,0).delegation,null);
  restored.round=10;assert.equal(entry(restored,0,1).delegation,null);
  assert.equal(entry(restored,0,1).delegationOrder.reason,'You need 6 influence.');
  assert.equal(campaignView(sent,1).delegations,undefined);
  assert(!campaignView(sent,1).log.some(e=>e.type==='delegation'));
});
test('unmet rivals, allies, eliminated civilizations and other people’s turns cannot spend influence',()=>{
  const s=campaign([0,0,1]);const before=JSON.stringify(s);
  for(const target of [0,1,2,99,'2',null]) assert.throws(()=>applyAction(s,0,{type:'delegation',target}),/contacted rival/);
  assert.equal(JSON.stringify(s),before);
  s.units[2].tile='9,6';s.players[2].eliminated=true;
  assert.throws(()=>applyAction(s,0,{type:'delegation',target:2}),/eliminated/);
  assert.throws(()=>applyAction(s,1,{type:'delegation',target:2}),/your turn/);
});
test('an active mission publishes changing era and total city count only to the payer, without charting new sites',()=>{
  const s=campaign([0,0,1]);s.units[2].tile='9,6';
  const sent=applyAction(s,0,{type:'delegation',target:2});
  const moved=structuredClone(sent);moved.units[2].tile='15,8';moved.players[2].technologies=['radio'];moved.players[2].influence=98765;
  moved.cities=[{seat:2,tile:'15,8',name:'Secret Plateau',buildings:[],queue:{item:'granary',progress:11,required:15}}];
  const projected=campaignView(moved,0), report=projected.intel.diplomacy.find(row=>row.seat===2);
  assert.deepEqual(report.delegation,{sentRound:s.round,throughRound:s.round+2,era:'modern',cityCount:1});
  assert.deepEqual(report.knownCities,[]);assert(!projected.intel.explored.includes('15,8'));
  assert(!JSON.stringify(projected).includes('Secret Plateau'));assert(!JSON.stringify(report).includes('98765'));
  assert.equal(entry(moved,1,2).delegation,null);
  moved.round+=3;assert.equal(entry(moved,0,2).delegation,null);
});
import {translate} from '../docs/i18n.js';
test('first contact is a private bilingual chronicle entry; unfamiliar initiative never identifies a rival',()=>{
  const s=campaign();s.log.push({round:1,type:'end',seat:2,text:'Arroyo League ended its turn.'});
  assert.deepEqual(campaignView(s,0).log.at(-1),{round:1,type:'end',text:'An unmet civilization ended its turn.'});
  const closer=structuredClone(s);closer.units[1].tile='9,6';
  const met=rememberVision(closer,s),v=campaignView(met,0);
  const report=v.log.find(e=>e.type==='contact' && e.target===1);
  assert(report);assert.match(translate(report.text,'zh-CN'),/首次接触/);
  assert(!campaignView(met,2).log.some(e=>e.type==='contact' && e.seat===0));
  assert.equal(rememberVision(met,met).log.filter(e=>e.type==='contact' && e.seat===0 && e.target===1).length,1);
  assert.equal(translate('Diplomatic delegation dispatched.','zh-CN'),'外交使团已派出。');
});
import {chooseBotActionFromView} from '../docs/rules.js';
import {proposeDelegation} from '../docs/diplomacy.js';
test('governors budget envoys from their own observations and react only to purchased reports',()=>{
  const s=campaign();s.units[1].tile='9,6';s.players[0].influence=15;
  const rows=ledger(s,0);
  assert.deepEqual(proposeDelegation(rows,7,15,'hard'),{type:'delegation',target:1});
  assert.equal(proposeDelegation(rows,7,14,'hard'),null);
  assert.equal(proposeDelegation(rows,7,15,'easy'),null);
  s.players[0].faction=1;s.players[1].technologies=['radio'];
  s.units[0].type='scout';
  const unseen=campaignView(s,0);
  assert.notEqual(chooseBotActionFromView(unseen,'hard').item,'tactics');
  const sent=applyAction(s,0,{type:'delegation',target:1});
  const view=campaignView(sent,0);
  assert.equal(proposeDelegation(view.intel.diplomacy,7,30,'hard'),null);
  assert.deepEqual(chooseBotActionFromView(view,'hard'),{type:'research',item:'tactics'});
});
