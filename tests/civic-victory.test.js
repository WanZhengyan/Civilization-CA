import {createClassicGame} from './classic-game.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyAction, getStats, getMap, TARGET_SCORE} from '../docs/rules.js';

function boardWithScore(score) {
  const state=createClassicGame(['West','East']);
  let remaining=score-getStats(state,0).score;
  for(const tile of getMap(state).tiles){
    if(remaining<2)break;
    if(state.board[tile.id].owner!==null || tile.landmark || ['ocean','mountains'].includes(tile.terrain))continue;
    state.board[tile.id].owner=0;
    remaining-=2;
  }
  state.board[state.cities[0].tile].level+=remaining;
  assert.equal(getStats(state,0).score,score);
  return state;
}

test('civic victories leave room for modern units and resolve after both sides finish the round',()=>{
  assert.equal(TARGET_SCORE,125);
  for(const score of [100,124,125]){
    const state=boardWithScore(score);
    const afterWest=applyAction(state,0,{type:'end'});
    assert.equal(afterWest.phase,'playing');
    const afterEast=applyAction(afterWest,1,{type:'end'});
    if(score===TARGET_SCORE){
      assert.equal(afterEast.victoryReason,'civic');
      assert.deepEqual(afterEast.winners,[0]);
    }else{
      assert.equal(afterEast.phase,'playing');
      assert.equal(afterEast.round,2);
    }
  }
});
