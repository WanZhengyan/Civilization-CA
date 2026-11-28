import assert from 'node:assert/strict';
import {test} from 'node:test';
import {applyAction, campaignView, createGame, getInfluenceIncomeSources, getStats} from '../docs/rules.js';

const sum = sources => Object.values(sources).reduce((total, value) => total + value, 0);

test('the influence sources shown to a player account for the end-turn deposit', () => {
  let game = createGame([{name:'Player'}, {name:'Neighbor'}], 'la', {seed:17});
  assert.equal(sum(getInfluenceIncomeSources(game, 0)), 0);
  game = applyAction(game, 0, {type:'found', unit:game.units.find(unit => unit.seat === 0).id});
  const city = game.cities[0];
  city.buildings.push('monument');
  city.charter = 'merchants';
  city.festival = 'heritage';
  city.festivalHarvests = 1;
  city.atlasCopies = 2;
  game.players[0].policy = 'portDues';
  const quote = getInfluenceIncomeSources(campaignView(game, 0), 0);
  assert.deepEqual(quote, getInfluenceIncomeSources(game, 0));
  assert.equal(quote.settlement, 2);
  assert.equal(quote.monuments, 3);
  assert.equal(quote.charters, 1);
  assert.equal(quote.festivals, 2);
  assert.equal(quote.atlases, 2);
  assert.equal(quote.portDues, -1);
  assert.equal(sum(quote), getStats(game,0).influenceIncome);
  const next = applyAction(game, 0, {type:'end'});
  assert.equal(next.players[0].influence - game.players[0].influence, sum(quote));
  assert.equal(getInfluenceIncomeSources(next, 0).festivals, 0);
});
