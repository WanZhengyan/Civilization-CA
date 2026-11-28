import assert from 'node:assert/strict';
import test from 'node:test';
import {applyAction,createGame,campaignView,getProductionOptions} from '../docs/rules.js';
import {modePicker,compareCivilizations} from '../docs/campaign-choices.js';
import {CIVILIZATIONS} from '../docs/civilizations.js';
import {SCIENCE_PROJECT} from '../docs/victory-rules.js';
import {victoryPanel} from '../docs/victory-panel.js';
import {orderButtons} from '../docs/work-orders.js';
import {changeRoomSetup,newRoomSetup,roomSetupFields} from '../docs/room-setup.js';
import {translate} from '../docs/i18n.js';

test('practice explains the disabled conquest path and every selectable trait is localized',()=>{
  const modes=modePicker('soloVictoryMode','standard',true);
  assert.match(modes,/value="standard" checked/);
  assert.match(modes,/value="conquest" disabled/);
  assert.match(modes,/Conquest requires a rival/);
  for(const c of CIVILIZATIONS){
    assert.ok(compareCivilizations().includes(c.description));
    assert.equal(translate(c.description,'zh-CN'),c.descriptionZh);
    assert.equal(translate(c.traitName,'zh-CN'),c.traitNameZh);
  }
});

test('a seat can relinquish a civilization without reserving it on behalf of another human',()=>{
  let setup=changeRoomSetup(newRoomSetup(3),'seat-kind-2','bot');
  setup=changeRoomSetup(setup,'seat-civilization-2','arroyo');
  assert.equal(changeRoomSetup(setup,'seat-civilization-0','arroyo'),null);
  assert.equal(changeRoomSetup(setup,'seat-civilization-1','valley'),null);
  assert.match(roomSetupFields(setup),/option value="arroyo" disabled/);
  setup=changeRoomSetup(setup,'seat-kind-2','human');
  assert.equal(setup.seats[2].civilization,undefined);
  assert.ok(changeRoomSetup(setup,'seat-civilization-0','arroyo'));
});

test('science-only victory progress follows a real launch, respects fog, and translates the public result',()=>{
  let state=createGame([{name:'Host',civilization:'arroyo'},{name:'Guest'}],'la',{seed:39,victoryMode:'science'});
  const view=seat=>victoryPanel(campaignView(state,seat),seat,encodeURIComponent);
  assert.match(view(0),new RegExp('0 / '+SCIENCE_PROJECT.required));
  assert.doesNotMatch(view(0),/capitals confirmed|round 30|civic target/);
  state=applyAction(state,0,{type:'found',unit:state.units[0].id});
  const city=state.cities[0].id;
  state.players[0].technologies.push('industry','tactics','steam','ballistics','radio','motorization');
  state.players[0].science=30;
  state=applyAction(state,0,{type:'research',item:'rocketry'});
  const launch=getProductionOptions(state,city,{replace:true}).find(o=>o.item===SCIENCE_PROJECT.id);
  const buttons=orderButtons(launch,true);
  assert.match(buttons,/data-produce="orbitalSurvey"/);
  assert.doesNotMatch(buttons,/data-buy/);
  state=applyAction(state,0,{type:'produce',city,item:SCIENCE_PROJECT.id});
  assert.match(view(0),/Launch city/);
  assert.doesNotMatch(view(1),/Launch city/);
  state=applyAction(applyAction(state,0,{type:'end'}),1,{type:'end'});
  const invested=state.cities[0].queue.progress;
  assert.ok(invested>0);
  state=applyAction(state,0,{type:'switchProduction',city,item:'builder',expected:state.cities[0].productionRevision});
  assert.match(view(0),/Paused project/);
  assert.match(view(0),new RegExp(invested+' / '+SCIENCE_PROJECT.required));
  assert.doesNotMatch(view(1),/Paused project/);
  assert.equal(translate('Paused project','zh-CN'),'暂停的发射项目');
  state=applyAction(state,0,{type:'switchProduction',city,item:SCIENCE_PROJECT.id,expected:state.cities[0].productionRevision});
  assert.match(view(0),/Launch city/);
  for(let n=0;n<40 && state.phase==='playing';n++) state=applyAction(state,state.turn,{type:'end'});
  assert.equal(state.victoryReason,'science');
  assert.match(view(0),/The winning side completed the Orbital Survey/);
  assert.match(view(1),/Campaign ended/);
  assert.match(view(0),new RegExp(SCIENCE_PROJECT.required+' / '+SCIENCE_PROJECT.required));
  assert.equal(translate(state.log.at(-1).text,'zh-CN'),'阿罗约同盟取得了科技胜利。');
});

test('conquest progress gives confirmed capitals without exposing the other side’s cities or research',()=>{
  let state=createGame([{name:'Host'},{name:'Guest'}],'la',{seed:39,victoryMode:'conquest'});
  for(let seat=0;seat<2;seat++){
    state=applyAction(state,seat,{type:'found',unit:state.units.find(u=>u.seat===seat).id});
    state=applyAction(state,seat,{type:'end'});
  }
  const report=victoryPanel(campaignView(state,0),0,String);
  assert.match(report,/Original capitals confirmed under your control<\/span><strong>1<\/strong>/);
  assert.doesNotMatch(report,/Orbital Survey|Rocketry/);
  assert.ok(!report.includes(state.cities.find(c=>c.seat===1).name));
});
