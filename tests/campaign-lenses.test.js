import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAction,campaignView,createGame,getMap} from '../docs/rules.js';
import {surveyLayer} from '../docs/campaign-lenses.js';
const fresh=()=>createGame([{name:'Planner',civilization:'arroyo'}],'la',{seed:624101,practice:true});
function capital(){
  const start=fresh();return applyAction(start,0,{type:'found',unit:start.units[0].id});
}
test('a survey paints only projected memories, separating current sight and uncharted hexes',()=>{
  const raw=fresh(),state=campaignView(raw,0),tile=state.intel.visible[0];
  assert.equal(surveyLayer(raw,0,'survey').size,0);
  assert.equal(surveyLayer(state,1,'survey').size,0);
  const visible=surveyLayer(state,0,'survey');
  assert.equal(visible.get(tile).band,0);
  assert.equal(visible.size,state.intel.explored.length);
  const memory={...state,intel:{...state.intel,visible:[]}};
  assert.equal(surveyLayer(memory,0,'survey').get(tile).band,1);
});
