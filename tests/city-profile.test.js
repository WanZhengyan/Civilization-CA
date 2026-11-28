import assert from 'node:assert/strict';
import test from 'node:test';
import {applyAction,createGame,campaignView,getCityYield,getPopulationReport} from '../docs/rules.js';
import {cityProfilePage} from '../docs/city-profile.js';

function capital(){
  const start=createGame([{civilization:'arroyo'}],'la',{seed:624101,practice:true});
  return applyAction(start,0,{type:'found',unit:start.units[0].id});
}
test('city accounts use the real local harvest and stay private to the owner',()=>{
  const state=capital(),view=campaignView(state,0),city=state.cities[0];
  const report=cityProfilePage(view,0,city.id);
  assert.ok(report.includes('Food grown</th><td>'+getCityYield(state,city.id).food));
  assert.ok(report.includes('Food consumed</th><td>-'+getPopulationReport(state,city.id).consumption));
  assert.equal(cityProfilePage(view,1,city.id),'');
});
test('a workforce profile locates worked land and accounts for every resident',()=>{
  const state=capital(),city=state.cities[0];
  const text=cityProfilePage(campaignView(state,0),0,city.id,'people');
  assert.match(text,/district workers and/);
  assert.match(text,/data-study-command="tile"/);
});
import {harvestCalendar} from '../docs/city-profile-growth.js';
test('constant-land harvest calendar grows and credits the same next harvest without touching the save',()=>{
  const state=capital(),city=state.cities[0];
  const before=JSON.stringify(state),rows=harvestCalendar(state,city);
  const actual=applyAction(state,0,{type:'end'}).cities[0];
  assert.equal(rows[0].food,actual.food);assert.equal(rows[0].population,actual.population);
  assert.ok(rows.at(-1).population>=rows[0].population);
  assert.equal(JSON.stringify(state),before);
});
test('workforce comparisons open a preview for each alternative while leaving the current focus intact',()=>{
  const state=capital(),c=state.cities[0];
  const html=cityProfilePage(state,0,c.id,'people');
  assert.equal((html.match(/data-study-command="focus"/g)||[]).length,3);
  assert.equal(c.focus||'balanced','balanced');
});
import {nextHire} from '../docs/city-profile-land.js';
test('the next workforce forecast identifies an actual additional employee',()=>{
  const state=capital(),c=state.cities[0],draft=nextHire(state,c);
  assert.ok(draft.job.workers>(draft.current.workedTiles.find(j=>j.id===draft.job.id)?.workers||0));
  assert.equal(draft.next.workedTiles.reduce((n,j)=>n+j.workers,0),c.population+1);
});
