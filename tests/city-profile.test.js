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
import {buildingReturns} from '../docs/city-profile-works.js';
test('a prospective granary agrees with the actual food and housing after construction',()=>{
  let state=capital();const c=state.cities[0],quote=buildingReturns(campaignView(state,0),c).find(r=>r.item==='granary');
  assert.equal(quote.changes.housing,2);assert.equal(quote.changes.food,2);
  const control={...state,cities:state.cities.map(c=>({...c,buildings:[...c.buildings,'granary']}))};
  assert.equal(getCityYield(control,c.id).food-getCityYield(state,c.id).food,quote.changes.food);
  assert.ok(!buildingReturns(state,c).some(r=>r.item==='academy'));
});
test('a partially finished order quotes the remaining gold and credits parked production',()=>{
  const state=capital(),c=state.cities[0];
  c.queue={item:'scout',progress:3,required:7};c.parkedProduction={builder:2};state.players[0].capital=100;
  const markup=cityProfilePage(state,0,c.id,'works');
  assert.match(markup,/Scout \(current\).*?3 \/ 7.*?<td>12<\/td><td>88/);
  assert.match(markup,/Builder \(paused\)/);
  assert.match(markup,/data-study-command="rush-quote"/);
});
import {cityDeposits} from '../docs/city-profile-land.js';
test('supply catchments distinguish active and damaged deposits and exclude foreign holdings',()=>{
  const state=capital(),c=state.cities[0],id=c.tile;
  Object.assign(state.board[id],{resource:'grain',improvement:'farm'});
  assert.equal(cityDeposits(state,c).find(r=>r.id===id).connected,true);
  state.board[id].pillaged=true;
  assert.equal(cityDeposits(state,c).find(r=>r.id===id).repair,true);
  state.board[id].owner=1;
  assert.ok(!cityDeposits(state,c).some(r=>r.id===id));
});
import {landmarkJobs} from '../docs/city-profile-land.js';
import {assignWorkforce} from '../docs/workforce.js';
test('landmark employment separates unrealized income and stacks actual adjacent landmark bonuses',()=>{
  const workforce=assignWorkforce({population:1},[
    {id:'a',name:'A',terrain:'plains',naturalWonders:['laBrea','topanga']},
    {id:'b',name:'B',terrain:'plains',naturalWonders:['laBrea']}]);
  const [a,b]=landmarkJobs(workforce);
  assert.deepEqual(a.premium,[0,1,3]);
  assert.equal(a.worked,true);assert.equal(b.worked,false);
  assert.deepEqual(workforce.yields,{food:3,production:1,science:3});
});
import {getCityExpansion} from '../docs/rules.js';
test('charter comparison locates the same parcel that an approved influence purchase actually claims',()=>{
  const state=capital(),c=state.cities[0];state.players[0].influence=10;c.borderProgress=2;
  const parcel=getCityExpansion(state,c.id).tile,html=cityProfilePage(campaignView(state,0),0,c.id,'land');
  assert.ok(html.includes('data-study-value="'+parcel+'"'));
  assert.match(html,/Border charter<\/th><td>Now<\/td><td>4/);
  const next=applyAction(state,0,{type:'charterBorder',city:c.id,tile:parcel});
  assert.equal(next.board[parcel].owner,0);assert.equal(next.cities[0].borderProgress,0);
});
