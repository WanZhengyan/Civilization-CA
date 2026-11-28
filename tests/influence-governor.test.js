import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAction,campaignView,chooseBotAction,createGame,getCitizenWorkforce,getCityExpansion} from '../docs/rules.js';

test('a governor buys a parcel that improves the current harvest while saving influence for diplomacy',()=>{
  let state=createGame([{bot:true},{bot:true}],'sf',{seed:624102,mapSize:'large'});
  while (state.phase==='playing' && state.round<=26) {
    const seat=state.turn;
    const order=chooseBotAction(state);
    if (order.type!=='charterBorder') {
      state=applyAction(state,seat,order);
      continue;
    }
    assert.deepEqual(chooseBotAction(campaignView(state,seat)),order);
    const report=getCityExpansion(state,order.city);
    assert.equal(report.tile,order.tile);
    assert.ok(report.turns>=3);
    assert.equal(chooseBotAction({...state,influencePlanning:undefined}).type,'end');
    const lowReserve=structuredClone(state);
    lowReserve.players[seat].influence=14;
    assert.notEqual(chooseBotAction(lowReserve).type,'charterBorder');
    const next=applyAction(state,seat,order);
    assert.equal(next.players[seat].influence,state.players[seat].influence-6);
    const before=getCitizenWorkforce(state,order.city).yields;
    const after=getCitizenWorkforce(next,order.city).yields;
    assert.ok(Object.keys(before).every(resource=>after[resource]>=before[resource]));
    assert.ok(Object.keys(before).some(resource=>after[resource]>before[resource]));
    return;
  }
  assert.fail('Expected a productive border charter in the fixed San Francisco opening');
});
