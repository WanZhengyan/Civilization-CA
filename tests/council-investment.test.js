import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAction, campaignView, createGame, getStats,getCivicOptions,getCityYield,getProductionOptions} from '../docs/rules.js';
import {councilInvestments,investmentPanel} from '../docs/council-investment.js';
import {councilFestivalIncome,incomeHorizon} from '../docs/harvest-forecast.js';

test('a city investment quotes a legal parcel and the gain paid on the next harvest after opening',()=>{
  let state=createGame([{name:'Governor',civilization:'republic'}],'sf',{mapSize:'large',seed:624102,practice:true});
  const action=order=>{state=applyAction(state,0,order);};
  action({type:'found',unit:state.units[0].id});
  action({type:'research',item:'industry'});
  action({type:'civic',item:'charter'});
  for(let n=0;n<3;n++)action({type:'end'});
  const view=campaignView(state,0), all=councilInvestments(view,0);
  assert.deepEqual(councilInvestments(view,1),[]);
  const quote=all.find(q=>q.item==='stanford');
  assert.ok(quote);
  assert.ok(!all.some(q=>q.item==='workshop' || q.item==='caltech'));
  let control=state;
  const bank=state.players[0].science;
  action({type:'produce',item:quote.item,city:quote.city,site:quote.site});
  assert.equal(state.players[0].science,bank);
  for(let n=0;n<quote.turns;n++){
    control=applyAction(control,0,{type:'end'});
    action({type:'end'});
  }
  assert.ok(state.cities[0].buildings.includes(quote.item));
  assert.equal(getStats(state,0).scienceIncome,getStats(control,0).scienceIncome+quote.science);
  const nextIncome=getStats(state,0).scienceIncome, nextBank=state.players[0].science;
  action({type:'end'});
  assert.equal(state.players[0].science-nextBank,nextIncome);
});

test('the building cannot accelerate earlier income during construction',()=>{
  assert.equal(incomeHorizon(48,2),24);
  assert.equal(incomeHorizon(48,2,2,4),14);
  assert.equal(incomeHorizon(6,2,3,4),3);
  assert.equal(incomeHorizon(6,0),null);
  assert.equal(incomeHorizon(6,0,3,4),6);
  assert.equal(incomeHorizon(0,0),0);
});

test('expiring festival rates agree with campus opening, active orders and a full civic route',()=>{
  let state=createGame([{name:'Governor',civilization:'republic'}],'sf',{mapSize:'large',seed:624102,practice:true});
  const act=order=>{state=applyAction(state,0,order);};
  act({type:'found',unit:state.units[0].id});
  act({type:'research',item:'industry'});
  act({type:'civic',item:'charter'});
  while(!state.players[0].civics.includes('charter') || state.cities[0].population<3 || state.cities[0].food<4) {
    act({type:'end'});
    assert.ok(state.round<15);
  }
  const id=state.cities[0].id;
  act({type:'cityFestival',city:id,item:'crafts'});
  act({type:'end'});
  act({type:'end'});
  assert.equal(state.round,9);
  const start=state;
  const view=campaignView(start,0), active=councilFestivalIncome(view,0,'culture');
  assert.deepEqual(active,[{turns:1,amount:1}]);
  const options=getCivicOptions(view,0), funds=view.players[0].culture, rate=getStats(view,0).cultureIncome;
  const panel=investmentPanel(view,0,{options,balance:funds,resource:'culture',rate},'federation',true);
  assert.match(panel,/43 culture without a new building: 14 turns/);
  assert.match(panel,/UCLA[\s\S]*?\+4 → \+7 culture\/turn[\s\S]*?Build in 3 turns[\s\S]*?With construction: 8 turns/);
  const campus=councilInvestments(view,0).find(q=>q.item==='ucla');
  assert.equal(campus.turns,3);
  const oldStatic=Math.ceil(18/getCityYield(view,id).production);
  assert.equal(oldStatic,2);
  for(const build of [false,true]) {
    state=start;
    if(build)act({type:'produce',item:'ucla',city:id,site:campus.site});
    act({type:'civic',item:'landRegistry'});
    act({type:'end'});
    if(build) {
      const current=getProductionOptions(state,id,{replace:true}).find(o=>o.item==='ucla');
      assert.equal(current.turns,2);
    }
    act({type:'civic',item:'federation'});
    while(!state.players[0].civics.includes('federation')) {
      act({type:'end'});assert.ok(state.round<30);
      if(build && state.round-start.round===3)assert.ok(state.cities[0].buildings.includes('ucla'));
    }
    assert.equal(state.round-start.round,build?8:14);
  }
});

test('multiple city festivals end separately even when a building opens between their final harvests',()=>{
  const bonuses=[{amount:2,turns:1},{amount:1,turns:3}];
  // From seven today the four harvests earn 7, 5, 7 and 6.
  assert.equal(incomeHorizon(25,7,2,2,bonuses),4);
  assert.equal(incomeHorizon(26,7,2,2,bonuses),5);
});
