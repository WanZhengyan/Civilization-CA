import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,applyAction,getProductionOptions,campaignView,migrateGame,getMap} from '../docs/rules.js';
import {revisionOf} from '../docs/works.js';

function capital() {
  let state=createGame([{name:'Founder'}],'la',{seed:323,practice:true});
  state=applyAction(state,0,{type:'found',unit:state.units[0].id});
  state.players[0].capital=200;
  return state;
}
const option=(state,item='settler')=>getProductionOptions(state,state.cities[0].id,{replace:true}).find(o=>o.item===item);
function order(state,type,item='settler') {
  const city=state.cities[0];
  return applyAction(state,0,{type,item,city:city.id,expected:revisionOf(city),gold:option(state,item).gold});
}
test('population one and two block production, replacement and direct or rushed purchase in authority and seat view',()=>{
  for (const population of [1,2]) {
    const state=capital(),city=state.cities[0];
    city.population=population;
    for(const queued of [null,{item:'scout',progress:4,required:10},{item:'settler',progress:7,required:14}]) {
      city.queue=queued;
      for (const view of [state,campaignView(state,0)]) {
        const quote=option(view);
        assert.equal(quote.enabled,false);
        assert.equal(quote.buyEnabled,false);
        assert.match(quote.buyReason,/3 residents/);
      }
      const snapshot=structuredClone(state);
      assert.throws(()=>order(state,queued?'switchProduction':'produce'),/3 residents/);
      assert.throws(()=>order(state,'buyProduction'),/3 residents/);
      assert.deepEqual(state,snapshot);
    }
  }
});

test('buying a settler deducts one resident only on successful deployment and a repeated order is stale',()=>{
  const state=capital(),city=state.cities[0];
  city.population=3;
  const gold=option(state).gold;
  const payload={type:'buyProduction',city:city.id,item:'settler',expected:revisionOf(city),gold};
  const bought=applyAction(state,0,payload);
  assert.equal(bought.cities[0].population,2);
  assert.equal(bought.players[0].capital,state.players[0].capital-gold);
  assert.equal(bought.units.filter(u=>u.type==='settler').length,1);
  assert.throws(()=>applyAction(bought,0,payload),/Production changed/);
  assert.equal(option(bought).enabled,false);
  assert.equal(city.population,3);
});

test('a legacy project keeps its invested production while underpopulated and resumes on the harvest that restores three residents',()=>{
  const state=capital(),city=state.cities[0];
  city.population=1;
  city.queue={item:'settler',progress:13,required:14};
  const end=s=>applyAction(s,0,{type:'end'});
  const paused=end(migrateGame(JSON.parse(JSON.stringify(state))));
  assert.deepEqual(paused.cities[0].queue,city.queue);
  assert.equal(paused.units.length,0);
  const changed=order(paused,'switchProduction','scout');
  assert.equal(changed.cities[0].parkedProduction.settler,13);
  assert.equal(changed.cities[0].population,paused.cities[0].population);
  paused.cities[0].population=2;
  paused.cities[0].food=10;
  const restored=end(paused);
  assert.equal(restored.units.filter(u=>u.type==='settler').length,1);
  assert.equal(restored.cities[0].queue,null);
  assert.equal(restored.cities[0].population,2);
});

test('starvation or a blocked ring of tiles never consumes a resident before deployment',()=>{
  const state=capital(),city=state.cities[0];
  city.population=3;
  city.focus='industry';
  city.food=0;
  city.queue={item:'settler',progress:14,required:14};
  const hungry=applyAction(state,0,{type:'end'});
  assert.equal(hungry.cities[0].population,2);
  assert.deepEqual(hungry.cities[0].queue,city.queue);
  assert.equal(hungry.units.length,0);

  city.focus='balanced';
  state.units=[city.tile,...getMap(state).neighbors(city.tile)].map((tile,i)=>({
    id:'blocker-'+i,seat:0,type:'melee',tile,maxHp:100,hp:100,moves:0,maxMoves:2
  }));
  let blocked=applyAction(state,0,{type:'end'});
  assert.equal(blocked.cities[0].population,3);
  assert.deepEqual(blocked.cities[0].queue,city.queue);
  blocked.units=blocked.units.filter(u=>u.tile!==city.tile);
  const deployed=applyAction(blocked,0,{type:'end'});
  assert.equal(deployed.cities[0].population,2);
  assert.equal(deployed.units.filter(u=>u.type==='settler').length,1);
  assert.equal(deployed.cities[0].queue,null);
});
