import assert from 'node:assert/strict';
import test from 'node:test';
import {applyAction,campaignView,createGame,getCityYield,getPopulationReport,getStats} from '../docs/rules.js';
import {focusPlan} from '../docs/city-planning.js';

test('citizen focus previews agree with a committed harvest without issuing a city order',()=>{
  let state=createGame([{name:'Coast'},{name:'Valley'}],'la',{mapSize:'large',seed:624101});
  const act=action=>{state=applyAction(state,state.turn,action);};
  act({type:'found',unit:state.units[0].id});
  const id=state.cities[0].id;
  act({type:'produce',city:id,item:'workshop'});
  act({type:'end'});
  act({type:'found',unit:state.units.find(u=>u.seat===1).id});
  act({type:'end'});
  while(state.round<5){act({type:'end'});act({type:'end'});}
  const original=structuredClone(state);
  for(const focus of ['balanced','food','industry','science']){
    const plan=focusPlan(campaignView(state,0),0,id,focus);
    const committed=applyAction(state,0,{type:'focus',city:id,item:focus});
    assert.equal(plan.production,getCityYield(committed,id).production);
    assert.equal(plan.science,getStats(committed,0).scienceIncome);
    assert.deepEqual(plan.population,getPopulationReport(committed,id));
    assert.equal(plan.workforce.focus,focus);
  }
  assert.deepEqual(state,original);
  assert.equal(focusPlan(campaignView(state,1),0,id,'science'),null);
  assert.equal(focusPlan(state,1,id,'industry'),null);
  assert.equal(focusPlan(state,0,id,'bad'),null);
});
