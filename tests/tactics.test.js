import {createClassicGame} from './classic-game.js';
import assert from "node:assert/strict";
import { test } from "node:test";
import * as rules from "../docs/rules.js";

const game = () => createClassicGame([{name:"West"},{name:"East"}]);
const order = (state, action) => rules.applyAction(state,state.turn,action);
const unitBy = (state, type, seat=0) => state.units.find(u=>u.type===type && u.seat===seat);
const findUnit = (state,id) => state.units.find(u=>u.id===id);
const findCity = (state,id) => state.cities.find(c=>c.id===id);
const advance = state => order(state,{type:"end"});
function nextRound(state) {
  const round=state.round;
  while (state.phase==="playing" && state.round===round) state=advance(state);
  return state;
}

function combatant(state, id, seat, type, tile, hp=100) {
  const template=unitBy(state,"melee",seat);
  return {...template, id, seat, type, tile, hp, maxHp:100, moves:2, maxMoves:2, charges:0};
}

test("legal destinations have connected traversable paths and spend the unit's own movement", () => {
  const state=game(), unit=unitBy(state,"melee");
  const options=rules.getUnitOptions(state,unit.id);
  assert.ok(options.moves.length>0);
  const original=JSON.stringify(state);
  for (const dst of options.moves) {
    const path=rules.getMovePath(state,unit.id,dst);
    assert.equal(path[0],unit.tile);
    assert.equal(path.at(-1),dst);
    for (let i=1; i<path.length; ++i) {
      assert.ok(rules.neighbors(path[i-1]).includes(path[i]),"Nonadjacent path segment");
      assert.ok(!["ocean","mountains"].includes(rules.TILE_BY_ID[path[i]].terrain));
      assert.ok(!state.units.some(u=>u.tile===path[i] && u.id!==unit.id));
    }
    const next=order(state,{type:"move",unit:unit.id,tile:dst});
    assert.equal(findUnit(next,unit.id).tile,dst);
    assert.ok(findUnit(next,unit.id).moves<unit.moves);
    assert.deepEqual(next.units.filter(u=>u.id!==unit.id), state.units.filter(u=>u.id!==unit.id));
  }
  assert.equal(JSON.stringify(state),original);
  const sea=rules.TILES.find(t=>t.terrain==="ocean").id;
  assert.throws(()=>order(state,{type:"move",unit:unit.id,tile:sea}));
  const exhausted=structuredClone(state);
  findUnit(exhausted,unit.id).moves=0;
  assert.throws(()=>order(exhausted,{type:"move",unit:unit.id,tile:options.moves[0]}));
  const refreshed=nextRound(exhausted);
  assert.equal(findUnit(refreshed,unit.id).moves,findUnit(refreshed,unit.id).maxMoves);
});

test("the settler's legal site consumes the unit and places an owned city on that hex", () => {
  const state=game(), settler=unitBy(state,"settler");
  assert.ok(settler);
  const occupiedByOther=t=>state.units.some(u=>u.id!==settler.id && u.tile===t);
  const existingCity=state.cities.find(c=>c.seat===0);
  assert.ok(existingCity);
  settler.tile=existingCity.tile;
  assert.equal(rules.getUnitOptions(state,settler.id).canFound,false);
  assert.throws(()=>order(state,{type:"found",unit:settler.id}));
  for (const tile of rules.TILES) {
    if (occupiedByOther(tile.id)) continue;
    settler.tile=tile.id;
    if (rules.getUnitOptions(state,settler.id).canFound) break;
  }
  assert.equal(rules.getUnitOptions(state,settler.id).canFound,true);
  const next=order(state,{type:"found",unit:settler.id});
  assert.equal(next.cities.length,state.cities.length+1);
  assert.equal(findUnit(next,settler.id),undefined);
  assert.equal(next.cities.find(c=>c.tile===settler.tile)?.seat,0);
  assert.equal(next.board[settler.tile].owner,0);
});

test("city spending accumulates across rounds, completes a building, then trains a unit", () => {
  let state=game();
  const city=state.cities.find(c=>c.seat===0);
  assert.ok(rules.getCityYield(state,city.id).production>0);
  state=order(state,{type:"research",item:"industry"});
  while (!state.players[0].technologies.includes("industry")) state=nextRound(state);
  const build=rules.getProductionOptions(state,city.id).find(p=>p.item==="workshop");
  assert.ok(build?.enabled);
  state=order(state,{type:"produce",city:city.id,item:build.item});
  assert.equal(findCity(state,city.id).queue.item,"workshop");
  assert.ok(!findCity(state,city.id).buildings.includes("workshop"));
  const baseline=rules.getCityYield(state,city.id).production;
  for(let i=0;i<build.turns+2 && !findCity(state,city.id).buildings.includes("workshop");i++) state=nextRound(state);
  assert.ok(findCity(state,city.id).buildings.includes("workshop"));
  assert.ok(rules.getCityYield(state,city.id).production>baseline);
  assert.throws(()=>order(state,{type:"produce",city:city.id,item:"workshop"}));
  const existingIds=new Set(state.units.map(u=>u.id));
  const training=rules.getProductionOptions(state,city.id).find(p=>p.item==="ranged");
  assert.ok(training?.enabled);
  state=order(state,{type:"produce",city:city.id,item:training.item});
  for(let i=0;i<training.turns+2 && !state.units.some(u=>!existingIds.has(u.id));i++) state=nextRound(state);
  const trained=state.units.find(u=>!existingIds.has(u.id));
  assert.equal(trained?.type,"ranged");
  assert.equal(trained.seat,0);
  assert.equal(new Set(state.units.map(u=>u.tile)).size,state.units.length);
});

test("builder improvements consume charges and can only be placed on eligible territory", () => {
  const state=game();
  const unit=unitBy(state,"builder") || combatant(state,"qa-builder",0,"builder","11,8");
  state.units=[unit];
  unit.charges=2;
  const validOwned=rules.TILES.filter(t=>state.board[t.id].owner===0 && !state.cities.some(c=>c.tile===t.id) && !state.units.some(u=>u.tile===t.id && u.id!==unit.id));
  let item;
  for(const tile of validOwned) {
    unit.tile=tile.id;
    [item]=rules.getUnitOptions(state,unit.id).improvements;
    if(item) break;
  }
  assert.ok(item,"a builder in the opening territory should have an eligible tile");
  const after=order(state,{type:"improve",unit:unit.id,item});
  assert.equal(after.board[unit.tile].improvement,item);
  assert.equal(findUnit(after,unit.id)?.charges,1);
  const foreign=state.cities.find(c=>c.seat===1);
  unit.tile=foreign.tile;
  assert.throws(()=>order(state,{type:"improve",unit:unit.id,item}));
});

test("melee and ranged attacks enforce range and resolve damage, retaliation and casualty", () => {
  const state=game(), attacker=combatant(state,"qa-a",0,"ranged","11,6"), target=combatant(state,"qa-d",1,"melee","13,6");
  state.units=[attacker,target];
  assert.ok(!rules.neighbors(attacker.tile).includes(target.tile));
  assert.ok(rules.getUnitOptions(state,attacker.id).attacks.includes(target.tile));
  const hit=order(state,{type:"attack",unit:attacker.id,tile:target.tile});
  assert.ok(findUnit(hit,target.id).hp<target.hp);
  assert.equal(findUnit(hit,attacker.id).hp,attacker.hp);
  target.hp=1;
  assert.equal(findUnit(order(state,{type:"attack",unit:attacker.id,tile:target.tile}),target.id),undefined);
  attacker.type="melee";
  assert.throws(()=>order(state,{type:"attack",unit:attacker.id,tile:target.tile}));
  target.tile="12,6"; target.hp=100;
  const melee=order(state,{type:"attack",unit:attacker.id,tile:target.tile});
  assert.ok(findUnit(melee,attacker.id).hp<attacker.hp);
  assert.ok(findUnit(melee,target.id).hp<target.hp);
});

test("a ranged siege leaves city ownership intact and melee captures a weakened city", () => {
  const state=game(), defender=state.cities.find(c=>c.seat===1);
  const near=rules.neighbors(defender.tile).find(id=>!["ocean","mountains"].includes(rules.TILE_BY_ID[id].terrain));
  const attacker=combatant(state,"qa-assault",0,"ranged",near);
  state.units=[attacker];
  defender.hp=2;
  const ranged=order(state,{type:"attack",unit:attacker.id,tile:defender.tile});
  assert.equal(findCity(ranged,defender.id).seat,1);
  assert.equal(findCity(ranged,defender.id).hp,1);
  defender.hp=1;
  assert.throws(()=>order(state,{type:"attack",unit:attacker.id,tile:defender.tile}));
  attacker.type="melee";
  const captured=order(state,{type:"attack",unit:attacker.id,tile:defender.tile});
  assert.equal(findCity(captured,defender.id).seat,0);
  assert.equal(captured.board[defender.tile].owner,0);
  assert.equal(captured.phase,"finished");
  assert.deepEqual(captured.winners,[0]);
});

test("four AI seats complete a campaign through legal tactical orders", () => {
  let state=createClassicGame(["A","B","C","D"].map(name=>({name,bot:true})));
  const events=new Set(), limit=6000;
  let n=0;
  for(;n<limit && state.phase==="playing";++n) {
    const action=rules.chooseBotAction(state);
    events.add(action.type);
    state=order(state,action);
    assert.equal(new Set(state.units.map(u=>u.tile)).size,state.units.length);
    assert.ok(state.units.every(u=>u.hp>0 && u.hp<=u.maxHp && u.moves>=0));
  }
  assert.equal(state.phase,"finished","AI did not finish in "+limit+" orders");
  assert.ok(state.winners.length>0);
  assert.ok(state.players.every(player=>player.technologies.length>0));
  for(const type of ["produce","move","attack","found","research"]) assert.ok(events.has(type),"AI never used "+type);
});
