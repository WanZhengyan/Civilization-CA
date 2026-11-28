import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,applyAction,chooseBotAction,campaignView,getResearchOptions,getCivicOptions,getStats,migrateGame} from '../docs/rules.js';
const duo=['Angelenos','Pioneers'];
const fresh=()=>createGame(duo,'la',{seed:624101,mapSize:'large'});
test('both councils quote the actual cost: the opening is unchanged and later branches accumulate premiums',()=>{
  const state=fresh();
  const cost=(list,id)=>list.find(o=>o.item===id).cost;
  const tech=getResearchOptions(state,0),civic=getCivicOptions(state,0);
  assert.equal(cost(tech,'industry'),10);assert.equal(cost(civic,'charter'),7);
  assert(cost(tech,'steam')>cost(tech,'industry')*2);
  assert(cost(tech,'motorization')>cost(tech,'radio'));
  assert(cost(tech,'rocketry')>cost(tech,'motorization'));
  assert(cost(civic,'publicRadio')>cost(civic,'conservation')*1.5);
  assert.equal(campaignView(state,1).researchPace,1);
});
test('new and pre-release saves charge their own quoted amount and accurately project research and culture',()=>{
  for(const modern of [true,false])for(const [kind,item,prereqs,known,bank,options] of [
    ['research','steam',['industry'],'technologies','science',getResearchOptions],
    ['civic','conservation',['charter'],'civics','culture',getCivicOptions],
  ]){
    let s=fresh();if(!modern)delete s.researchPace;
    s=applyAction(s,0,{type:'found',unit:s.units[0].id});
    const player=s.players[0];player[known]=prereqs;player[bank]=2;
    const price=options(s,0).find(o=>o.item===item).cost;
    assert(modern ? price>10 : price===10);
    s=applyAction(s,0,{type:kind,item});
    s=migrateGame(JSON.parse(JSON.stringify(s)));
    const forecast=options(campaignView(s,0),0).find(o=>o.item===item),income=getStats(s,0)[bank+'Income'];
    assert.equal(forecast.cost,price);assert.equal(forecast.remaining,price-2);
    assert.equal(forecast.turns,Math.ceil((price-2)/income));
    s.players[0][bank]=price-income;
    s=applyAction(s,0,{type:'end'});
    assert(s.players[0][known].includes(item));assert.equal(s.players[0][bank],0);
  }
});


test('a governor can bank a deployment-blocked formation to start a scientific launch',()=>{
  let s=fresh();s=applyAction(s,0,{type:'found',unit:s.units[0].id});
  const p=s.players[0];p.technologies.push('rocketry');p.research='industry';p.civic='charter';
  const city=s.cities[0];city.productionRevision=5;city.queue={item:'melee',progress:10,required:10};
  const order=chooseBotAction(s,'easy');
  assert.deepEqual(order,{type:'switchProduction',city:city.id,item:'orbitalSurvey',expected:5});
  s=applyAction(s,0,order);
  assert.equal(s.cities[0].queue.item,'orbitalSurvey');
  assert.equal(s.cities[0].parkedProduction.melee,10);
});
