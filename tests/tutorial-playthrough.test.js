import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyAction, campaignView, getBorderCharter, getPendingTurnTasks, getUnitOptions
} from '../docs/rules.js';
import {newTutorial, restoreTutorial, tutorialProgressAfter} from '../docs/tutorial-save.js';
import {tutorialLesson} from '../docs/tutorial-coach.js';
import {scoutingRoutes} from '../docs/scout-routes.js';

function campaign() {
  let slot=newTutorial();
  const view=()=>campaignView(slot.game,0);
  const lesson=()=>tutorialLesson({tutorial:true,seat:0,state:view(),tutorialProgress:slot.progress});
  function play(action) {
    const before=slot.game;
    const after=applyAction(before,0,action);
    slot={...slot,game:after,progress:tutorialProgressAfter(slot.progress,before,action)};
  }
  function reload() {
    // Resume from exactly what the browser wrote after the last accepted order.
    slot=restoreTutorial(JSON.parse(JSON.stringify(slot)));
    assert.ok(slot);
  }
  const remember=patch=>{slot={...slot,progress:{...slot.progress,...patch}};};
  return {lesson,view,play,reload,remember};
}
const end={type:'end',requireReady:true};

test('the guided Pasadena opening buys the quoted district and trains and moves a scout through regular orders',()=>{
  const {lesson,play,view,reload,remember}=campaign();
  assert.equal(lesson().step,'found');
  play({type:'found',unit:lesson().unit.id});
  assert.equal(lesson().step,'research');
  play({type:'research',item:'agronomy'});
  assert.equal(lesson().step,'civic');
  play({type:'civic',item:'charter'});
  assert.equal(lesson().step,'produce');
  const city=lesson().city.id;
  play({type:'produce',city,item:'scout'});
  assert.equal(lesson().step,'influence');
  const before=view();
  const quote=getBorderCharter(before,0,city);
  assert.ok(quote.enabled);
  assert.ok(quote.turns>1);
  assert.throws(()=>play({type:'charterBorder',city,tile:before.cities[0].tile}));
  reload();
  assert.equal(lesson().step,'influence');
  play({type:'charterBorder',city,tile:quote.tile});
  assert.equal(view().players[0].influence,before.players[0].influence-quote.cost);
  assert.equal(view().board[quote.tile].owner,0);
  assert.equal(lesson().step,'turn');
  play(end);
  assert.equal(lesson().step,'wait');
  reload();
  assert.equal(lesson().step,'wait');
  play(end);
  assert.equal(lesson().step,'explore');
  const scout=lesson().unit;
  assert.equal(scout.type,'scout');
  const observation=view();
  const [route]=scoutingRoutes(observation,scout,getUnitOptions(observation,scout.id).moves);
  assert.ok(route.newHexes>0,'the opening scout can immediately reach unexplored land');
  play({type:'move',unit:scout.id,tile:route.tile});
  reload();
  assert.equal(view().units.find(unit=>unit.id===scout.id).tile,route.tile);
  assert.equal(view().intel.explored.length-observation.intel.explored.length,route.newHexes);
  assert.equal(lesson().step,'complete');
  remember({completed:true});
  reload();
  assert.equal(lesson(),null);
});

test('an alternate build, saving influence, and skip orders survive reload without requiring the default choices',()=>{
  const {lesson,play,view,reload,remember}=campaign();
  const founder=lesson().unit;
  play({type:'skipUnit',unit:founder.id});
  play(end);
  reload();
  assert.equal(lesson().step,'found');
  play({type:'found',unit:founder.id});
  const city=lesson().city.id;
  // The player opens the city before either council.
  play({type:'produce',city,item:'builder'});
  play({type:'civic',item:'publicWorks'});
  assert.equal(lesson().step,'research');
  play({type:'research',item:'industry'});
  assert.equal(lesson().step,'influence');
  const balance=view().players[0].influence;
  remember({seenInfluence:true});
  reload();
  assert.equal(view().players[0].influence,balance);
  assert.equal(lesson().step,'turn','ending before founding did not harvest any city production');
  play(end);
  assert.equal(lesson().step,'wait');
  while(lesson().step==='wait' && view().round<=8) {
    assert.deepEqual(getPendingTurnTasks(view(),0),[]);
    play(end);
  }
  assert.equal(lesson().step,'explore');
  assert.equal(lesson().unit.type,'builder');
  play({type:'skipUnit',unit:lesson().unit.id});
  reload();
  assert.equal(lesson().step,'complete');
});
