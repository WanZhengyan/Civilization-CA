import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassicGame} from './classic-game.js';
import {applyAction,campaignView,combatPreview,getMap,UNIT_TYPES} from '../docs/rules.js';
import {attackTrainingNote,counterTrainingNote,defenseTrainingNote,militaryTraining,trainingPanel} from '../docs/combat-training.js';
import {translate} from '../docs/i18n.js';

function engagement() {
  const state=createClassicGame(['Arroyo','Valley']);
  state.campaignVariety=1;
  const map=getMap(state), available=t=>!['ocean','mountains','forest','hills'].includes(t.terrain) &&
    state.cities.every(c=>c.tile!==t.id);
  const tile=map.tiles.find(t=>available(t) && map.neighbors(t.id).filter(id=>available(map.byId[id])).length>=3);
  const near=map.neighbors(tile.id).filter(id=>available(map.byId[id]));
  const piece=(id,type,seat,tile)=>{
    const {maxHp,moves}=UNIT_TYPES[type];
    return {id,type,seat,tile,maxHp,hp:maxHp,moves,maxMoves:moves};
  };
  state.units=[piece('ranger','ranged',0,tile.id),piece('first','melee',1,near[0]),piece('second','melee',1,near[1])];
  return state;
}
const order=(s,type,unit,more={})=>applyAction(s,s.turn,{type,unit,...more});
const pass=s=>order(s,'end');
const shoot=(s,unit,tile)=>order(s,'attack',unit,{tile});
const train=(s,unit,item)=>order(s,'train',unit,{item});
const unit=(s,id)=>s.units.find(u=>u.id===id);

test('three live strikes earn a permanent field drill, survive reload, and give a real choice on the same board',()=>{
  let s=engagement();
  const tile=s.units[1].tile, second=s.units[2].tile;
  assert.throws(()=>train(s,'ranger','assault'),/3 combat XP/);
  for (const [turn,expected] of [[1,1],[2,2],[3,3]]) {
    s=shoot(s,'ranger',tile);
    assert.equal(unit(s,'ranger').combatXP,expected);
    assert.equal(unit(s,'first')?.combatXP,turn===3?undefined:expected);
    assert.equal(campaignView(s,1).units.find(u=>u.id==='ranger').combatXP,undefined);
    s=pass(pass(s));
  }
  const ready=JSON.parse(JSON.stringify(s));
  const base=combatPreview(ready,'ranger',second);
  const panel=trainingPanel(militaryTraining(s,unit(s,'ranger'),UNIT_TYPES.ranged),true,false);
  assert.ok(panel.includes('data-order="train:assault"') && panel.includes('data-order="train:guard"'));
  assert.throws(()=>train(ready,'ranger','made-up'),/3 combat XP/);
  for(const drill of ['assault','guard']) {
    const trained=train(ready,'ranger',drill);
    assert.equal(unit(trained,'ranger').moves,0);
    const rival=pass(trained), rivalTile=unit(rival,'ranger').tile;
    assert.equal(campaignView(rival,1).units.find(u=>u.id==='ranger').drill,drill);
    const strike=combatPreview(rival,'second',rivalTile);
    assert.equal(strike.damage,42-(drill==='guard'?6:0));
    assert.equal(strike.roleNotes.includes(defenseTrainingNote),drill==='guard');
    assert.equal(shoot(rival,'second',rivalTile).units[0].hp,unit(rival,'ranger').hp-strike.damage);
    const readyAgain=pass(rival);
    assert.throws(()=>train(readyAgain,'ranger',drill==='guard'?'assault':'guard'),/untrained/);
    const forecast=combatPreview(readyAgain,'ranger',second);
    assert.deepEqual(combatPreview(campaignView(readyAgain,0),'ranger',second),forecast);
    assert.equal(forecast.damage,base.damage+(drill==='assault'?6:0));
    assert.equal(forecast.retaliation,0);
    assert.equal(forecast.roleNotes.includes(attackTrainingNote),drill==='assault');
    const actual=shoot(readyAgain,'ranger',second);
    assert.equal(unit(actual,'second').hp,forecast.defenderHpAfter);
    assert.equal(actual.battleReports[0].at(-1).damage,forecast.damage);
  }
  for(const text of [attackTrainingNote,defenseTrainingNote,counterTrainingNote,'Combat experience','Assault training','Guard training']) {
    assert.notEqual(translate(text,'zh-CN'),text);
  }
});

test('a kill earns a bonus and both field drills work on actual barbarian encounters',()=>{
  const s=engagement(), guard=s.units[0], tile=s.units[1].tile;
  s.units=s.units.filter(u=>u.id!=='first');
  guard.type='melee';guard.maxHp=100;guard.hp=100;
  s.barbarians={camps:[],parties:[{id:'look',tile,type:'lookout',hp:24,maxHp:24}]};
  const earned=shoot(s,'ranger',tile);
  assert.equal(unit(earned,'ranger').combatXP,2);
  for (const drill of ['guard','assault']) {
    const next=structuredClone(s);
    next.units[0].drill=drill;
    next.barbarians.parties[0]={id:'raid',type:'raider',tile,hp:44,maxHp:44};
    const expected=combatPreview(next,'ranger',tile);
    assert.equal(expected.retaliation,drill==='guard'?8:14);
    assert.equal(expected.damage,drill==='assault'?44:42);
    const actual=shoot(next,'ranger',tile);
    assert.equal(actual.units[0].hp,expected.attackerHpAfter);
  }
});
test('legacy battles earn no XP and an old save cannot issue a training order',()=>{
  const s=engagement();delete s.campaignVariety;
  assert.throws(()=>train(s,'ranger','guard'));
  const next=shoot(s,'ranger',s.units[1].tile);
  assert.equal(next.units[0].combatXP,undefined);
  assert.equal(next.units[1].combatXP,undefined);
});
