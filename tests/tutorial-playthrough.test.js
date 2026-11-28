import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyAction, campaignView, getBorderCharter, getPendingTurnTasks, getMap
} from '../docs/rules.js';
import {newTutorial, restoreTutorial, tutorialProgressAfter} from '../docs/tutorial-save.js';
import {tutorialLesson} from '../docs/tutorial-coach.js';
import {previewMove,reviewPointerMove} from '../docs/move-review.js';

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
  const route=lesson().route;
  assert.ok(route.newHexes>0 && observation.intel.visible.includes(route.tile));
  const draft=previewMove(observation,scout,route.tile);
  assert.equal(draft.frontier.length,route.newHexes);
  assert.equal(draft.cost,route.cost);
  assert.equal(view().units.find(u=>u.id===scout.id).tile,scout.tile,'a route preview leaves the scout in place');
  for (const input of ['mouse','keyboard','touch'])assert.ok(reviewPointerMove(input,false,true));
  const surveyed={...observation,intel:{...observation.intel,explored:getMap(observation).tiles.map(t=>t.id)}};
  const known=tutorialLesson({tutorial:true,seat:0,state:surveyed,tutorialProgress:{
    founded:true,choseResearch:true,choseCivic:true,choseProduction:true,expanded:true,endedTurn:true
  }});
  assert.equal(known.route,null,'fully charted destinations do not promise a discovery');
  play({type:'move',unit:scout.id,tile:route.tile});
  reload();
  assert.equal(view().units.find(unit=>unit.id===scout.id).tile,route.tile);
  assert.equal(view().units.find(unit=>unit.id===scout.id).moves,route.left);
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
  assert.equal(lesson().route,null);
  play({type:'skipUnit',unit:lesson().unit.id});
  reload();
  assert.equal(lesson().step,'complete');
});
