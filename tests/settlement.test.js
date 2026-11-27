import assert from "node:assert/strict";
import {test} from "node:test";
import {applyAction, createGame, getSettlementAssessment, getUnitOptions} from "../docs/rules.js";

function opening() {
  const state = createGame();
  const settler = state.units.find(unit => unit.seat === 0 && unit.type === "settler");
  return {state, settler};
}

test("all opening survey results agree with the real move and found orders", () => {
  const {state, settler} = opening();
  const original = JSON.stringify(state);
  const destinations = getUnitOptions(state, settler.id).moves;
  assert.equal(destinations.length, 14);
  const delayed = [];
  for (const tile of destinations) {
    const survey = getSettlementAssessment(state, settler.id, tile);
    const moved = applyAction(state, 0, {type:"move", unit:settler.id, tile});
    const remaining = moved.units.find(unit => unit.id === settler.id).moves;
    assert.equal(survey.reachable, true);
    assert.equal(survey.moveCost, settler.moves - remaining);
    assert.equal(survey.movesAfter, remaining);
    assert.equal(survey.canFoundThisTurn, getUnitOptions(moved, settler.id).canFound);
    let refreshed = applyAction(moved, 0, {type:"end"});
    while (refreshed.turn !== 0) refreshed = applyAction(refreshed, refreshed.turn, {type:"end"});
    const canFoundAfterRest = getUnitOptions(refreshed, settler.id).canFound;
    assert.equal(survey.canFoundNextTurn, !survey.canFoundThisTurn && canFoundAfterRest);
    if (survey.status === "next-turn") delayed.push(tile);
  }
  assert.deepEqual(delayed.sort(), ["8,7", "9,5", "9,6", "9,8", "9,9"]);
  assert.equal(JSON.stringify(state), original);
});

test("founding now includes the current tile and a move that leaves one point", () => {
  const {state, settler} = opening();
  settler.tile = "8,7";
  for (const [tile, cost] of [["8,7", 0], ["7,7", 1]]) {
    const survey = getSettlementAssessment(state, settler.id, tile);
    assert.equal(survey.status, "now");
    assert.equal(survey.canFoundThisTurn, true);
    assert.equal(survey.moveCost, cost);
    const ready = cost ? applyAction(state, 0, {type:"move", unit:settler.id, tile}) : state;
    const settled = applyAction(ready, 0, {type:"found", unit:settler.id});
    assert.ok(settled.cities.some(city => city.tile === tile && city.seat === 0));
  }
  settler.moves = 0;
  assert.equal(getSettlementAssessment(state, settler.id, settler.tile).status, "next-turn");
});

test("survey names the nearest city and explains its exclusion radius", () => {
  const {state, settler} = opening();
  const survey = getSettlementAssessment(state, settler.id, settler.tile);
  assert.equal(survey.status, "invalid");
  assert.equal(survey.nearestCity.name, "Downtown LA");
  assert.equal(survey.distanceToNearestCity, 1);
  assert.match(survey.reason, /Downtown LA is 1 hex away/);
  assert.match(survey.reason, /3 hexes/);
  assert.equal(getSettlementAssessment(state, settler.id, "11,7").nearestCity.distance, 0);
});

test("terrain, hostile ownership and occupied sites have concrete reasons", () => {
  const {state, settler} = opening();
  for (const [tile, reason] of [["2,3", /mountain/i], ["0,12", /open water/i]]) {
    const survey = getSettlementAssessment(state, settler.id, tile);
    assert.equal(survey.status, "invalid");
    assert.equal(survey.reachable, false);
    assert.equal(survey.terrainCost, null);
    assert.match(survey.reason, reason);
  }
  const site = "8,7";
  state.board[site] = {...state.board[site], owner:1};
  const rival = getSettlementAssessment(state, settler.id, site);
  assert.equal(rival.reachable, true);
  assert.equal(rival.status, "invalid");
  assert.match(rival.reason, /Pacific Union owns/);

  state.board[site] = {...state.board[site], owner:null};
  const militia = state.units.find(unit => unit.seat === 0 && unit.type === "melee");
  militia.tile = site;
  const blocked = getSettlementAssessment(state, settler.id, site);
  assert.equal(blocked.status, "invalid");
  assert.equal(blocked.moveCost, null);
  assert.match(blocked.reason, /unit occupies/);
});
