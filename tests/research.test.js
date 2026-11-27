import {createClassicGame} from './classic-game.js';
import assert from "node:assert/strict";
import { test } from "node:test";
import * as rules from "../docs/rules.js";

const fresh = () => createClassicGame([{name:"West"},{name:"East"}]);
const order = (s,a) => rules.applyAction(s,s.turn,a);
const learn = (s,tech) => order(s,{type:"research",item:tech});
function fullRound(s) {
  const round=s.round;
  do { s=order(s,{type:"end"}); } while(s.phase==="playing" && s.round===round);
  return s;
}

test("research accumulates at end of turn, carries over when switching and charges science once", () => {
  let state=fresh();
  const options=rules.getResearchOptions(state,0);
  for (const item of ["agronomy","industry","tactics","civics"]) {
    assert.ok(options.find(x=>x.item===item)?.enabled);
  }
  const initial=state.players[0].science;
  const income=rules.getStats(state,0).scienceIncome;
  const expectedCost=options.find(x=>x.item==="agronomy").cost;
  state=learn(state,"industry");
  state=fullRound(state);
  assert.equal(state.players[0].science,initial+income);
  assert.equal(state.players[0].research,"industry");
  state=learn(state,"agronomy");
  assert.equal(state.players[0].science,initial+income);
  let available=state.players[0].science;
  for(let i=0;i<12 && !state.players[0].technologies.includes("agronomy");i++) {
    available+=rules.getStats(state,0).scienceIncome;
    state=fullRound(state);
  }
  assert.deepEqual(state.players[0].technologies,["agronomy"]);
  assert.equal(state.players[0].science,available-expectedCost);
  assert.equal(state.players[0].research,null);
  assert.equal(rules.getResearchOptions(state,0).find(x=>x.item==="agronomy").enabled,false);
  assert.throws(()=>learn(state,"agronomy"));
  assert.throws(()=>learn(state,"missing-tech"));
});

test("stockpiled science can finish any technology immediately and the corresponding yields change", () => {
  for(const [item,key,amount] of [["industry","production",2],["agronomy","food",2],["civics","capitalIncome",2]]) {
    let state=fresh();
    const city=state.cities[0];
    const yields=rules.getCityYield(state,city.id), stats=rules.getStats(state,0);
    const cost=rules.getResearchOptions(state,0).find(x=>x.item===item).cost;
    state.players[0].science=cost+2;
    const next=learn(state,item);
    assert.equal(next.players[0].science,2);
    assert.ok(next.players[0].technologies.includes(item));
    assert.equal(next.players[0].research,null);
    if(item==="civics") {
      assert.equal(rules.getStats(next,0)[key],stats[key]+amount);
      assert.equal(rules.getStats(next,0).influenceIncome,stats.influenceIncome+1);
    } else assert.equal(rules.getCityYield(next,city.id)[key],yields[key]+amount);
  }
});

function combatScenario(type,defenderKind="unit") {
  const state=fresh();
  const attacker=state.units.find(u=>u.seat===0 && u.type==="melee");
  const defender=defenderKind==="unit" ? state.units.find(u=>u.seat===1 && u.type==="melee") : state.cities.find(c=>c.seat===1);
  attacker.type=type;
  attacker.tile=rules.neighbors(defender.tile).find(id=>!["ocean","mountains"].includes(rules.TILE_BY_ID[id].terrain));
  state.units=defenderKind==="unit" ? [attacker,defender] : [attacker];
  return {state,attacker,defender};
}

test("combat forecast matches actual HP, capture, casualties, and a unit's advance", () => {
  for (const [type,kind,hp] of [["ranged","unit",80],["melee","unit",1],["melee","unit",95],["melee","city",1],["ranged","city",3]]) {
    const {state,attacker,defender}=combatScenario(type,kind);
    defender.hp=hp;
    const old=JSON.stringify(state);
    const preview=rules.combatPreview(state,attacker.id,defender.tile);
    assert.ok(preview);
    assert.equal(JSON.stringify(state),old);
    assert.equal(preview.attackerHpBefore,attacker.hp);
    assert.equal(preview.defenderHpBefore,hp);
    assert.equal(preview.defenderType,kind);
    const next=order(state,{type:"attack",unit:attacker.id,tile:defender.tile});
    const afterAttacker=next.units.find(u=>u.id===attacker.id);
    const afterTarget=(kind==="city" ? next.cities : next.units).find(x=>x.id===defender.id);
    assert.equal(preview.attackerHpAfter,afterAttacker?.hp ?? 0);
    assert.equal(preview.defenderHpAfter,afterTarget?.hp ?? 0);
    assert.equal(preview.damage,preview.defenderHpBefore-preview.defenderHpAfterHit);
    assert.equal(preview.capture,kind==="city" && afterTarget.seat===0);
    assert.equal(preview.advances,afterAttacker?.tile===defender.tile);
    assert.equal(rules.combatPreview(next,attacker.id,defender.tile),null);
  }
});

test("tactics research changes the forecast and actual military attack and retaliation", () => {
  const {state,attacker,defender}=combatScenario("melee");
  const before=rules.combatPreview(state,attacker.id,defender.tile);
  state.players[0].technologies=["tactics"];
  state.players[1].technologies=["tactics"];
  const after=rules.combatPreview(state,attacker.id,defender.tile);
  assert.ok(after.damage>before.damage);
  assert.ok(after.retaliation>before.retaliation);
  const resolved=order(state,{type:"attack",unit:attacker.id,tile:defender.tile});
  assert.equal(resolved.units.find(u=>u.id===defender.id).hp,after.defenderHpAfter);
});
