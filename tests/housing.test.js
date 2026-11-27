import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,applyAction,getPopulationReport} from '../docs/rules.js';
import {foodForecast,feedCity} from '../docs/population.js';
const players=[{name:'Mayor'},{name:'Visitor'}];

test('housing stops growth, banks one growth reserve and never evicts an older city',()=>{
  const city={population:3,food:11,buildings:[]};
  let report=foodForecast(city,9);
  assert.equal(report.housing,3);assert.equal(report.housingLimited,true);assert.equal(report.growthTurns,null);
  for(let i=0;i<3;i++)feedCity(city,foodForecast(city,9));
  assert.equal(city.population,3);assert.equal(city.food,12);
  city.buildings.push('neighborhood');
  report=foodForecast(city,6);assert.equal(report.growthTurns,1);
  feedCity(city,report);assert.equal(city.population,4);assert.equal(city.food,0);
  city.population=9;feedCity(city,foodForecast(city,18));assert.equal(city.population,9);
});
test('an actual housing project completes before lifting the capacity on the next harvest',()=>{
  let state=createGame(players,'la',{seed:387});
  if(!state.cities.length)state=applyAction(state,0,{type:'found',unit:state.units.find(u=>u.seat===0).id});
  const city=state.cities.find(c=>c.seat===0);city.population=3;city.food=12;
  state=applyAction(state,0,{type:'produce',city:city.id,item:'neighborhood'});
  const pending=state.cities.find(c=>c.id===city.id);
  pending.queue.progress=pending.queue.required-1;
  const next=applyAction(state,0,{type:'end'});
  const built=next.cities.find(c=>c.id===city.id);
  assert.ok(built.buildings.includes('neighborhood'));assert.equal(built.population,3);
  assert.equal(getPopulationReport(next,city.id).housing,6);
});
