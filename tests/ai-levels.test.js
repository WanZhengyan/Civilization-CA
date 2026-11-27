import assert from 'node:assert/strict';
import test from 'node:test';
import {AI_LEVELS} from '../docs/ai-levels.js';
import {applyAction,campaignView,chooseBotAction,chooseBotActionFromView,createGame,getMap,getPortSite,getStats,getUnitOptions} from '../docs/rules.js';
import {projectForSeat} from '../docs/vision.js';
import {createClassicGame} from './classic-game.js';

function unit(id,seat,type,tile,hp=100) {
  return {id,seat,type,tile,hp,maxHp:100,moves:2,maxMoves:2};
}
function tacticalState() {
  const state=createClassicGame(['A','B','C']);
  state.players[0].research='industry';state.players[0].civic='charter';
  state.units=[unit('guard',0,'melee','11,7'),unit('rangers',0,'ranged','10,7'),unit('rival',1,'melee','11,6',30)];
  state.units[0].hp=4;
  return state;
}

test('all difficulties pay identical costs and have identical fog, moves and incomes for identical orders',()=>{
  const players=[{bot:true},{bot:true}];
  let expected;
  for(const difficulty of AI_LEVELS) {
    let game=createGame(players,'sd',{seed:417007,difficulty});
    for(const seat of [0,1]) {
      game=applyAction(game,seat,{type:'found',unit:game.units.find(u=>u.seat===seat).id});
      game=applyAction(game,seat,{type:'end'});
    }
    const {difficulty:level,...result}=game;
    const observed={result,seat0:getStats(game,0),seat1:getStats(game,1),sight:projectForSeat(game,0).intel.visible};
    if(expected)assert.deepEqual(observed,expected);
    expected=observed;
    assert.deepEqual(chooseBotAction(game),chooseBotAction(game,difficulty));
  }
});

test('an unseen city, army, deposit, camp or rival private research cannot steer any level',()=>{
  const state=tacticalState(), original=projectForSeat(state,0), visible=new Set(original.intel.visible);
  const unknown=getMap(state).tiles.filter(t=>!visible.has(t.id)).map(t=>t.id);
  assert.ok(unknown.length>30);
  for(const difficulty of AI_LEVELS) {
    const decision=chooseBotActionFromView(original,difficulty);
    for(const id of [unknown[0],unknown.at(-1)]) {
      const changed=structuredClone(state);
      changed.cities[1]={...changed.cities[1],tile:id,name:'Secret city',buildings:['walls','harbor'],portTile:unknown[2]};
      changed.units.push(unit('unseen',1,'armor',id));
      changed.board[id]={owner:1,level:3,resource:'iron',improvement:'mine'};
      changed.barbarians={camps:[{tile:id,type:'camp',hp:48}],parties:[]};
      changed.players[1].technologies=['tactics','ballistics'];changed.players[1].capital=9999;
      assert.deepEqual(chooseBotAction(changed,difficulty),decision);
      assert.deepEqual(chooseBotActionFromView(projectForSeat(changed,0),difficulty),decision);
      assert.deepEqual(chooseBotAction(campaignView(changed,0),difficulty),decision);
    }
  }
});

test('the chooser uses only the active seat observations, ignoring cached legal-action and combat hints',()=>{
  const game=tacticalState(),view=projectForSeat(game,0);
  for(const difficulty of AI_LEVELS) {
    const action=chooseBotActionFromView(view,difficulty);
    const poisoned={...view,intel:{...view.intel,forecasts:new Proxy({},{get(){throw Error('private forecast')}}),
      unavailableSites:['11,7'],portSites:{},workSites:{},districtChoices:[]}};
    assert.deepEqual(chooseBotActionFromView(poisoned,difficulty),action);
  }
  assert.throws(()=>chooseBotActionFromView(projectForSeat(game,1)),/own observations/);
  assert.throws(()=>chooseBotAction(projectForSeat(game,1)),/own observations/);
  assert.throws(()=>chooseBotActionFromView(view,'impossible'),/difficulty/);
});

test('hard uses healthy ranged support for a safe kill before committing injured infantry',()=>{
  const game=tacticalState();
  assert.deepEqual(chooseBotAction(game,'normal'),{type:'attack',unit:'guard',tile:'11,6'});
  assert.deepEqual(chooseBotAction(game,'hard'),{type:'attack',unit:'rangers',tile:'11,6'});
  const fought=applyAction(game,0,chooseBotAction(game,'hard'));
  assert.equal(fought.units.find(u=>u.id==='guard').hp,4);
  assert.ok(!fought.units.some(u=>u.id==='rival'));
});

test('visible allied military and capitals never appear as attack choices for any level',()=>{
  const game=tacticalState();
  game.teams=[0,0,1];
  game.units.push(unit('hostile',2,'melee','12,7',20));
  const view=projectForSeat(game,0);
  for(const own of view.units.filter(u=>u.seat===0))assert.ok(!getUnitOptions(view,own.id).attacks.includes('11,6'));
  for(const difficulty of AI_LEVELS) {
    const action=chooseBotAction(game,difficulty);
    assert.equal(action.type,'attack');
    assert.equal(action.tile,'12,7');
  }
});

test('a crew beside a disputed coast does not learn a private berth three land hexes away',()=>{
  const state=createClassicGame(['A','B']);
  state.turn=1;
  Object.assign(state.players[1],{research:'industry',civic:'charter',policyRound:state.round});
  Object.assign(state.cities[1],{tile:'4,7',portTile:'3,7',buildings:['harbor'],queue:{item:'workshop'},focusRound:state.round});
  Object.assign(state.cities[0],{tile:'7,8',portTile:'4,8',buildings:['harbor']});
  state.units=[{...unit('crew',1,'workboat','4,8'),charges:2}];
  assert.ok(!projectForSeat(state,1).cities.some(c=>c.seat===0));
  const unreserved=structuredClone(state);
  unreserved.cities[0].portTile='3,9';
  for(const difficulty of AI_LEVELS) {
    const chosen=chooseBotAction(state,difficulty);
    assert.notEqual(chosen.type,'improve');
    assert.deepEqual(chosen,chooseBotAction(unreserved,difficulty));
    assert.doesNotThrow(()=>applyAction(state,1,chosen));
  }
});

test('a city will not commission a harbor on bare-looking water shared with an unverified rival port',()=>{
  const state=createClassicGame(['A','B'],'sd');
  const [home,rival]=state.cities;
  Object.assign(home,{tile:'8,0',buildings:['granary','monument','workshop'],focusRound:state.round});
  Object.assign(rival,{tile:'8,3',portTile:'6,3',buildings:['harbor']});
  for(const tile of Object.values(state.board))tile.owner=null;
  for(const id of ['8,0','7,1','7,2','6,2'])state.board[id].owner=0;
  for(const id of ['8,3','7,3','7,4'])state.board[id].owner=1;
  state.units=[{...unit('guard',0,'melee','7,2'),moves:0}];
  Object.assign(state.players[0],{research:'industry',civic:'charter',policyRound:state.round});
  const view=projectForSeat(state,0),unreserved=structuredClone(state);
  delete unreserved.cities[1].portTile;
  assert.equal(getPortSite(view,home.id),'6,3');
  assert.equal(getPortSite(state,home.id),null);
  for(const level of AI_LEVELS) {
    const action=chooseBotAction(state,level);
    assert.notEqual(action.item,'harbor');
    assert.deepEqual(action,chooseBotAction(unreserved,level));
    assert.doesNotThrow(()=>applyAction(state,0,action));
  }
});

test('hard commissions an expansion settler only after its escort reveals a usable site',()=>{
  const state=createClassicGame(['A','B']);
  Object.assign(state.players[0],{research:'industry',civic:'charter',policyRound:state.round});
  Object.assign(state.cities[0],{queue:null,focusRound:state.round});
  state.units=[{...unit('guard',0,'melee','11,7'),moves:0}];
  assert.equal(chooseBotAction(state,'hard').item,'workshop');
  state.units[0].tile='13,7';
  assert.equal(chooseBotAction(state,'hard').item,'settler');
});

test('during a public university race the exact site in a private city queue cannot guide a contest',()=>{
  const state=createClassicGame(['A','B']);
  state.units=[];state.board['10,7']={owner:1,level:2};
  for(const other of getMap(state).neighbors('11,7'))if(other!=='10,7')state.board[other]={owner:0,level:3};
  Object.assign(state.players[0],{research:'industry',civic:'charter',policyRound:state.round,capital:30,influence:30});
  Object.assign(state.cities[0],{queue:{item:'granary'},focusRound:state.round});
  Object.assign(state.cities[1],{tile:'9,7',queue:{item:'stanford',site:'10,7'}});
  state.wonderRegistry={stanford:'commissioned'};
  const otherSite=structuredClone(state);
  otherSite.cities[1].queue.site='9,6';
  for(const difficulty of AI_LEVELS) {
    const action=chooseBotAction(state,difficulty);
    assert.notDeepEqual(action,{type:'contest',tile:'10,7'});
    assert.deepEqual(action,chooseBotAction(otherSite,difficulty));
    assert.doesNotThrow(()=>applyAction(state,0,action));
  }
});
