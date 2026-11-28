import assert from 'node:assert/strict';
import {test} from 'node:test';
import {
  applyAction, campaignView, canSkipUnit, createGame, getCivicOptions, getMap,
  getPendingTurnTasks, getResearchOptions, getUnitOptions, unitNeedsOrders
} from '../docs/rules.js';

const newGame = () => createGame(['West', 'East'], 'la', {seed:21895});
const tasks = (state, seat=0) => getPendingTurnTasks(state, seat);
const guardedEnd = {type:'end', requireReady:true};

test('opening settler takes priority, then actionable councils and each idle city precede units', () => {
  let state = newGame();
  const settler = state.units.find(unit => unit.seat === 0);
  assert.deepEqual(tasks(state), [{kind:'unit', id:settler.id, tile:settler.tile}]);
  assert.throws(() => applyAction(state,0,guardedEnd), /remaining turn decisions/);
  state = applyAction(state,0,{type:'found', unit:settler.id});
  const city = state.cities[0];
  const second = {...city, id:'second-city', tile:getMap(state).neighbors(city.tile).find(id=>state.board[id].owner===0)};
  state.cities.push(second);
  state.units.push({...settler, id:'scout', type:'scout'});
  assert.deepEqual(tasks(state), [
    {kind:'research'}, {kind:'civics'}, {kind:'production',id:city.id,tile:city.tile},
    {kind:'production',id:second.id,tile:second.tile}, {kind:'unit',id:'scout',tile:settler.tile}
  ]);
  assert.deepEqual(tasks(state), tasks(campaignView(state,0)));
  state = applyAction(state,0,{type:'research', item:getResearchOptions(state,0).find(o=>o.enabled).item});
  state = applyAction(state,0,{type:'civic', item:getCivicOptions(state,0).find(o=>o.enabled).item});
  for (const town of state.cities) state = applyAction(state,0,{type:'produce', city:town.id, item:'builder'});
  assert.deepEqual(tasks(state).map(t=>t.kind), ['unit']);
  state = applyAction(state,0,{type:'skipUnit', unit:'scout'});
  assert.deepEqual(tasks(state), []);
  assert.equal(applyAction(state,0,guardedEnd).turn,1);
});

test('skip survives reload, does not consume movement or district actions, and expires next round', () => {
  const opening = newGame(), settler = opening.units.find(u=>u.seat===0);
  const action = {type:'skipUnit', unit:settler.id};
  assert.ok(canSkipUnit(campaignView(opening,0),0,settler.id));
  const marked = applyAction(opening,0,action);
  assert.equal(marked.units.find(u=>u.id===settler.id).moves,settler.moves);
  assert.equal(marked.actionsLeft,opening.actionsLeft);
  assert.equal(opening.units.find(u=>u.id===settler.id).skippedRound,undefined);
  const restored = JSON.parse(JSON.stringify(marked));
  assert.deepEqual(applyAction(restored,0,action),restored);
  assert.deepEqual(tasks(restored),[]);
  const destination = getUnitOptions(restored,settler.id).moves[0];
  assert.equal(applyAction(restored,0,{type:'move',unit:settler.id,tile:destination}).units.find(u=>u.id===settler.id).tile,destination);
  const next = applyAction(applyAction(restored,0,guardedEnd),1,{type:'end'});
  assert.equal(next.round,2);
  assert.ok(tasks(next).some(t=>t.id===settler.id));
});

test('blocked, fortified, defeated, foreign and spent units are not reminders', () => {
  const state = newGame(), unit = state.units.find(u=>u.seat===0);
  unit.type='scout';
  const map = getMap(state);
  const neighbors=map.neighbors(unit.tile);
  for (const tile of neighbors) state.units.push({...unit,id:'blocker-'+tile,tile,moves:0});
  assert.deepEqual(tasks(state),[]);
  assert.ok(canSkipUnit(state,0,unit.id));
  state.units = state.units.filter(u=>!u.id.startsWith('blocker-'));
  unit.fortified=true;
  assert.deepEqual(tasks(state),[]);
  assert.equal(canSkipUnit(state,0,unit.id),false);
  delete unit.fortified;
  unit.hp=0;
  assert.deepEqual(tasks(state),[]);
  unit.hp=unit.maxHp;
  unit.moves=0;
  assert.deepEqual(tasks(state),[]);
  assert.throws(()=>applyAction(state,0,{type:'skipUnit',unit:unit.id}), /ready unit/);
  const rival=state.units.find(u=>u.seat===1);
  assert.equal(unitNeedsOrders(state,0,rival),false);
  assert.throws(()=>applyAction(state,0,{type:'skipUnit',unit:rival.id}), /ready unit/);
  assert.deepEqual(tasks(campaignView(state,1),0),[]);
});

test('completed trees, waiting players, finished games and older room capabilities produce safe controls', () => {
  const opening = newGame();
  const state = applyAction(opening,0,{type:'found',unit:opening.units.find(u=>u.seat===0).id});
  state.players[0].technologies = getResearchOptions(state,0).map(o=>o.item);
  state.players[0].civics = getCivicOptions(state,0).map(o=>o.item);
  assert.deepEqual(tasks(state).map(t=>t.kind),['production']);
  assert.deepEqual(tasks(state,1),[]);
  state.phase='finished';
  assert.deepEqual(tasks(state),[]);
  const old = campaignView(opening,0);
  delete old.intel.turnReadiness;
  assert.equal(canSkipUnit(old,0,opening.units[0].id),false);
  assert.equal(tasks(old).length,1);
  assert.equal(applyAction(opening,0,{type:'end'}).turn,1);
});

test('Ready teammates cannot skip or end again, and repeated skip does not advance team order keys', () => {
  const initial = createGame(['Oak','Reed','Pine'],'la',{seed:21895,teams:[0,0,1],simultaneousTeams:true});
  const unit = initial.units.find(u=>u.seat===1);
  const action = {type:'skipUnit', unit:unit.id};
  assert.ok(tasks(initial,1).length);
  const skipped = applyAction(initial,1,action);
  assert.deepEqual(applyAction(skipped,1,action),skipped);
  assert.ok(tasks(skipped,0).length);
  const ready = applyAction(skipped,1,guardedEnd);
  assert.deepEqual(tasks(ready,1),[]);
  assert.throws(()=>applyAction(ready,1,action), /your turn/);
  assert.throws(()=>applyAction(ready,1,guardedEnd), /your turn/);
});
