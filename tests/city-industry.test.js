import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAction, BUILDINGS, campaignView, createGame, getCityYield, getPopulationReport,
  getProductionOptions, getProjectSites, getResearchOptions, getStats, migrateGame} from '../docs/rules.js';
import {revisionOf} from '../docs/works.js';

function opening(mapId='la') {
  let state=createGame([{name:'West'},{name:'East'}],mapId,{seed:624101,mapSize:'large'});
  state=applyAction(state,0,{type:'found',unit:state.units[0].id});
  return state;
}

function learn(state,technology) {
  const project=getResearchOptions(state,0).find(o=>o.item===technology);
  if (project.completed) return state;
  for (const earlier of project.requires) state=learn(state,earlier);
  return applyAction(state,0,{type:'research',item:technology});
}

const offers=state=>getProductionOptions(state,state.cities[0].id,{replace:true});
function buy(state,item) {
  const city=state.cities[0], option=offers(state).find(o=>o.item===item);
  return applyAction(state,0,{type:'buyProduction',city:city.id,item,site:city.tile,gold:option.gold,expected:revisionOf(city)});
}
const cityOrder=(state,item)=>applyAction(state,0,{type:'produce',city:state.cities[0].id,item});
const cycle=state=>applyAction(applyAction(state,0,{type:'end'}),1,{type:'end'});

test('a fresh capital across all three maps needs the actual technology to quote, site, start or buy an advanced building',()=>{
  for (const region of ['la','sf','sd']) {
    const state=opening(region), city=state.cities[0];
    state.players[0].capital=1000;
    for (const item of ['workshop','walls','shop','academy','grainMill','foundry','printingHouse']) {
      assert.ok(!offers(state).some(o=>o.item===item),item);
      assert.deepEqual(getProjectSites(state,city.id,item),[],item);
      assert.throws(()=>cityOrder(state,item),/available production/);
      assert.throws(()=>applyAction(state,0,{type:'buyProduction',city:city.id,item,gold:BUILDINGS[item].required*3,expected:0}),/purchasable/);
    }
    assert.ok(offers(state).some(o=>o.item==='granary' && o.enabled));
    assert.ok(offers(state).some(o=>o.item==='monument' && o.enabled));
    assert.equal(city.queue,null);
    assert.equal(state.players[0].capital,1000);
  }
});

test('research in progress or an advanced era alone does not unlock a different technology’s building',()=>{
  let state=opening();
  state=applyAction(state,0,{type:'research',item:'industry'});
  assert.ok(!offers(state).some(o=>o.item==='workshop'));
  while (!state.players[0].technologies.includes('industry')) state=cycle(state);
  assert.ok(offers(state).some(o=>o.item==='workshop' && o.enabled));
  state.players[0].science=2000;
  state=learn(state,'steam');
  assert.ok(!offers(state).some(o=>o.item==='shop' || o.item==='academy'));
  state=learn(state,'tactics');
  assert.ok(offers(state).some(o=>o.item==='walls' && o.enabled));
});

const buildings={
  shop:{tech:'civics',cost:12,capital:3},
  academy:{tech:'cartography',cost:22,science:2},
  grainMill:{tech:'agriculturalScience',cost:21,food:2,production:1},
  foundry:{tech:'metallurgy',cost:27,production:3},
  printingHouse:{tech:'electricity',cost:26,culture:3}
};
for (const [item,expected] of Object.entries(buildings)) {
  test(item+' becomes available on its branch and pays its quoted yield once per city',()=>{
    let state=opening();
    Object.assign(state.players[0],{science:2000,capital:1000});
    state=learn(state,expected.tech);
    if (item==='foundry') {
      const blocked=offers(state).find(o=>o.item===item);
      assert.match(blocked.reason,/workshop/i);
      assert.equal(blocked.buyEnabled,false);
      assert.deepEqual(getProjectSites(state,state.cities[0].id,item),[]);
      assert.throws(()=>cityOrder(state,item),/workshop/i);
      state=buy(state,'workshop');
    }
    const city=state.cities[0], option=offers(state).find(o=>o.item===item);
    assert.ok(option.enabled && option.buyEnabled);
    assert.equal(option.required,expected.cost);
    assert.equal(option.gold,3*expected.cost);
    const localBefore=getCityYield(state,city.id), empireBefore=getStats(state,0);
    const rivalBefore=getStats(state,1), foodBefore=getPopulationReport(state,city.id);
    const complete=buy(state,item);
    assert.equal(complete.players[0].capital,state.players[0].capital-option.gold);
    assert.equal(complete.cities[0].buildingSites[item],city.tile);
    assert.ok(!city.buildings.includes(item));
    assert.ok(complete.cities[0].buildings.includes(item));
    assert.deepEqual(getStats(complete,1),rivalBefore);
    const localAfter=getCityYield(complete,city.id), empireAfter=getStats(complete,0);
    for (const key of ['food','production','capital']) assert.equal(localAfter[key]-localBefore[key],expected[key]||0,key);
    for (const key of ['capital','science','culture']) assert.equal(empireAfter[key+'Income']-empireBefore[key+'Income'],expected[key]||0,key);
    assert.equal(getPopulationReport(complete,city.id).surplus-foodBefore.surplus,expected.food||0);
    assert.equal(offers(complete).find(o=>o.item===item).enabled,false);
    assert.throws(()=>buy(complete,item),/already has that building/);
    assert.deepEqual(getProductionOptions(campaignView(complete,1),city.id),[]);
    const restored=migrateGame(JSON.parse(JSON.stringify(complete)));
    const next=applyAction(restored,0,{type:'end'});
    for (const key of ['capital','science','culture']) assert.equal(next.players[0][key]-restored.players[0][key],empireAfter[key+'Income'],key);
  });
}

test('a newly built academy pays on the harvest following completion and retains paused production through reload',()=>{
  let state=opening();
  state.players[0].science=2000;
  state=learn(state,'cartography');
  const city=state.cities[0].id;
  state=cycle(cityOrder(state,'academy'));
  const progress=state.cities[0].queue.progress;
  assert.ok(progress>0 && progress<BUILDINGS.academy.required);
  const switchTo=(s,item)=>applyAction(s,0,{type:'switchProduction',city,item,expected:revisionOf(s.cities[0])});
  state=switchTo(state,'granary');
  state=migrateGame(JSON.parse(JSON.stringify(state)));
  const paused=offers(state).find(o=>o.item==='academy');
  assert.equal(paused.saved,progress);
  assert.equal(paused.gold,(BUILDINGS.academy.required-progress)*3);
  state=switchTo(state,'academy');
  assert.equal(state.cities[0].queue.progress,progress);
  while (!state.cities[0].buildings.includes('academy')) {
    const rate=getStats(state,0).scienceIncome, previous=state.players[0].science;
    state=cycle(state);
    assert.equal(state.players[0].science-previous,rate);
    assert.ok(state.round<20);
  }
  const bank=state.players[0].science, rate=getStats(state,0).scienceIncome;
  state=cycle(state);
  assert.equal(state.players[0].science-bank,rate);
});

test('an existing city can finish or resume historic workshop and wall investments without unlocking new commissions',()=>{
  for (const item of ['workshop','walls']) {
    const openingState=opening(), city=openingState.cities[0];
    openingState.players[0].capital=100;
    city.queue={item,required:BUILDINGS[item].required,progress:4};
    let state=applyAction(openingState,0,{type:'switchProduction',city:city.id,item:'granary',expected:0});
    state=migrateGame(JSON.parse(JSON.stringify(state)));
    const quote=offers(state).find(o=>o.item===item);
    assert.equal(quote.gold,(BUILDINGS[item].required-4)*3);
    state=buy(state,item);
    assert.ok(state.cities[0].buildings.includes(item));
    assert.ok(!state.players[0].technologies.includes(BUILDINGS[item].tech));
    assert.deepEqual(getProjectSites(opening(),city.id,item),[]);
  }
});
