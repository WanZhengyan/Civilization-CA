// Exercise the exported rules without browser or network dependencies.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { FACTIONS, applyAction, chooseBotAction, createGame } from "../docs/rules.js";

function run(mapId, seats, opening) {
  let state = createGame(FACTIONS.slice(0, seats).map(() => ({bot: true})), mapId, {seed:417003 + seats});
  const hash = createHash("sha256");
  const counts = {moves: 0, attacks: 0, captures: 0, citiesFounded: 0, unitsTrained: 0,
    buildingsCompleted: 0, improvements: 0, technologies: 0, civics: 0, shipsLaunched: 0, fisheries: 0};
  let orders = 0;
  while (state.phase === "playing") {
    // These fixed openings let a production change be compared across versions.
    const action = opening === "workshop-first" && orders === 0
      ? {type: "produce", city: state.cities.find(c => c.seat === 0).id, item: "workshop"}
      : chooseBotAction(state);
    const next = applyAction(state, state.turn, action);
    orders++;
    assert.ok(orders <= 10000, "A campaign failed to terminate within the playtest budget.");
    hash.update(JSON.stringify(action) + "\n");

    if (action.type === "move") counts.moves++;
    if (action.type === "improve") counts.improvements++;
    if (action.type === "found") counts.citiesFounded++;
    if (action.type === "attack") {
      counts.attacks++;
      const target = state.cities.find(c => c.tile === action.tile);
      if (target && next.cities.find(c => c.id === target.id).seat !== target.seat) counts.captures++;
    }
    if (action.type === "end") {
      for (const city of state.cities) {
        if (!city.queue) continue;
        const updated = next.cities.find(c => c.id === city.id);
        if (updated.queue) continue;
        if (updated.buildings.length > city.buildings.length) counts.buildingsCompleted++;
        else counts.unitsTrained++;
      }
    }
    // Includes discoveries paid instantly from a previously accumulated science bank.
    const seat = state.turn;
    counts.technologies += (next.players[seat].technologies?.length ?? 0) - (state.players[seat].technologies?.length ?? 0);
    counts.civics += next.players[seat].civics.length - state.players[seat].civics.length;
    if (action.type === "improve" && action.item === "fishery") counts.fisheries++;
    if (action.type === "end") {
      counts.shipsLaunched += next.units.filter(unit => ["cutter","workboat","frigate"].includes(unit.type)
        && !state.units.some(old => old.id === unit.id)).length;
    }
    state = next;
  }
  assert.ok(state.winners.length, "A finished campaign must have a winner.");
  hash.update(JSON.stringify(state));
  return {mapId, seats, opening, rounds: state.round, ...counts, victory: state.victoryReason,
    winners: state.winners.map(seat => FACTIONS[state.players[seat].faction].name),
    replayHash: hash.digest("hex")};
}

const results = [];
for (const mapId of ["la", "sf", "sd"]) {
  for (const seats of [2, 3, 4]) {
    for (const opening of ["standard", "workshop-first"]) {
      const first = run(mapId, seats, opening);
      assert.deepEqual(run(mapId, seats, opening), first, `Replay diverged for ${mapId}, ${seats} seats, ${opening}.`);
      results.push(first);
    }
  }
}
console.log(JSON.stringify({suite: "California campaign playtest", repeatedRuns: 2, deterministic: true, results}, null, 2));
