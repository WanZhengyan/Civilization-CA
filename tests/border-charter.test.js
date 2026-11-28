import assert from 'node:assert/strict';
import {test} from 'node:test';
import {applyAction, campaignView, createGame, getBorderCharter, getCityExpansion, getMap} from '../docs/rules.js';
import {translate} from '../docs/i18n.js';

function opening() {
  const state = createGame(['West', 'East'], 'la', {seed:21895});
  return applyAction(state, 0, {type:'found', unit:state.units.find(u=>u.seat===0).id});
}

function charter(state, city = state.cities[0]) {
  return {type:'charterBorder', city:city.id, tile:getCityExpansion(state, city.id).tile};
}

test('the founding balance buys its quoted parcel now, preserving its deposit and the district order budget', () => {
  const state = opening(), city = state.cities[0], order = charter(state);
  city.borderProgress = 3;
  state.board[order.tile].resource = 'grain';
  assert.equal(state.players[0].influence, 6);
  assert.deepEqual(getBorderCharter(state,0,city.id), {
    enabled:true, cost:6, reason:'', tile:order.tile, progress:3, required:8, turns:5
  });
  assert.deepEqual(getBorderCharter(campaignView(state,0),0,city.id), getBorderCharter(state,0,city.id));
  const next = applyAction(state,0,order);
  assert.equal(next.board[order.tile].owner,0);
  assert.equal(next.board[order.tile].resource,'grain');
  assert.equal(next.players[0].influence,0);
  assert.equal(next.players[0].capital,state.players[0].capital);
  assert.equal(next.actionsLeft,state.actionsLeft);
  assert.equal(next.cities[0].borderProgress,0);
  assert.equal(getCityExpansion(next,city.id).required,10);
  assert.equal(state.board[order.tile].owner,null);
  assert.equal(state.players[0].influence,6);
  const event=campaignView(next,0).log.find(e=>e.type==='charterBorder');
  assert.equal(event.tile,order.tile);
  assert.match(translate(event.text,'zh-CN'),/6 点影响力/);
  assert.ok(!campaignView(next,1).log.some(e=>e.type==='charterBorder'));
  assert.equal(applyAction(next,0,{type:'end'}).cities[0].borderProgress,1);
});

test('old saves can charter; once-per-city limits survive save/reload and reset next round', () => {
  const state = JSON.parse(JSON.stringify(opening())), city = state.cities[0];
  assert.equal(city.borderCharterRound,undefined);
  state.players[0].influence = 24;
  let next = JSON.parse(JSON.stringify(applyAction(state,0,charter(state))));
  assert.throws(()=>applyAction(next,0,charter(next)),/already expanded/);
  assert.equal(next.players[0].influence,18);
  next = applyAction(applyAction(next,0,{type:'end'}),1,{type:'end'});
  assert.ok(getBorderCharter(next,0,city.id).enabled);
  assert.equal(applyAction(next,0,charter(next)).cities[0].borderClaims,2);
});

test('bad targets, hidden frontiers and insufficient funds never charge or alter the world', () => {
  const state=opening(), city=state.cities[0], order=charter(state);
  const before=JSON.stringify(state);
  for (const tile of [undefined,city.tile,'999,999']) {
    assert.throws(()=>applyAction(state,0,{...order,tile}),/district changed/);
  }
  assert.throws(()=>applyAction(state,0,{...order,city:'missing'}),/one of your cities/);
  assert.throws(()=>applyAction(state,1,order),/your turn/);
  assert.equal(JSON.stringify(state),before);
  const rivalView=campaignView(state,1);
  assert.equal(getBorderCharter(rivalView,1,city.id).tile,null);
  const oldView=campaignView(state,0);
  delete oldView.intel.borderCharters;
  assert.match(getBorderCharter(oldView,0,city.id).reason,/room does not support/);
  state.players[0].influence=5;
  assert.throws(()=>applyAction(state,0,order),/6 influence/);
  assert.equal(state.players[0].influence,5);
  state.players[0].influence=6;
  state.board[order.tile]={...state.board[order.tile],owner:1};
  assert.throws(()=>applyAction(state,0,order),/district changed/);
  for (const tile of getMap(state).neighbors(city.tile)) state.board[tile]={...state.board[tile],owner:1};
  assert.throws(()=>applyAction(state,0,order),/No visible neutral/);
  assert.equal(state.players[0].influence,6);
});

test('an active teammate can charter its own city on the shared turn; ownership and Ready are respected', () => {
  let state=createGame(['Oak','Palm','Cedar'],'sf',{seed:21895,teams:[0,0,1],simultaneousTeams:true});
  for(const seat of [0,1]) state=applyAction(state,seat,{type:'found',unit:state.units.find(u=>u.seat===seat).id});
  const city=state.cities.find(c=>c.seat===1), order=charter(state,city);
  assert.equal(getBorderCharter(campaignView(state,1),1,city.id).enabled,true);
  assert.throws(()=>applyAction(state,0,order),/one of your cities/);
  state=applyAction(state,1,order);
  assert.equal(state.board[order.tile].owner,1);
  assert.equal(state.players[0].influence,6);
  assert.equal(state.players[1].influence,0);
  state=applyAction(state,1,{type:'end'});
  assert.match(getBorderCharter(campaignView(state,1),1,city.id).reason,/your turn/);
});
