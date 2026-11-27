import assert from 'node:assert/strict';
import test from 'node:test';
import {applyAction,campaignView,createGame,getActions,getCityYield,getCitizenWorkforce,getDevelopmentPreview,getMap,getStats} from '../docs/rules.js';

function founded(region='la',mapSize='standard') {
  const state=createGame(['West','East'],region,{seed:417005,mapSize});
  return applyAction(state,0,{type:'found',unit:state.units[0].id});
}

function checkOrder(state,id) {
  const quote=getDevelopmentPreview(state,0,id);
  assert.ok(quote?.enabled);
  assert.deepEqual(getDevelopmentPreview(campaignView(state,0),0,id),quote);
  const before=getStats(state,0), player=state.players[0];
  const applied=applyAction(state,0,{type:'develop',tile:id});
  const after=getStats(applied,0), updated=applied.players[0];
  assert.equal(state.board[id].level,quote.currentLevel);
  assert.equal(applied.board[id].level,quote.nextLevel);
  assert.deepEqual(quote.cost,{capital:player.capital-updated.capital,influence:player.influence-updated.influence,orders:state.actionsLeft-applied.actionsLeft});
  assert.deepEqual(quote.delta,{capitalIncome:after.capitalIncome-before.capitalIncome,
    influenceIncome:after.influenceIncome-before.influenceIncome,score:after.score-before.score});
  assert.equal(after.scienceIncome,before.scienceIncome);
  assert.equal(after.cultureIncome,before.cultureIncome);
  const city=state.cities[0];
  assert.deepEqual(getCitizenWorkforce(state,city.id),getCitizenWorkforce(applied,city.id));
  assert.deepEqual(getCityYield(state,city.id),getCityYield(applied,city.id));
  return quote;
}

test('develop quotes match actual city, labor, treasury, order, income and score changes at every level',()=>{
  const state=founded('la','large'),map=getMap(state);
  const excluded=new Set([...state.barbarians.camps,...state.barbarians.parties].map(p=>p.tile));
  for(const terrain of ['urban','plains','coast','hills','forest','mountains']) {
    const tile=map.tiles.find(tile=>tile.terrain===terrain && !excluded.has(tile.id) && !state.board[tile.id].naturalWonder);
    state.board[tile.id].owner=0;
    for(const level of [0,1,2]) {
      state.board[tile.id].level=level;
      const quote=checkOrder(state,tile.id);
      assert.equal(quote.currentLevel,level);
      assert.equal(quote.nextLevel,level+1);
      assert.equal(quote.cost.capital,[5,8,11][level]);
      assert.equal(quote.cost.orders,1);
      assert.equal(quote.delta.score,1);
      const cash=['urban','coast','plains'].includes(terrain);
      assert.equal(quote.delta.capitalIncome,Number(cash));
      assert.equal(quote.delta.influenceIncome,Number(!cash));
    }
  }
  // The worked district and city center are actual positions in a founded game.
  checkOrder(state,state.cities[0].tile);
  const job=getCitizenWorkforce(state,state.cities[0].id).workedTiles.find(job=>!job.specialist);
  assert.ok(job);
  checkOrder(state,job.id);
});

test('net influence stays flat below the Port concessions floor and begins increasing at the crossover',()=>{
  const state=founded('la','large'),map=getMap(state);
  for(const cell of Object.values(state.board)) {cell.owner=null;cell.level=0;}
  const sites=map.tiles.filter(t=>t.terrain==='urban' && !state.board[t.id].naturalWonder).slice(0,6);
  const template=state.cities[0];
  state.cities=sites.map((tile,i)=>({...template,tile:tile.id,id:'town'+i}));
  for(const tile of sites) state.board[tile.id].owner=0;
  const hill=map.tiles.find(t=>t.terrain==='hills' && !state.board[t.id].naturalWonder &&
    !state.barbarians.camps.concat(state.barbarians.parties).some(p=>p.tile===t.id));
  state.board[hill.id].owner=0;
  state.players[0].policy='portDues';
  assert.equal(getStats(state,0).influenceIncome,0);
  assert.equal(checkOrder(state,hill.id).delta.influenceIncome,0);
  state.board[hill.id].level=2;
  assert.equal(getStats(state,0).influenceIncome,0);
  assert.equal(checkOrder(state,hill.id).delta.influenceIncome,1);
});

test('forecast per-turn returns are credited only on End Turn, apart from the up-front price',()=>{
  for(const mapSize of ['standard','large']) {
    const state=founded('sf',mapSize),map=getMap(state);
    const reserved=new Set([...state.barbarians.camps,...state.barbarians.parties].map(p=>p.tile));
    for(const terrain of ['urban','forest']) {
      const tile=map.tiles.find(t=>t.terrain===terrain && !reserved.has(t.id) && !state.board[t.id].naturalWonder);
      state.board[tile.id].owner=0;
      const quote=getDevelopmentPreview(campaignView(state,0),0,tile.id);
      const developed=applyAction(state,0,{type:'develop',tile:tile.id});
      const skip=applyAction(state,0,{type:'end'}), collect=applyAction(developed,0,{type:'end'});
      assert.equal(collect.players[0].capital-skip.players[0].capital,quote.delta.capitalIncome-quote.cost.capital);
      assert.equal(collect.players[0].influence-skip.players[0].influence,quote.delta.influenceIncome-quote.cost.influence);
      assert.equal(developed.players[0].score,skip.players[0].score+quote.delta.score);
    }
  }
});

test('quotes stay private, include temporary lockouts and disappear on ineligible sites',()=>{
  for(const region of ['la','sf','sd']) {
    const state=founded(region),map=getMap(state),home=state.cities[0].tile;
    const view=campaignView(state,0),rival=campaignView(state,1);
    assert.equal(getDevelopmentPreview(view,1,home),null);
    assert.equal(getDevelopmentPreview(rival,0,home),null);
    assert.equal(getDevelopmentPreview(rival,1,home),null);
    const hidden=map.tiles.find(t=>!view.intel.visible.includes(t.id)).id;
    const before=getDevelopmentPreview(view,0,home);
    assert.equal(getDevelopmentPreview(view,0,hidden),null);
    state.board[hidden]={...state.board[hidden],owner:1,level:2,resource:'iron'};
    state.players[1].capital+=500;
    assert.deepEqual(getDevelopmentPreview(campaignView(state,0),0,home),before);
    assert.equal(getDevelopmentPreview(campaignView(state,0),0,hidden),null);
    for(const patch of [{turn:1},{actionsLeft:0}]) {
      const locked={...state,...patch};
      const quote=getDevelopmentPreview(campaignView(locked,0),0,home);
      assert.equal(quote.enabled,false);
      assert.equal(quote.reason,getActions(locked,0,home)[0].reason);
      assert.deepEqual(quote.delta,before.delta);
    }
    state.players[0].capital=0;
    assert.equal(getDevelopmentPreview(campaignView(state,0),0,home).enabled,false);
    state.board[home].level=3;
    assert.equal(getDevelopmentPreview(state,0,home),null);
    state.board[home].level=1;state.board[home].naturalWonder='laBrea';
    assert.equal(getDevelopmentPreview(state,0,home),null);
  }
});
