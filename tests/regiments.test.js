import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassicGame} from './classic-game.js';
import {applyAction,combatPreview,getMap,getProductionOptions,getRouteDetail,neighbors,UNIT_TYPES} from '../docs/rules.js';

const game=()=>createClassicGame(['Coast','Valley']);
function piece(id,type,seat,tile) {
  const {moves,maxHp}=UNIT_TYPES[type];
  return {id,type,seat,tile,moves,maxMoves:moves,hp:maxHp,maxHp};
}
const canTrain=(s,type)=>getProductionOptions(s,s.cities[0].id).find(o=>o.item===type).enabled;

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
  s.players[0].civics=['charter'];
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
