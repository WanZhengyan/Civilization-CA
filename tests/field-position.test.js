import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassicGame} from './classic-game.js';
import {applyAction,campaignView,combatPreview,getMap,getUnitOptions,UNIT_TYPES} from '../docs/rules.js';
import {fieldPosition,fieldPositionPanel} from '../docs/field-position.js';
import {translate} from '../docs/i18n.js';

function engagement(terrain) {
  const state=createClassicGame(['Valley','Pacific']);
  state.campaignVariety=1;
  const map=getMap(state);
  const tile=map.tiles.find(t=>t.terrain===terrain && !state.cities.some(c=>c.tile===t.id) &&
    map.neighbors(t.id).some(n=>map.byId[n].terrain==='plains'));
  const from=map.neighbors(tile.id).find(n=>map.byId[n].terrain==='plains');
  const unit=(id,seat,type,tile)=>{
    const {moves,maxHp}=UNIT_TYPES[type];
    return {id,seat,type,tile,hp:maxHp,maxHp,moves,maxMoves:moves};
  };
  state.units=[unit('guard',0,'melee',tile.id),unit('gun',1,'ranged',from)];
  return state;
}
const order=(s,type,unit,extra={})=>applyAction(s,s.turn,{type,unit,...extra});
const pass=s=>order(s,'end');
test('the same ranged shot against held ground loses the displayed number of HP on open, wooded and elevated land',()=>{
  for (const [terrain,reduction] of [['plains',4],['forest',8],['hills',10]]) {
    const s=engagement(terrain);
    const tile=s.units[0].tile;
    const open=combatPreview(pass(s),'gun',tile);
    const dug=pass(order(s,'fortify','guard'));
    const expected=combatPreview(dug,'gun',tile);
    assert.equal(expected.damage,open.damage-reduction);
    assert.equal(expected.retaliation,0);
    assert.equal(expected.roleNotes.length,1);
    assert.deepEqual(combatPreview(campaignView(dug,1),'gun',tile),expected);
    assert.equal(campaignView(dug,1).units.find(u=>u.id==='guard').fortified,true);
    const after=order(dug,'attack','gun',{tile});
    assert.equal(after.units[0].hp,expected.defenderHpAfter);
    assert.equal(after.battleReports[1].at(-1).damage,expected.damage);
    const next=pass(after);
    assert.equal(next.units[0].fortified,true);
    const move=getUnitOptions(next,'guard').moves[0];
    assert.ok(move);
    assert.equal(order(next,'move','guard',{tile:move}).units[0].fortified,undefined);
    const note=expected.roleNotes[0];
    const html=fieldPositionPanel(fieldPosition(s,s.units[0],UNIT_TYPES.melee,terrain),s.units[0],true,false);
    assert.ok(html.includes('data-order="fortify"') && html.includes(note));
    assert.ok(translate(note,'zh-CN').includes(String(reduction)));
    assert.notEqual(translate(note,'zh-CN'),note);
  }
});
test('the defender must commit full movement; old games, civilians and ships cannot issue this order',()=>{
  const s=engagement('hills');
  for (const type of ['settler','builder','cutter','workboat']) {
    s.units[0].type=type;
    assert.throws(()=>order(s,'fortify','guard'),/Fortifying/);
  }
  s.units[0].type='melee';
  s.units[0].moves=1;
  assert.throws(()=>order(s,'fortify','guard'),/Fortifying/);
  s.units[0].moves=2;
  delete s.campaignVariety;
  assert.throws(()=>order(s,'fortify','guard'),/Fortifying/);
});
