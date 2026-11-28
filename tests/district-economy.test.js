import assert from 'node:assert/strict';
import test from 'node:test';
import {applyAction,campaignView,chooseBotAction,createGame,getActions,getMap,getStats,migrateGame} from '../docs/rules.js';
import {createClassicGame} from './classic-game.js';
import {influencePanelModel,influencePanelHtml} from '../docs/influence-panel.js';

function founded(region='la') {
  const state=createGame(['West','East'],region,{seed:417005});
  return applyAction(state,0,{type:'found',unit:state.units[0].id});
}

test('owned parcels never offer paid upgrades, including older settled holdings',()=>{
  for(const region of ['la','sf','sd']) {
    const state=founded(region), home=state.cities[0].tile;
    for(const level of [0,1,2,3]) {
      state.board[home].level=level;
      const snapshot=structuredClone(state),view=campaignView(state,0);
      assert.deepEqual(getActions(state,0,home),[]);
      assert.deepEqual(getActions(view,0,home),[]);
      assert.ok(!view.intel.districtChoices.includes(home));
      assert.throws(()=>applyAction(state,0,{type:'develop',tile:home}),/unavailable/);
      assert.deepEqual(state,snapshot);
    }
  }
});

test('a selected neutral border tile still costs four gold and one order',()=>{
  for(const region of ['la','sf','sd']) {
    const state=founded(region),view=campaignView(state,0);
    const tile=view.intel.districtChoices.find(id=>view.board[id].owner===null);
    const [claim]=getActions(view,0,tile);
    assert.deepEqual(claim.cost,{capital:4,influence:0});
    const claimed=applyAction(state,0,{type:'claim',tile});
    assert.equal(claimed.board[tile].owner,0);
    assert.equal(claimed.players[0].capital,state.players[0].capital-4);
    assert.equal(claimed.players[0].influence,state.players[0].influence);
    assert.equal(claimed.actionsLeft,state.actionsLeft-1);
    assert.deepEqual(getActions(claimed,0,tile),[]);
  }
});

test('the influence panel and rules quote the same flat border price even on previously upgraded land',()=>{
  const state=founded(), frontier=campaignView(state,0).intel.districtChoices[0];
  state.board[frontier].owner=1;
  for(const level of [0,3]) {
    state.board[frontier].level=level;
    const view=campaignView(state,0);
    const model=influencePanelModel({state:view,seat:0},'en'), panelOffer=model.cards.find(c=>c.id==='contest').selected;
    assert.deepEqual(getActions(view,0,frontier)[0].cost,{capital:4,influence:5});
    assert.equal(panelOffer.cost,5);
    assert.equal(panelOffer.gold,4);
    assert.match(influencePanelHtml(model,'en'),/5 influence \+ 4 gold/);
    const contested=applyAction(state,0,panelOffer.action);
    assert.equal(contested.board[frontier].owner,0);
    assert.equal(contested.board[frontier].level,level);
    assert.equal(contested.players[0].influence,state.players[0].influence-5);
    assert.equal(contested.actionsLeft,state.actionsLeft-1);
  }
});

test('old district investments survive reload, keep their terrain income and pay it at harvest',()=>{
  const state=founded(),map=getMap(state);
  for(const [terrain,resource] of [['plains','capital'],['hills','influence']]) {
    const tile=map.tiles.find(t=>t.terrain===terrain && !state.cities.some(c=>c.tile===t.id)).id;
    const initial=structuredClone(state);
    Object.assign(initial.board[tile],{owner:0,level:0});
    const saved=structuredClone(initial);
    saved.board[tile].level=2;
    const resumed=migrateGame(JSON.parse(JSON.stringify(saved)));
    assert.equal(resumed.board[tile].level,2);
    const base=getStats(initial,0),later=getStats(resumed,0);
    assert.equal(later.score-base.score,2);
    assert.equal(later[resource+'Income']-base[resource+'Income'],2);
    const baseline=applyAction(initial,0,{type:'end'}),harvest=applyAction(resumed,0,{type:'end'});
    assert.equal(harvest.players[0][resource]-baseline.players[0][resource],2);
  }
});

test('easy claims neutral land and stops at a rival border while other governors may contest',()=>{
  const state=createClassicGame(['West','East']);
  state.units=[];
  Object.assign(state.players[0],{research:'industry',civic:'charter',policyRound:state.round,capital:30,influence:30});
  Object.assign(state.cities[0],{queue:{item:'granary',progress:0,required:10},focusRound:state.round});
  for(const level of ['easy','normal','hard']) {
    const decision=chooseBotAction(state,level);
    assert.equal(decision.type,'claim');
    assert.equal(state.board[decision.tile].owner,null);
    assert.doesNotThrow(()=>applyAction(state,0,decision));
  }
  for(const id of campaignView(state,0).intel.visible) if(state.board[id].owner===null) state.board[id].owner=1;
  assert.deepEqual(chooseBotAction(state,'easy'),{type:'end'});
  for(const level of ['normal','hard']) {
    const order=chooseBotAction(state,level);
    assert.equal(order.type,'contest');
    assert.doesNotThrow(()=>applyAction(state,0,order));
  }
});
