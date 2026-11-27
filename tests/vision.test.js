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
