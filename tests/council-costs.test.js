import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,applyAction,chooseBotAction,campaignView,getResearchOptions,getCivicOptions,getStats,migrateGame,getCityYield,councilTree} from '../docs/rules.js';
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
  assert.equal(campaignView(state,1).researchPace,2);
});
test('new and pre-release saves charge their own quoted amount and accurately project research and culture',()=>{
  for(const pace of [undefined,1,2])for(const [kind,item,known,bank,options] of [
    ['research','steam','technologies','science',getResearchOptions],
    ['civic','conservation','civics','culture',getCivicOptions],
  ]){
    let s=fresh();s.researchPace=pace;
    s=applyAction(s,0,{type:'found',unit:s.units[0].id});
    const graph=councilTree(s,kind),player=s.players[0];
    function learnPrerequisites(id){
      for(const parent of graph[id].requires)if(!player[known].includes(parent)){
        learnPrerequisites(parent);player[known].push(parent);
      }
    }
    learnPrerequisites(item);player[bank]=2;
    const price=options(s,0).find(o=>o.item===item).cost;
    if(!pace)assert.equal(price,10);
    else if(pace===1)assert.equal(price,kind==='research'?44:29);
    else assert.ok(price>(kind==='research'?44:29));
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

test('both new catalogs have accessible entry choices and increasing prices at every prerequisite',()=>{
  const s=fresh();
  for(const getOptions of [getResearchOptions,getCivicOptions]) {
    const opts=getOptions(s,0),byId=new Map(opts.map(o=>[o.item,o]));
    assert(opts.filter(o=>o.enabled).length>=2);
    for(const era of ['frontier','industrial','modern']){
      const entries=opts.filter(o=>o.era===era);
      assert.ok(entries.some(o=>o.tier>=2));
      if(era!=='frontier')assert.ok(entries.some(o=>o.tier>=3));
      for(const project of entries){
        for(const parentId of project.requires){
          const parent=byId.get(parentId);assert(parent);
          assert(project.cost>parent.cost,project.item+' should cost more than '+parentId);
          if(parent.era===era)assert(project.tier>parent.tier);
        }
      }
    }
  }
});

test('a funded seat still needs every prerequisite and historical costs and projects survive reopening',()=>{
  for(const pace of [0,1,2]){
    let s=createGame(duo,'la',{seed:334,researchPace:pace});
    const p=s.players[0];p.science=999;p.culture=999;
    const hasNew=getCivicOptions(s,0).some(o=>o.item==='publicLibraries');
    assert.equal(hasNew,pace===2);
    if(pace<2){
      assert.throws(()=>applyAction(s,0,{type:'research',item:'mechanics'}));
      const older=councilTree(s,'research');assert.deepEqual(older.steam.requires,['industry']);
      s=applyAction(s,0,{type:'research',item:'industry'});
      s=applyAction(migrateGame(JSON.parse(JSON.stringify(s))),0,{type:'research',item:'steam'});
      assert.equal(s.players[0].science,999-10-(pace?44:10));continue;
    }
    const order=(type,item)=>({type,item});
    s=applyAction(s,0,order('research','industry'));
    assert.throws(()=>applyAction(s,0,order('research','steam')),/Applied Mechanics/);
    s=applyAction(s,0,order('research','mechanics'));
    s=applyAction(s,0,order('research','steam'));
    assert.throws(()=>applyAction(s,0,order('research','electricity')),/Metallurgy/);
    s=applyAction(s,0,order('civic','charter'));
    assert.throws(()=>applyAction(s,0,order('civic','federation')),/Land Registry/);
    s=applyAction(s,0,order('civic','landRegistry'));
    s=applyAction(migrateGame(JSON.parse(JSON.stringify(s))),0,order('civic','federation'));
    assert.throws(()=>applyAction(s,0,order('civic','publicLibraries')),/Teachers Colleges/);
  }
});

test('the new discoveries and civic institutions produce only their specified city benefits',()=>{
  let s=fresh();s=applyAction(s,0,{type:'found',unit:s.units[0].id});
  const [city]=s.cities,player=s.players[0];
  city.buildings.push('monument','workshop');city.population=5;
  const before=getCityYield(s,city.id),stats=getStats(s,0);
  player.technologies.push('mechanics','electricity');
  player.civics.push('landRegistry','publicLibraries','regionalPlanning');
  const after=getCityYield(s,city.id),withInstitutions=getStats(s,0);
  assert.equal(after.production-before.production,2);assert.equal(after.capital-before.capital,1);
  assert.equal(withInstitutions.scienceIncome-stats.scienceIncome,2);
  assert.equal(withInstitutions.cultureIncome-stats.cultureIncome,3);
  assert.equal(withInstitutions.capitalIncome-stats.capitalIncome,1);
  city.population=4;city.buildings=[];
  const without=getStats(s,0),yieldWithout=getCityYield(s,city.id);
  player.technologies=[];player.civics=['landRegistry'];
  assert.equal(getStats(s,0).scienceIncome,without.scienceIncome);
  assert.equal(getStats(s,0).cultureIncome,without.cultureIncome);
  assert.equal(getCityYield(s,city.id).production,yieldWithout.production);
});
