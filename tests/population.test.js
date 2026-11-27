import test from 'node:test';
import assert from 'node:assert/strict';
import {foodForecast, feedCity} from '../docs/population.js';
import {createGame,applyAction,getCityYield,getPopulationReport,getUnitOptions} from '../docs/rules.js';

function settled() {
  let state=createGame([{name:'Agronomist'},{name:'Neighbor'}],'la',{seed:323});
  if (!state.cities.length) {
    const u=state.units.find(u=>u.seat===0 && u.type==='settler');
    assert.ok(getUnitOptions(state,u.id).canFound);
    state=applyAction(state,0,{type:'found',unit:u.id});
  }
  return state;
}
test('food uses stored reserves before losing a citizen and protects the founding household',()=>{
  const city={population:4,food:5};
  let report=foodForecast(city,5);
  assert.equal(report.surplus,-3); assert.equal(report.starvationTurns,2);
  feedCity(city,report);assert.deepEqual(city,{population:4,food:2});
  feedCity(city,foodForecast(city,5));assert.deepEqual(city,{population:3,food:0});
  const minimum={population:1,food:0};
  feedCity(minimum,foodForecast(minimum,0));assert.equal(minimum.population,1);
});
test('actual owner turn feeds the city, carries surplus beyond a growth threshold and leaves prior revision intact',()=>{
  const state=settled(), city=state.cities.find(c=>c.seat===0);
  city.food=7;
  const before=getPopulationReport(state,city.id);
  assert.equal(before.harvest,getCityYield(state,city.id).food);
  assert.equal(before.consumption,2);assert.equal(before.growthTurns,1);
  const next=applyAction(state,0,{type:'end'}), updated=next.cities.find(c=>c.id===city.id);
  assert.equal(updated.population,2);
  assert.equal(updated.food,before.food + before.surplus - before.threshold);
  assert.equal(city.food,7); assert.equal(city.population,1);
});
