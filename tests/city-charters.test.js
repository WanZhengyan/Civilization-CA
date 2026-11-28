import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,applyAction,getStats,getCityYield,campaignView} from '../docs/rules.js';
import {charterOptions,proposeCharter} from '../docs/city-charters.js';

function capital(building) {
  let state=createGame([{name:'West'},{name:'East'}],'la',{seed:624101,mapSize:'large'});
  state.campaignVariety=1;
  state=applyAction(state,0,{type:'found',unit:state.units[0].id});
  const city=state.cities[0].id;
  if (building==='workshop') {
    state=applyAction(state,0,{type:'research',item:'industry'});
    while (!state.players[0].technologies.includes('industry')) {
      state=applyAction(state,0,{type:'end'});
      if (!state.cities.some(c=>c.seat===1)) state=applyAction(state,1,{type:'found',unit:state.units.find(u=>u.seat===1).id});
      state=applyAction(state,1,{type:'end'});
      assert.ok(state.round<20);
    }
  }
  state=applyAction(state,0,{type:'produce',city,item:building});
  while (state.cities[0].population<2 || !state.cities[0].buildings.includes(building) || state.players[0].capital<18) {
    state=applyAction(state,0,{type:'end'});
    if(!state.cities.some(c=>c.seat===1))state=applyAction(state,1,{type:'found',unit:state.units.find(u=>u.seat===1).id});
    state=applyAction(state,1,{type:'end'});
    assert.ok(state.round<20);
  }
  return state;
}
for(const [id,building,increases] of [
  ['growers','granary',{food:3}],['machinists','workshop',{production:3}],['merchants','monument',{capital:3,influence:1}]
]) test('a legally founded city invests in '+id+' and receives its quoted yields',()=>{
  const s=capital(building),c=s.cities[0],stats=getStats(s,0),y=getCityYield(s,c.id);
  const next=applyAction(s,0,{type:'cityCharter',city:c.id,item:id});
  assert.equal(s.players[0].capital-next.players[0].capital,18);
  const afterStats=getStats(next,0),afterYield=getCityYield(next,c.id);
  for(const key of ['food','production','capital','influence'])assert.equal(afterYield[key]-y[key],increases[key]||0);
  for(const key of ['capital','influence'])assert.equal(afterStats[key+'Income']-stats[key+'Income'],increases[key]||0);
  assert.throws(()=>applyAction(next,0,{type:'cityCharter',city:c.id,item:id}),/Charter in force/);
  const replay=JSON.parse(JSON.stringify(next));
  assert.deepEqual(getCityYield(replay,c.id),afterYield);
  const rival=campaignView(next,1);
  assert.equal(rival.cities.find(city=>city.id===c.id)?.charter,undefined);
  assert.ok(!rival.log.some(row=>row.type==='cityCharter'));
});
test('unmarked campaigns, foreign cities, underfunded cities and an unbuilt charter are rejected',()=>{
  const s=capital('workshop'),c=s.cities[0];
  assert.throws(()=>applyAction(s,0,{type:'cityCharter',city:c.id,item:'growers'}),/granary/);
  assert.throws(()=>applyAction(s,0,{type:'cityCharter',city:s.cities[1].id,item:'machinists'}),/one of your cities/);
  s.players[0].capital=17;
  assert.throws(()=>applyAction(s,0,{type:'cityCharter',city:c.id,item:'machinists'}),/18 gold/);
  s.players[0].capital=60;
  assert.equal(proposeCharter(s,0).item,'machinists');
  delete s.campaignVariety;
  assert.deepEqual(charterOptions(s,0,c),[]);
  assert.equal(proposeCharter(s,0),null);
  assert.throws(()=>applyAction(s,0,{type:'cityCharter',city:c.id,item:'machinists'}),/one of your cities/);
});
