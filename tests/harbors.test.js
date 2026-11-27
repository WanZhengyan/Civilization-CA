import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyAction, createGame, getCityYield, getPortSite, getProductionOptions, getStats, TILE_BY_ID} from '../docs/rules.js';

function turn(state, action) { return applyAction(state,state.turn,action); }
function finishQueue(state, id) {
  for (let i=0; i<16 && state.cities.find(city=>city.id===id).queue; i++) state=turn(state,{type:'end'});
  assert.equal(state.cities.find(city=>city.id===id).queue,null);
  return state;
}
function nextSeat(state, seat) {
  while(state.turn!==seat) state=turn(state,{type:'end'});
  return state;
}

test('a coastal harbor reserves a water hex, adds tax income, and enables a production shipyard', () => {
  let state = nextSeat(createGame(['Inland','Coast']),1);
  const city=state.cities[1], port=getPortSite(state,city.id);
  assert.equal(TILE_BY_ID[port].terrain,'ocean');
  assert.equal(getPortSite(state,state.cities[0].id),null);
  assert.throws(()=>turn(state,{type:'produce',city:city.id,item:'shipyard'}),/harbor/);
  state=turn(state,{type:'produce',city:city.id,item:'harbor'});
  assert.equal(state.cities[1].queue.portTile,port);
  state=nextSeat(finishQueue(state,city.id),1);
  const before=structuredClone(state);
  before.cities[1].buildings=[];
  assert.equal(state.cities[1].portTile,port);
  assert.equal(getStats(state,1).capitalIncome-getStats(before,1).capitalIncome,2);
  assert.equal(getCityYield(state,city.id).capital-getCityYield(before,city.id).capital,2);
  state=turn(state,{type:'produce',city:city.id,item:'shipyard'});
  state=finishQueue(state,city.id);
  const yieldBefore=getCityYield(state,city.id).production;
  state.cities[1].buildings=state.cities[1].buildings.filter(key=>key!=='shipyard');
  assert.equal(yieldBefore-getCityYield(state,city.id).production,2);
});

test('an inland city needs a connected chain of owned land to its shoreline', () => {
  const state=createGame(['Inland','Coast']), city=state.cities[0];
  assert.match(getProductionOptions(state,city.id).find(o=>o.item==='harbor').reason,/shore/);
  city.tile='7,9';
  assert.equal(getPortSite(state,city.id),null);
  state.board['5,9'].owner=0;
  assert.equal(getPortSite(state,city.id),null,'isolated shoreline should not grant a port');
  state.board['6,9'].owner=0;
  assert.equal(TILE_BY_ID[getPortSite(state,city.id)].terrain,'ocean');
});
