import {createClassicGame} from './classic-game.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyAction, campaignView, getCityYield, getPortSite, getProductionOptions, getStats, TILE_BY_ID} from '../docs/rules.js';

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
  let state = nextSeat(createClassicGame(['Inland','Coast']),1);
  const city=state.cities[1], port=getPortSite(state,city.id);
  assert.equal(TILE_BY_ID[port].terrain,'ocean');
  assert.equal(getPortSite(state,state.cities[0].id),null);
  assert.ok(!getProductionOptions(state,city.id).some(o=>o.item==='shipyard'));
  assert.throws(()=>turn(state,{type:'produce',city:city.id,item:'shipyard'}),/available production/);
  state.players[1].technologies.push('steam');
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

test('production and purchase expose a port’s ships only after its own buildings finish', () => {
  let state=nextSeat(createClassicGame(['Inland','Coast']),1);
  const city=state.cities[1], seat=city.seat;
  state.players[seat].technologies.push('steam','metallurgy','radar');
  state.cities[0].buildings.push('harbor','shipyard');
  const fleet=['workboat','cutter','frigate','ironclad','destroyer'];
  function checkListed(expected) {
    for (const view of [state,campaignView(state,seat)]) {
      const options=getProductionOptions(view,city.id,{replace:true});
      assert.deepEqual(fleet.filter(item=>options.some(option=>option.item===item)),expected);
      assert.equal(options.some(option=>option.item==='shipyard'),state.cities[1].buildings.includes('harbor'));
    }
  }
  function rejectPurchase(item,reason) {
    assert.throws(()=>turn(state,{type:'buyProduction',city:city.id,item,
      gold:3,expected:state.cities[1].productionRevision||0}),reason);
  }
  checkListed([]);
  const otherCity=state.cities[0];
  const otherOwner=otherCity.seat;
  otherCity.seat=seat;
  checkListed([]);
  otherCity.seat=otherOwner;
  rejectPurchase('cutter',/harbor/);
  state=turn(state,{type:'produce',city:city.id,item:'harbor'});
  assert.ok(state.cities[1].queue.portTile);
  checkListed([]);
  state=nextSeat(finishQueue(state,city.id),seat);
  checkListed(['workboat','cutter']);
  rejectPurchase('frigate',/shipyard/);
  state=turn(state,{type:'produce',city:city.id,item:'shipyard'});
  checkListed(['workboat','cutter']);
  state=nextSeat(finishQueue(state,city.id),seat);
  checkListed(fleet);
});

test('an inland city needs a connected chain of owned land to its shoreline', () => {
  const state=createClassicGame(['Inland','Coast']), city=state.cities[0];
  assert.ok(!getProductionOptions(state,city.id).some(o=>o.item==='harbor'));
  city.tile='7,9';
  assert.equal(getPortSite(state,city.id),null);
  state.exploration[0]['4,9']=null;
  state.exploration[0]['5,9']=null;
  assert.match(getProductionOptions(state,city.id).find(o=>o.item==='harbor').reason,/shore/);
  state.board['5,9'].owner=0;
  assert.equal(getPortSite(state,city.id),null,'isolated shoreline should not grant a port');
  state.board['6,9'].owner=0;
  assert.equal(TILE_BY_ID[getPortSite(state,city.id)].terrain,'ocean');
});
