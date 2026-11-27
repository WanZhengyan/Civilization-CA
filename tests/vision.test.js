import test from 'node:test';
import assert from 'node:assert/strict';
import {getSightRadius,getVisibleTiles} from '../docs/vision.js';
import {getMap} from '../docs/rules.js';

function field() {
  return {board:Object.fromEntries(getMap('sf').tiles.map(t=>[t.id,{owner:null,level:0}])),units:[{id:'unit',seat:0,type:'settler',tile:'8,6'}],cities:[]};
}

test('each formation has a defined sight footprint, distinct from its attack and movement',()=>{
  const state=field();
  const settler=getVisibleTiles(state,0);
  assert.equal(settler.size,7);
  const type=state.units[0];
  type.type='scout';
  assert.equal(getSightRadius('scout'),3);
  assert.equal(getVisibleTiles(state,0).size,37);
  type.type='melee';
  assert.equal(getVisibleTiles(state,0).size,19);
  type.type='frigate';
  assert.equal(getVisibleTiles(state,0).size,37);
  assert.equal(getVisibleTiles(state,1).size,0);
});

test('city lookouts and controlled districts contribute only to their owner’s view',()=>{
  const s=field();s.units=[];s.cities=[{seat:0,tile:'8,6'}];s.board['0,0'].owner=0;
  assert.equal(getVisibleTiles(s,0).size,20);
  assert.equal(getVisibleTiles(s,1).size,0);
  s.cities[0].tile='0,0';
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
