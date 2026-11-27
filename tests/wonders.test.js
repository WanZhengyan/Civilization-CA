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
    assert.equal(getProductionOptions(state,city.id).find(o=>o.item===item).enabled,false);
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
