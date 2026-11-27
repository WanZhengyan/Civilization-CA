import test from 'node:test';
import assert from 'node:assert/strict';
import {formationChoices} from '../docs/regiments.js';
import {createClassicGame} from './classic-game.js';
import {applyAction,combatPreview,getMap,getProductionOptions,getRouteDetail,neighbors,UNIT_TYPES,CIVICS,TECHS} from '../docs/rules.js';

const game=()=>createClassicGame(['Coast','Valley']);
function piece(id,type,seat,tile) {
  const {moves,maxHp}=UNIT_TYPES[type];
  return {id,type,seat,tile,moves,maxMoves:moves,hp:maxHp,maxHp};
}
const canTrain=(s,type)=>getProductionOptions(s,s.cities[0].id).some(o=>o.item===type && o.enabled);

test('woodland and foothill routes have a lower cost for light infantry',()=>{
  const s=game(), map=getMap(s);
  for (const terrain of ['forest','hills']) {
    const t=map.tiles.find(t=>t.terrain===terrain && !s.cities.some(c=>c.tile===t.id));
    const start=neighbors(t.id).find(id=>map.byId[id].terrain==='plains'||map.byId[id].terrain==='urban'||map.byId[id].terrain==='coast');
    assert.ok(start);
    s.units=[piece('a','skirmisher',0,start)];
    assert.equal(getRouteDetail(s,'a',t.id).cost,1);
    s.units=[piece('a','melee',0,start)];
    assert.equal(getRouteDetail(s,'a',t.id).cost,2);
  }
});

test('pike and cavalry forecasts show their asymmetric modifiers and match the actual battle',()=>{
  const s=game();
  assert.equal(canTrain(s,'pikes'),false);
  s.players[0].civics=Object.keys(CIVICS);
  assert.ok(canTrain(s,'pikes'));
  for (const [attacker,defender,adjust] of [['pikes','cavalry',14],['cavalry','pikes',-14]]) {
    s.units=[piece('a',attacker,0,'10,7'),piece('b',defender,1,'11,8')];
    const forecast=combatPreview(s,'a','11,8');
    assert.equal(forecast.damage,UNIT_TYPES[attacker].strength+adjust);
    assert.equal(forecast.roleNotes.length,1);
    const next=applyAction(s,0,{type:'attack',unit:'a',tile:'11,8'});
    assert.equal(next.units.find(u=>u.id==='b').hp,forecast.defenderHpAfter);
  }
});

test('engineers exploit walls after the garrison falls and friendly signal coverage does not stack',()=>{
  const s=game(), town=s.cities[1];
  town.tile='11,8';
  town.buildings=['walls'];
  s.units=[piece('a','sappers',0,'10,7')];
  const unsupported=combatPreview(s,'a',town.tile);
  assert.equal(unsupported.damage,40+18-7);
  s.units.push(piece('signal','signals',0,'10,8'),piece('signal-2','signals',0,'9,7'));
  const covered=combatPreview(s,'a',town.tile);
  assert.equal(covered.damage,unsupported.damage+8);
  assert.equal(covered.roleNotes.length,2);
  s.units.push(piece('g','melee',1,town.tile));
  const garrison=combatPreview(s,'a',town.tile);
  assert.equal(garrison.roleNotes.length,1);
  assert.equal(garrison.damage,40-7+8);
  const next=applyAction(s,0,{type:'attack',unit:'a',tile:town.tile});
  assert.equal(next.units.find(u=>u.id==='g').hp,garrison.defenderHpAfter);
});

test('specialist shipyards, coastal bombardment and fleet damage use the same rules in orders and forecasts',()=>{
  const s=game();
  s.players[0].technologies=Object.keys(TECHS);
  s.cities[0].buildings=['harbor'];
  for (const type of ['ironclad','destroyer']) assert.ok(!canTrain(s,type));
  s.cities[0].buildings.push('shipyard');
  for (const type of ['ironclad','destroyer']) assert.ok(canTrain(s,type));
  // Isolate the unit matchup from the flat bonuses offered by researched combat doctrines.
  s.players[0].technologies=[];
  const town=s.cities[1];
  town.tile='4,7';
  s.units=[piece('a','ironclad',0,'3,7')];
  const siege=combatPreview(s,'a',town.tile);
  assert.equal(siege.damage,54);
  assert.equal(siege.roleNotes.length,1);
  town.hp=12;
  assert.equal(combatPreview(s,'a',town.tile).defenderHpAfter,1);
  s.units=[piece('a','destroyer',0,'3,7'),piece('b','frigate',1,'3,8')];
  const escort=combatPreview(s,'a','3,8');
  assert.equal(escort.damage,57);
  assert.equal(escort.roleNotes.length,1);
  const next=applyAction(s,0,{type:'attack',unit:'a',tile:'3,8'});
  assert.equal(next.units.find(u=>u.id==='b').hp,escort.defenderHpAfter);
  s.units[1]=piece('b','workboat',1,'3,8');
  assert.equal(combatPreview(s,'a','3,8').damage,39);
});

test('adjacent teammate signals assist a visible attack once without treating friendly riders as enemies',()=>{
  const state=createClassicGame(['Coast','Valley','Sierras']);
  state.teams=[0,1,0];
  state.cities=[];
  state.units=[piece('a','melee',0,'10,7'),piece('b','melee',1,'11,8')];
  const solo=combatPreview(state,'a','11,8');
  state.units.push(piece('ally-signal','signals',2,'10,8'),piece('signal','signals',0,'9,7'));
  const ally=combatPreview(state,'a','11,8');
  assert.equal(ally.damage,solo.damage+8);
  assert.equal(applyAction(state,0,{type:'attack',unit:'a',tile:'11,8'}).units.find(u=>u.id==='b').hp,ally.defenderHpAfter);
  state.units=[piece('mounted','cavalry',2,'10,7')];
  state.cities=[{seat:2}];
  const response=()=>formationChoices(state,{seat:0},[],()=>0,[]);
  assert.deepEqual(response(),[]);
  state.teams[2]=1;
  assert.deepEqual(response(),['sappers','pikes']);
});
