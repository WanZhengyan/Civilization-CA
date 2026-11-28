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
