import assert from 'node:assert/strict';
import test from 'node:test';
import {applyAction,campaignView,createGame,getMap,getScoreTarget,getStats,migrateGame,MAX_ROUNDS,SCORE_TARGETS,TARGET_SCORE} from '../docs/rules.js';
import {translate} from '../docs/i18n.js';

// Open with settlers and neutral land, then stage a precise civic score
// using ordinary owned districts and at most one level of development.
function stageDistricts(state,seat,score) {
  const districts=getMap(state).tiles.filter(tile=>state.board[tile.id].owner===null && !tile.landmark && !['ocean','mountains'].includes(tile.terrain));
  for(const tile of districts.slice(0,Math.floor(score/2))) state.board[tile.id].owner=seat;
  if (score%2) state.board[districts[0].id].level=1;
  assert.equal(getStats(state,seat).score,score);
}

const seats=[{name:'You'},{bot:true}];
const end=state=>applyAction(state,state.turn,{type:'end'});

test('each civic target resolves only after every seat has played, precisely at the chosen score',()=>{
  assert.deepEqual(SCORE_TARGETS,[100,125,150]);
  for(const scoreTarget of SCORE_TARGETS) for(const score of [scoreTarget-1,scoreTarget]) {
    const state=createGame(seats,'sf',{seed:714,mapSize:'large',scoreTarget});
    stageDistricts(state,1,score);
    const afterPlayer=end(state);
    assert.equal(afterPlayer.phase,'playing');
    assert.equal(afterPlayer.turn,1);
    const afterComputer=end(afterPlayer);
    if(score===scoreTarget) {
      assert.equal(afterComputer.victoryReason,'civic');
      assert.deepEqual(afterComputer.winners,[1]);
    } else {
      assert.equal(afterComputer.phase,'playing');
      assert.equal(afterComputer.round,2);
    }
  }
});

test('tie resolution, the last round and hidden rival scores are independent of the chosen threshold',()=>{
  const state=createGame(seats,'sd',{seed:74,scoreTarget:150,mapSize:'large'});
  state.round=MAX_ROUNDS;
  for(const seat of [0,1]) stageDistricts(state,seat,72);
  assert.equal(campaignView(state,0).players[1].score,undefined);
  const finished=end(end(state));
  assert.deepEqual(finished.winners,[0,1]);
  assert.equal(campaignView(finished,0).players[1].score,72);
  assert.equal(getScoreTarget(campaignView(finished,1)),150);
});

test('default and historical states stay at 125 while nondefault goals survive saves and seat projections',()=>{
  const options={seed:189,mapSize:'standard'};
  const defaultState=createGame(seats,'la',options);
  assert.deepEqual(defaultState,createGame(seats,'la',{...options,scoreTarget:125,practice:false}));
  assert.ok(!Object.hasOwn(defaultState,'scoreTarget') && !Object.hasOwn(defaultState,'practice'));
  assert.equal(getScoreTarget(migrateGame(JSON.parse(JSON.stringify(defaultState)))),125);
  for(const scoreTarget of [100,150]) {
    const state=createGame(seats,'sf',{...options,scoreTarget});
    const restored=migrateGame(JSON.parse(JSON.stringify(state)));
    assert.equal(getScoreTarget(restored),scoreTarget);
    for (const seat of [0,1]) assert.equal(getScoreTarget(campaignView(restored,seat)),scoreTarget);
  }
  assert.equal(getScoreTarget(undefined),TARGET_SCORE);
  for(const scoreTarget of [0,'125',Infinity,126]) assert.throws(()=>createGame(seats,'la',{...options,scoreTarget}),/valid civic victory target/);
});

test('practice is an explicit single-human opening with neutral camps, ordinary fog and consecutive player turns',()=>{
  assert.throws(()=>createGame(['You'],'la',{seed:76}),/two to four/);
  assert.throws(()=>createGame([{bot:true}],'la',{seed:76,practice:true}),/one human/);
  assert.throws(()=>createGame(seats,'la',{seed:76,practice:true}),/one human/);
  for(const region of ['la','sf','sd']) for(const mapSize of ['standard','large']) {
    const state=createGame(['You'],region,{seed:76,practice:true,mapSize});
    assert.equal(state.players.length,1);
    assert.equal(state.players[0].bot,false);
    assert.deepEqual(state.units.map(u=>u.type),['settler']);
    assert.ok(state.barbarians.camps.length>0);
    const view=campaignView(state,0);
    assert.equal(view.practice,true);
    assert.ok(view.intel.visible.length<=19);
    const founded=applyAction(state,0,{type:'found',unit:state.units[0].id});
    const next=end(founded);
    assert.equal(next.phase,'playing');
    assert.equal(next.round,2);
    assert.equal(next.turn,0);
    assert.equal(next.cities.length,1);
    assert.equal(migrateGame(JSON.parse(JSON.stringify(next))).practice,true);
  }
});

test('practice distinguishes achieving the goal from reaching the round cap with a lower final score',()=>{
  for(const [score,round,won] of [[150,3,true],[150,MAX_ROUNDS,true],[56,MAX_ROUNDS,false]]) {
    const state=createGame(['You'],'la',{seed:92,practice:true,scoreTarget:150});
    stageDistricts(state,0,score);
    state.round=round;
    const finished=end(state);
    assert.equal(finished.phase,'finished');
    assert.equal(finished.victoryReason,'practice');
    assert.deepEqual(finished.winners,won ? [0] : []);
    const view=campaignView(finished,0);
    assert.equal(view.players[0].score,score);
    assert.equal(getScoreTarget(view),150);
    const result=view.log.find(entry=>entry.type==='finish');
    assert.ok(result.text.includes(won ? 'goal reached' : 'Practice complete'));
    assert.ok(translate(result.text,'zh-CN').includes('最终积分为 '+score+' 分'));
  }
});
