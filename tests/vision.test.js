import test from 'node:test';
import assert from 'node:assert/strict';
import {getSightRadius,getVisibleTiles} from '../docs/vision.js';
import {campaignView, getMap, UNIT_TYPES} from '../docs/rules.js';

function field() {
  return {board:Object.fromEntries(getMap('sf').tiles.map(t=>[t.id,{owner:null,level:0}])),units:[{id:'unit',seat:0,type:'settler',tile:'8,6'}],cities:[]};
}

test('every mobile formation sees two rings while movement and attack ranges stay independent',()=>{
  const state=field();
  for (const type of Object.keys(UNIT_TYPES)) {
    state.units[0].type=type;
    assert.equal(getSightRadius(type),2,type);
    assert.equal(getVisibleTiles(state,0).size,19,type);
  }
  assert.ok(UNIT_TYPES.scout.moves>UNIT_TYPES.melee.moves);
  assert.ok(UNIT_TYPES.artillery.range>getSightRadius('artillery'));
  assert.equal(getVisibleTiles(state,1).size,0);
});

test('city lookouts and controlled districts contribute only to their owner’s view',()=>{
  const s=field();s.units=[];s.cities=[{seat:0,tile:'8,6'}];s.board['3,0'].owner=0;
  assert.equal(getVisibleTiles(s,0).size,20);
  assert.equal(getVisibleTiles(s,1).size,0);
  s.cities[0].tile='3,0';
  assert.ok(getVisibleTiles(s,0).size<19);
  for(const tile of getVisibleTiles(s,0)) assert.ok(s.board[tile]);
});

import {getVision, rememberVision, projectForSeat} from '../docs/vision.js';
test('exploration persists across moves, is private, and stores only observed resources',()=>{
  const starting={...field(),players:[{surveyEnabled:false},{}],round:1,turn:0,log:[]};
  starting.board['8,6'].resource='citrus';
  const a=rememberVision(starting);
  assert.equal(projectForSeat(a,0).board['8,6'].resource,undefined);
  const changed=structuredClone(a);
  changed.units[0].tile='12,8';changed.players[0].surveyEnabled=true;
  changed.board['12,8'].resource='kelp';
  const b=rememberVision(changed,a);
  assert.ok(getVision(b,0).explored.has('8,6'));
  assert.ok(!getVision(b,0).visible.has('8,6'));
  assert.equal(projectForSeat(b,0).board['8,6'].resource,undefined);
  assert.equal(projectForSeat(b,0).board['12,8'].resource,'kelp');
  const later=structuredClone(b);
  later.units[0].tile='1,1';later.board['12,8'].resource='timber';later.board['12,8'].owner=1;
  later.units.push({id:'secret',tile:'12,8',type:'melee',seat:1});
  const view=projectForSeat(rememberVision(later,b),0);
  assert.equal(view.board['12,8'].resource,'kelp');
  assert.equal(view.board['12,8'].owner,null);
  assert.ok(!view.units.some(u=>u.id==='secret'));
  assert.equal(a.exploration[0]['12,8'],undefined);
  assert.strictEqual(projectForSeat(view,0),view);
});

test('a charted deposit in an old scout’s fourth ring stays on the map without revealing current occupants',()=>{
  const state={...field(),mapId:'sf',round:6,turn:0,log:[],
    players:[{technologies:['cartography'],surveyEnabled:true},{}],
    exploration:[{'11,6':'timber','12,6':'citrus'},{}]};
  state.units[0].type='scout';
  state.units.push({id:'hidden',seat:1,type:'ranged',tile:'11,6'});
  state.board['11,6']={owner:1,level:3,resource:'iron',improvement:'mine'};
  const resumed=JSON.parse(JSON.stringify(state));
  const view=campaignView(rememberVision(resumed),0);
  assert.equal(view.intel.visible.length,19);
  for(const [id,deposit] of Object.entries(state.exploration[0])) {
    assert.ok(view.intel.explored.includes(id));
    assert.ok(!view.intel.visible.includes(id));
    assert.deepEqual(view.board[id],{owner:null,level:0,improvement:null,resource:deposit});
  }
  assert.equal(view.units.length,1);
});

test('an old team chart contributes explored land without exposing current occupants',()=>{
  const s={...field(),mapId:'sf',players:[{}, {}, {}],teams:[0,0,1],round:2,turn:0,log:[],
    exploration:[{}, {'11,6':'timber'}, {'1,1':'citrus'}]};
  s.units=[];s.board['11,6']={owner:2,level:3,resource:'iron'};
  const v=projectForSeat(s,0);
  assert.deepEqual(v.intel.explored,['11,6']);
  assert.equal(v.board['11,6'].resource,'timber');
  assert.equal(v.board['11,6'].owner,null);
  assert.equal(v.intel.visible.length,0);
});

test('the first team survey unlocks deposits within shared sight for people and computers',()=>{
  const s={...field(),mapId:'sf',players:[{surveyEnabled:false},{surveyEnabled:false},{surveyEnabled:false}],
    teams:[0,0,1],round:1,turn:0,log:[]};
  s.board['8,6'].resource='timber';
  assert.equal(projectForSeat(s,1).board['8,6'].resource,undefined);
  s.players[0].surveyEnabled=true;
  const v=projectForSeat(rememberVision(s),1);
  assert.equal(v.board['8,6'].resource,'timber');
  assert.equal(v.intel.teamSurveyed,true);
  assert.equal(projectForSeat(s,2).board['8,6'].resource,undefined);
});
