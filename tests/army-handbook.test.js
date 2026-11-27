import test from 'node:test';
import assert from 'node:assert/strict';
import {handbookRows} from '../docs/army-handbook.js';
import {CIVICS, ERAS, TECHS, UNIT_TYPES} from '../docs/rules.js';

test('the handbook lists each trainable unit once, with the rules engine’s stats and gates',()=>{
  const entries=Object.values(ERAS).flatMap(era=>handbookRows(era.id));
  assert.equal(entries.length,Object.keys(UNIT_TYPES).length);
  assert.equal(new Set(entries.map(u=>u.name)).size,entries.length);
  for (const unit of Object.values(UNIT_TYPES)) {
    const row=entries.find(u=>u.name===unit.name);
    assert.equal(row?.cost,unit.required);
    assert.equal(row.moves,unit.moves);
    assert.ok(row.sight>=1);
  }
  for (const [id, requirements] of [
    ['pikes', [CIVICS.mutualAid.name]],
    ['ironclad', [TECHS.metallurgy.name, 'Harbor', 'Shipyard']],
    ['destroyer', [TECHS.radar.name, 'Harbor', 'Shipyard']]
  ]) assert.deepEqual(entries.find(row=>row.name===UNIT_TYPES[id].name).requirements,requirements);
  assert.deepEqual(entries.find(u=>u.name==='Steam frigate').requirements,['Steam Power','Harbor','Shipyard']);
});
