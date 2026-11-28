import assert from 'node:assert/strict';
import test from 'node:test';
import {newRoomSetup,changeRoomSetup,roomSetupFields} from '../docs/room-setup.js';

test('new rooms reserve human positions, with a host and an invitation on different teams',()=>{
  for (const count of [2,3,4]){
    const setup=newRoomSetup(count);
    assert.deepEqual(setup.seats,Array.from({length:count},(_,team)=>({kind:'human',team})));
  }
  assert.throws(()=>newRoomSetup(5),RangeError);
});

test('the live room builder starts directly with the number of seats',()=>{
  const html=roomSetupFields(newRoomSetup());
  assert.match(html,/name="roomSeatCount"/);
  assert.ok(html.indexOf('name="roomSeatCount"')<html.indexOf('class="room-seat"'));
  assert.doesNotMatch(html,/roomPreset|Open lobby|free-for-all|Custom seats/);
});

test('a roster can change one position without changing the other players',()=>{
  const first=newRoomSetup(3),second=changeRoomSetup(first,'seat-kind-1','bot');
  assert.deepEqual(second.seats,[{kind:'human',team:0},{kind:'bot',team:1,difficulty:'normal'},{kind:'human',team:2}]);
  assert.equal(first.seats[1].kind,'human');
});

test('seat count works by radio group, includes only 2–4, and adds a human invitation when expanded',()=>{
  const next=changeRoomSetup(newRoomSetup(2),'roomSeatCount','4');
  assert.deepEqual(next.seats[3],{kind:'human',team:3});
  const html=roomSetupFields(next,true);
  assert.equal((html.match(/type="radio" name="roomSeatCount"/g)||[]).length,3);
  assert.match(html,/name="roomSeatCount" value="4" checked disabled/);
});

test('every seat is editable before the summary and computers expose their own difficulty',()=>{
  let setup=changeRoomSetup(newRoomSetup(4),'seat-kind-1','bot');
  setup=changeRoomSetup(setup,'seat-kind-3','bot');
  setup=changeRoomSetup(setup,'seat-difficulty-3','hard');
  const html=roomSetupFields(setup);
  assert.ok(html.indexOf('name="seat-team-3"')<html.indexOf('The starting team is drawn at random.'));
  assert.match(html,/name="seat-difficulty-1"/);
  assert.match(html,/name="seat-difficulty-3"/);
  assert.doesNotMatch(html,/name="seat-difficulty-[02]"/);
  assert.notEqual(setup.seats[1].difficulty,setup.seats[3].difficulty);
});

test('host sees the exact invitation requirement in human and bot-only opposition rooms',()=>{
  assert.match(roomSetupFields(newRoomSetup(4)),/Human seats to invite<\/strong> · 3/);
  const bots=changeRoomSetup(newRoomSetup(),'seat-kind-1','bot');
  assert.match(roomSetupFields(bots),/Only the host needs to join/);
});

import {isComputerActing,roomSeatTurn} from '../docs/room-turn.js';

test('two active allies can submit independently while legacy matches keep seat order',()=>{
  const base={phase:'playing',turn:0,players:[{},{},{bot:true},{}]};
  assert.equal(roomSeatTurn(base,1),'waiting');
  const state={...base,teamPhase:{team:0,activeSeats:[0,1,2],readySeats:[]}};
  assert.equal(roomSeatTurn(state,1),'active');
  assert.equal(roomSeatTurn(state,3),'waiting');
  assert.equal(isComputerActing(state),true);
  state.teamPhase={team:0,activeSeats:[1],readySeats:[0,2]};
  assert.equal(roomSeatTurn(state,0),'ready');
  assert.equal(isComputerActing(state),false);
});

import {captureRoomOrder} from '../docs/room-turn.js';

test('a team order keeps the issuing seat key and the displayed revision even when a teammate updates the room',()=>{
  const room={code:'BASIN2',revision:7,game:{teamPhase:{orderKey:'phase-2-seat-1-3'}}};
  const order=captureRoomOrder(room,{type:'end'});
  room.revision++;room.game.teamPhase.orderKey='next';
  assert.deepEqual(order,{op:'action',code:'BASIN2',revision:7,orderKey:'phase-2-seat-1-3',action:{type:'end'}});
  assert.ok(!('orderKey' in captureRoomOrder({code:'OLD123',revision:2,game:{}},{type:'end'})));
});

import {teamTurnLabels} from '../docs/room-turn.js';
import {translate} from '../docs/i18n.js';

test('active, ready and rival seats see distinct turn controls in English and Chinese',()=>{
  const state={phase:'playing',turn:0,teamPhase:{team:2,activeSeats:[0],readySeats:[1]}};
  assert.deepEqual(teamTurnLabels(state,0),{owner:'Your team is playing',button:'Mark ready'});
  assert.equal(teamTurnLabels(state,1).button,'Waiting for allies…');
  assert.equal(teamTurnLabels(state,2).owner,'Team C');
  assert.equal(teamTurnLabels({phase:'playing',turn:0},0),null);
  for(const seat of [0,1,2])for(const word of Object.values(teamTurnLabels(state,seat)))assert.notEqual(translate(word,'zh-CN'),word);
});

import {teamMemberStatus} from '../docs/room-turn.js';
test('the roster shows who can issue orders and teammates are explained only for a team campaign',()=>{
  const state={phase:'playing',players:[{},{},{},{eliminated:true}],teamPhase:{team:0,activeSeats:[0],readySeats:[1]}};
  assert.deepEqual([0,1,2,3].map(seat=>teamMemberStatus(state,seat)),['Taking orders','Ready','Waiting for team turn','Eliminated']);
  assert.doesNotMatch(roomSetupFields(newRoomSetup(3)),/Allies act together/);
  const setup=changeRoomSetup(newRoomSetup(3),'seat-team-2','0');
  assert.match(roomSetupFields(setup),/Allies act together/);
});

import {mayResumeOrder} from '../docs/room-turn.js';
test('an interrupted order is retried only in its original room with the same live seat key',()=>{
  const room={code:'BASIN2',phase:'playing',you:1,revision:8,game:{phase:'playing',teamPhase:{team:0,activeSeats:[0,1],readySeats:[],orderKey:'r1s1o2'}}};
  const order=captureRoomOrder(room,{type:'end'});
  assert.equal(mayResumeOrder({...room,revision:12},order),true);
  assert.equal(mayResumeOrder({...room,code:'OTHER2'},order),false);
  for(const change of [{orderKey:'r1s1o3'},{activeSeats:[0],readySeats:[1]}]){
    assert.equal(mayResumeOrder({...room,game:{...room.game,teamPhase:{...room.game.teamPhase,...change}}},order),false);
  }
  assert.equal(mayResumeOrder({...room,phase:'finished'},order),false);
  assert.equal(mayResumeOrder(room,{code:room.code}),false);
});

test('the room builder describes shared team charts in both languages',()=>{
  const html=roomSetupFields(newRoomSetup());
  assert.doesNotMatch(html,/own units, treasury and vision/);
  const phrase='Allies share sight, discoveries and victory. Each player commands their own units and treasury.';
  assert.ok(html.includes(phrase));
  assert.match(translate(phrase,'zh-CN'),/共享视野/);
});

test('a team attack retains the defender from the initial visible forecast',()=>{
  const room={code:'BASIN2',revision:22,game:{teamPhase:{orderKey:'k'},intel:{forecasts:{u4:{'5,2':{defenderId:'u9'}}}}}};
  const action={type:'attack',unit:'u4',tile:'5,2'};
  const saved=captureRoomOrder(room,action);
  room.game.intel.forecasts.u4['5,2'].defenderId='c5';
  assert.equal(saved.action.defenderId,'u9');
  assert.equal(action.defenderId,undefined);
});
