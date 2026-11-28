import assert from 'node:assert/strict';
import test from 'node:test';
import {cityKind,foundingLabel} from '../docs/district-command.js';

test('city labels distinguish the founder, the current controller, ordinary cities and unseen former capitals',()=>{
  for(const seat of [0,1]) {
    assert.equal(cityKind({seat,originalSeat:seat},seat),'Your capital city');
    assert.equal(cityKind({seat,originalSeat:seat},1-seat),'Rival capital city');
    assert.equal(cityKind({seat,originalSeat:1-seat},seat),'Captured original capital');
    assert.equal(cityKind({seat,originalSeat:null},seat),'Your city');
    assert.equal(cityKind({seat},1-seat),'Rival city');
  }
  const teamGame={players:[{}, {}, {}],teams:[1,2,1]};
  assert.equal(cityKind({seat:2,originalSeat:2},0,teamGame),'Allied capital city');
  assert.equal(cityKind({seat:2},0,teamGame),'Allied city');
  assert.equal(cityKind({seat:1},0,teamGame),'Rival city');
  const fresh={opening:'settlers',cities:[],log:[{type:'start'}]};
  assert.equal(foundingLabel(fresh,0),'Found capital');
  assert.equal(foundingLabel({...fresh,intel:{hasFoundedCapital:true}},0),'Found city');
  assert.equal(foundingLabel({...fresh,log:[...fresh.log,{type:'found',seat:0}]},0),'Found city');
  assert.equal(foundingLabel({...fresh,log:[{type:'end',seat:0}]},0),'Found city');
});
