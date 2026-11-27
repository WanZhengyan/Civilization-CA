import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,getMap,hexDistance,neighbors,getUnitOptions,applyAction,combatPreview} from '../docs/rules.js';
import {projectForSeat} from '../docs/vision.js';
import {seedCamps,wildAt} from '../docs/barbarians.js';

const players=[{name:'West'},{name:'East'}];
function setup(region='la',seed=764) {
  return createGame(players,region,{seed});
}
function battlefield() {
  const s=setup();
  const camp=s.barbarians.camps[0];
  const from=neighbors(camp.tile).find(t=>!['ocean','mountains'].includes(getMap(s).byId[t].terrain));
  const unit={id:'veteran',seat:0,type:'melee',tile:from,hp:100,maxHp:100,moves:2,maxMoves:2};
  s.units=[unit];s.cities=[];s.barbarians={camps:[{...camp,hp:9}],parties:[]};
  return {s,camp,unit};
}
test('camp and scout sites are deterministic and give every founder a safe opening',()=>{
  for(const region of ['la','sf','sd']){
    const state=setup(region);
    const generate=seed=>{
      const next={...state,seed,barbarians:undefined};
      seedCamps(next,getMap(next),neighbors,hexDistance);
      return next.barbarians;
    };
    const a=generate(908);
    assert.deepEqual(a,generate(908));
    assert.notDeepEqual(a,generate(909));
    assert.ok(a.camps.length>=2);
    const occupied=new Set();
    for(const p of [...a.camps,...a.parties]){
      assert.ok(!['ocean','mountains'].includes(getMap(state).byId[p.tile].terrain));
      assert.ok(state.units.every(start=>hexDistance(p.tile,start.tile)>=4));
      assert.ok(!occupied.has(p.tile));occupied.add(p.tile);
    }
    assert.ok(a.camps.every(c=>a.parties.some(p=>p.campId===c.id)));
  }
});
test('a close-combat unit takes a camp for the displayed bounty exactly once',()=>{
  const {s,camp,unit}=battlefield();
  const starting=s.players[0].capital;
  const original=JSON.stringify(s);
  assert.ok(!getUnitOptions(s,unit.id).moves.includes(camp.tile));
  const forecast=combatPreview(s,unit.id,camp.tile);
  assert.equal(forecast.defenderType,'wild');assert.ok(forecast.defeated);
  const next=applyAction(s,0,{type:'attack',unit:unit.id,tile:camp.tile});
  assert.equal(JSON.stringify(s),original);
  assert.equal(next.players[0].capital,starting+12);
  assert.ok(!wildAt(next,camp.tile));assert.equal(next.units[0].tile,camp.tile);
  assert.equal(next.units[0].hp,forecast.attackerHpAfter);
  assert.throws(()=>applyAction(next,0,{type:'attack',unit:unit.id,tile:camp.tile}));
});
test('ranged fire can weaken a camp but cannot collect the land bounty',()=>{
  const {s,camp,unit}=battlefield();
  unit.type='ranged';s.barbarians.camps[0].hp=2;
  const forecast=combatPreview(s,unit.id,camp.tile);
  assert.equal(forecast.defenderHpAfter,1);assert.equal(forecast.retaliation,0);
  const next=applyAction(s,0,{type:'attack',unit:unit.id,tile:camp.tile});
  assert.equal(next.barbarians.camps[0].hp,1);
  assert.equal(next.players[0].capital,s.players[0].capital);
});

test('a lookout in sight reveals its own piece without revealing its home or orders',()=>{
  const s=setup();
  for (const seat of [0,1]) {
    const opening=projectForSeat(s,seat);
    assert.deepEqual(opening.barbarians,{camps:[],parties:[]});
  }
  const party=s.barbarians.parties[0];
  const camp=s.barbarians.camps.find(c=>c.id===party.campId);
  const post=neighbors(party.tile).find(id=>hexDistance(id,camp.tile)>1);
  assert.ok(post);
  s.units=[{...s.units[0],type:'settler',seat:0,tile:post}];
  s.cities=[];
  party.report='unseen-city';
  const recon=projectForSeat(s,0).barbarians;
  assert.ok(!recon.camps.some(c=>c.id===camp.id));
  const visible=recon.parties.find(p=>p.id===party.id);
  assert.deepEqual(Object.keys(visible).sort(),['hp','id','maxHp','tile','type']);
  assert.ok(!visible.id.includes(party.tile));
});
