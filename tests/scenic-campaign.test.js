import assert from 'node:assert/strict';
import test from 'node:test';
import {
  UNIT_TYPES, applyAction, campaignView, createGame, getMap, getProductionOptions,
  getProjectSites, getScenicWorkStatus
} from '../docs/rules.js';
import {restoreSolo} from '../docs/solo-saves.js';

test('a San Diego opening unlocks a scenic project through play and transfers it correctly on conquest', () => {
  const work = 'missionGorgeTrail';
  const players = [{name:'West', civilization:'republic'}, {name:'East', civilization:'pacific'}];
  let state = createGame(players, 'sd', {seed:9, mapSize:'large'});
  const pioneer = state.units.find(unit => unit.seat === 0 && unit.type === 'settler');
  state = applyAction(state, 0, {type:'found', unit:pioneer.id});
  const city = state.cities.find(town => town.seat === 0);
  const landmark = Object.keys(state.board).find(tile => state.board[tile].naturalWonder === 'missionGorge');
  const offer = () => getProductionOptions(campaignView(state, 0), city.id).find(option => option.item === work);
  const cycle = () => {
    state = applyAction(state, 0, {type:'end'});
    state = applyAction(state, 1, {type:'end'});
  };

  assert.equal(offer(), undefined);
  assert.equal(campaignView(state, 1).board[landmark].naturalWonder, undefined);
  state = applyAction(state, 0, {type:'research', item:'industry'});
  state = applyAction(state, 0, {type:'civic', item:'publicWorks'});
  for (let i = 0; i < 30 && !state.players[0].technologies.includes('industry'); i++) cycle();
  state = applyAction(state, 0, {type:'research', item:'mechanics'});
  for (let i = 0; i < 30 && !offer()?.enabled; i++) cycle();
  assert.ok(offer()?.enabled);
  const [site] = getProjectSites(campaignView(state, 0), city.id, work);
  assert.ok(getMap(state).neighbors(landmark).includes(site.id));
  state = applyAction(state, 0, {type:'produce', city:city.id, item:work, site:site.id});
  state = restoreSolo(JSON.parse(JSON.stringify(state)));
  assert.equal(state.cities[0].queue.site, site.id);
  const underConstruction = state;
  for (let i = 0; i < 30 && state.cities[0].queue; i++) cycle();
  assert.ok(state.cities[0].buildings.includes(work));

  // Replay a siege of the same city on either side of its completion turn.
  for (const [snapshot, expected] of [[underConstruction, 'open'], [state, 'complete']]) {
    const siege = structuredClone(snapshot);
    const map = getMap(siege);
    const approach = map.neighbors(city.tile).find(id => !['ocean','mountains'].includes(map.byId[id].terrain)
      && !siege.units.some(unit => unit.tile === id));
    siege.cities[0].hp = 1;
    const {maxHp, moves} = UNIT_TYPES.melee;
    siege.units.push({id:'invader', type:'melee', seat:1, tile:approach, hp:maxHp, maxHp, moves, maxMoves:moves});
    const conquered = applyAction(applyAction(siege, 0, {type:'end'}), 1, {type:'attack', unit:'invader', tile:city.tile});
    assert.equal(conquered.cities[0].seat, 1);
    assert.equal(conquered.cities[0].queue, null);
    assert.equal(getScenicWorkStatus(conquered, work), expected);
    assert.equal(conquered.board[landmark].naturalWonder, 'missionGorge');
    if (expected === 'complete') {
      assert.equal(conquered.cities[0].buildingSites[work], site.id);
      assert.equal(conquered.board[site.id].owner, 1);
    }
  }
});
