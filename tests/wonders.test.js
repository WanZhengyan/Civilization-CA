import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WONDERS, universitiesUnlockedBy } from '../docs/wonders.js';
import { createGame, applyAction, getProductionOptions, getCityYield, getStats, getWonderSites, getMap, hexDistance } from '../docs/rules.js';

function fixture() {
  let state = createGame([{name:'West'},{name:'East'}], 'la', {seed:913});
  if (!state.cities.some(c=>c.seat===0)) {
    const settler=state.units.find(u=>u.seat===0 && u.type==='settler');
    state=applyAction(state,0,{type:'found',unit:settler.id});
  }
  // Give this scenario a small empty district around its host city, regardless of the opening seed.
  const city=state.cities.find(c=>c.seat===0);
  for(const tile of getMap(state).tiles){
    if(hexDistance(tile.id,city.tile)<=2 && !['ocean','mountains'].includes(tile.terrain))
      state.board[tile.id]={owner:0,level:0};
  }
  return state;
}
function nextOwnTurn(state) {
  const seat=state.turn;
  do {state=applyAction(state,state.turn,{type:'end'});} while(state.phase==='playing' && state.turn!==seat);
  return state;
}

test('university charters identify their exact research or civic and authorize production',()=>{
  const state=fixture(), city=state.cities.find(c=>c.seat===0);
  for (const [item,def] of Object.entries(WONDERS)) {
    const track=def.tech?'technologies':'civics',key=def.tech||def.civic;
    assert.ok(universitiesUnlockedBy(key).includes(def.name));
    assert.ok(!getProductionOptions(state,city.id).some(o=>o.item===item));
    assert.deepEqual(getWonderSites(state,city.id,item),[]);
    assert.throws(()=>applyAction(state,0,{type:'produce',city:city.id,item}));
    state.players[0][track]=[key];
    assert.equal(getProductionOptions(state,city.id).find(o=>o.item===item).enabled,true);
    state.players[0][track]=[];
  }
});

test('finished campuses increase the advertised incomes of the current owner',()=>{
  for (const [item,def] of Object.entries(WONDERS)) {
    let state=fixture();
    const city=state.cities[0];
    state.players[0][def.tech?'technologies':'civics']=[def.tech||def.civic];
    const site=getWonderSites(state,city.id,item)[0];
    state=applyAction(state,0,{type:'produce',city:city.id,item,site:site.id});
    for(let i=0;i<12 && state.cities[0].queue;i++)state=nextOwnTurn(state);
    assert.ok(state.cities[0].buildings.includes(item));
    const withCampus=getStats(state,0),withYield=getCityYield(state,city.id);
    state=structuredClone(state);state.cities[0].buildings=[];
    assert.equal(withCampus.scienceIncome-getStats(state,0).scienceIncome,def.science+Number(site.favored && def.specialty==='science'));
    assert.equal(withCampus.cultureIncome-getStats(state,0).cultureIncome,(def.culture||0)+Number(site.favored && def.specialty==='culture'));
    assert.equal(withYield.production-getCityYield(state,city.id).production,(def.production||0)+Number(site.favored && def.specialty==='production'));
  }
});

test('campus survey excludes deposits, improved or occupied sites and allows different choices',()=>{
  const state=fixture(),city=state.cities[0];
  state.players[0].civics=['charter'];
  const candidates=getWonderSites(state,city.id,'ucla');
  assert.ok(candidates.length>=3);
  const [a,b,c]=candidates;
  state.board[a.id]={...state.board[a.id],resource:'grain'};
  state.board[b.id]={...state.board[b.id],improvement:'farm'};
  assert.throws(()=>applyAction(state,0,{type:'produce',city:city.id,item:'ucla',site:a.id}),/site/);
  assert.ok(!getWonderSites(state,city.id,'ucla').some(s=>s.id===b.id||s.id===city.tile));
  const alternate=getWonderSites(state,city.id,'ucla').find(s=>s.id!==c.id);
  for(const site of [c,alternate]) {
    const ordered=applyAction(state,0,{type:'produce',city:city.id,item:'ucla',site:site.id});
    assert.equal(ordered.cities[0].queue.site,site.id);
    assert.equal(state.cities[0].queue,null);
  }
});

test('rivals race on distinct parcels; the loser recovers only the paid charter, once',()=>{
  let state=fixture();
  if(!state.cities.some(c=>c.seat===1)) {
    state=applyAction(state,0,{type:'end'});
    const pioneer=state.units.find(u=>u.seat===1&&u.type==='settler');
    state=applyAction(state,1,{type:'found',unit:pioneer.id});
    state=applyAction(state,1,{type:'end'});
  }
  for(const city of state.cities) {
    const terrain=getMap(state).tiles.find(t=>t.id!==city.tile&&hexDistance(t.id,city.tile)===1&&!['ocean','mountains'].includes(t.terrain));
    state.board[terrain.id]={owner:city.seat,level:0};
    state.players[city.seat].civics=['charter'];
    state.players[city.seat].capital=32;
  }
  function commission(state,seat) {
    const city=state.cities.find(c=>c.seat===seat),site=getWonderSites(state,city.id,'ucla')[0];
    return applyAction(state,seat,{type:'produce',item:'ucla',city:city.id,site:site.id});
  }
  const unaffordable=structuredClone(state);unaffordable.players[0].capital=0;
  assert.throws(()=>commission(unaffordable,0),/capital/);
  state=commission(state,0);
  assert.equal(state.players[0].capital,32-WONDERS.ucla.grant);
  assert.deepEqual(state.wonderRegistry,{ucla:'commissioned'});
  state=applyAction(state,0,{type:'end'});
  state=commission(state,1);
  state=applyAction(state,1,{type:'end'});
  const a=state.cities.find(c=>c.seat===0),b=state.cities.find(c=>c.seat===1);
  const lostSite=b.queue.site,purse=state.players[1].capital;
  a.queue.progress=a.queue.required-1;
  state=applyAction(state,0,{type:'end'});
  assert.deepEqual(state.wonderRegistry,{ucla:'complete'});
  assert.equal(state.cities.find(c=>c.id===b.id).queue,null);
  assert.equal(state.board[lostSite].wonder,undefined);
  assert.equal(state.players[1].capital,purse+WONDERS.ucla.grant);
  assert.equal(state.cities.filter(c=>c.buildings.includes('ucla')).length,1);
  assert.match(getProductionOptions(state,b.id).find(o=>o.item==='ucla').reason,/already opened/);
  assert.equal(state.log.filter(e=>e.type==='wonder-refund').length,1);
});

test('the California regional atlas starts with no university wonder in any geographic district',()=>{
  for(const mapId of ['la','sf','sd']){
    const state=createGame([{name:'North'},{name:'South'}],mapId,{seed:190});
    const campusIds=Object.keys(WONDERS);
    assert.ok(getMap(state).tiles.every(t=>!campusIds.includes(t.landmark) && t.landmark!=='campanile'));
    assert.ok(Object.values(state.board).every(t=>!t.wonder));
  }
});

test('survey choices vary across random starts in all three regions with their actual deposits', () => {
  for (const mapId of ['la', 'sf', 'sd']) {
    const locations = new Set();
    const parcels = new Set();
    let viableOpenings = 0;
    for (const seed of [0, 1, 9, 13, 51, 240, 837, 999]) {
      let state = createGame([{name:'North'}, {name:'South'}], mapId, {seed});
      const pioneer = state.units.find(u => u.seat === 0 && u.type === 'settler');
      state = applyAction(state, 0, {type:'found', unit:pioneer.id});
      const city = state.cities.find(c => c.seat === 0);
      locations.add(city.tile);
      state.players[0].civics=['charter'];
      const sites = getWonderSites(state, city.id, 'ucla');
      if (sites.length) viableOpenings++;
      for (const site of sites) {
        assert.equal(state.board[site.id].owner, 0);
        assert.ok(!state.board[site.id].resource);
        parcels.add(site.id);
      }
    }
    assert.ok(locations.size > 1 && parcels.size > 4, mapId);
    assert.ok(viableOpenings >= 6, mapId);
  }
});
