import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,applyAction,getStats,getCityYield,campaignView} from '../docs/rules.js';
import {festivalOptions,proposeFestival} from '../docs/city-festivals.js';

function ready() {
  let s=createGame([{name:'West',civilization:'arroyo'}],'la',{seed:624101,mapSize:'large',practice:true});
  s.campaignVariety=1;
  s=applyAction(s,0,{type:'found',unit:s.units[0].id});
  s=applyAction(s,0,{type:'civic',item:'charter'});
  while(!s.players[0].civics.includes('charter') || s.cities[0].food<4 || s.cities[0].population<2) {
    s=applyAction(s,0,{type:'end'});assert.ok(s.round<15);
  }
  return s;
}

for(const [id,bonus] of [
  ['crafts',{production:3,culture:1}],['market',{capital:5,influence:1}],['heritage',{culture:2,influence:2}]
]) test(id+' runs for exactly three city harvests and needs three rest harvests',()=>{
  let s=ready();
  const c=s.cities[0],beforeStats=getStats(s,0),beforeYield=getCityYield(s,c.id);
  let next=applyAction(s,0,{type:'cityFestival',city:c.id,item:id});
  assert.equal(c.food-next.cities[0].food,4);
  assert.equal(s.players[0].capital-next.players[0].capital,8);
  assert.equal(getCityYield(next,c.id).production-beforeYield.production,bonus.production||0);
  for (const key of ['capital','influence','culture'])assert.equal(getStats(next,0)[key+'Income']-beforeStats[key+'Income'],bonus[key]||0);
  for(let remaining=3;remaining>0;remaining--) {
    assert.equal(next.cities[0].festivalHarvests,remaining);
    assert.throws(()=>applyAction(next,0,{type:'cityFestival',city:c.id,item:id}),/already underway/);
    const previous=next,rate=getStats(next,0);
    next=applyAction(next,0,{type:'end'});
    for(const key of ['capital','culture','influence']) assert.equal(next.players[0][key]-previous.players[0][key],rate[key+'Income']);
    next=JSON.parse(JSON.stringify(next));
  }
  assert.equal(next.cities[0].festival,undefined);
  for(let remaining=3;remaining>0;remaining--) {
    assert.equal(next.cities[0].festivalRecovery,remaining);
    assert.throws(()=>applyAction(next,0,{type:'cityFestival',city:c.id,item:id}),/preparations/);
    next=applyAction(next,0,{type:'end'});
  }
  assert.equal(festivalOptions(next,0,next.cities[0])[0].reason,'');
  assert.equal(applyAction(next,0,{type:'cityFestival',city:c.id,item:id}).cities[0].festivalHarvests,3);
});
test('food reserves, gold, the civic and the rules marker control access before any charge',()=>{
  const s=ready(),c=s.cities[0];s.players[0].capital=7;
  assert.throws(()=>applyAction(s,0,{type:'cityFestival',city:c.id,item:'heritage'}),/8 gold/);
  c.food=3;s.players[0].capital=100;
  assert.throws(()=>applyAction(s,0,{type:'cityFestival',city:c.id,item:'heritage'}),/4 food/);
  c.food=8;c.population=3;
  assert.ok(proposeFestival(s,0));
  delete s.campaignVariety;
  assert.deepEqual(festivalOptions(s,0,c),[]);assert.equal(proposeFestival(s,0),null);
  s.campaignVariety=1;s.players[0].civics=[];
  assert.deepEqual(festivalOptions(s,0,c),[]);
});
