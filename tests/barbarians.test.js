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

import {barbarianRound} from '../docs/barbarians.js';
import {UNIT_TYPES} from '../docs/rules.js';
function raidFixture() {
  const s=setup();
  // Pick an interior land corridor of three consecutive hexes.
  const map=getMap(s);
  const free=id=>map.byId[id].terrain==='urban';
  const t=map.tiles.find(tile=>free(tile.id) &&
    neighbors(tile.id).some(mid=>free(mid) && neighbors(mid).some(end=>free(end) && hexDistance(end,tile.id)===2)));
  const front=neighbors(t.id).find(mid=>free(mid) && neighbors(mid).some(end=>free(end)&&hexDistance(end,t.id)===2));
  const home=neighbors(front).find(end=>free(end)&&hexDistance(end,t.id)===2);
  const city={id:'capital',name:'Test City',tile:t.id,seat:0,buildings:[],hp:100,maxHp:100};
  const camp={id:'base',type:'camp',tile:home,hp:48,maxHp:48};
  const scout={id:'eyes',type:'lookout',tile:front,campId:'base',hp:24,maxHp:24};
  s.round=7;s.cities=[city];s.units=[];
  s.barbarians={camps:[camp],parties:[scout],settledSince:{capital:2}};s.log=[];
  function next() {
    s.round++;
    barbarianRound(s,map,neighbors,hexDistance,UNIT_TYPES,(state,seat,type,text,tile)=>state.log.push({round:state.round,seat,type,text,tile}));
  }
  return {s,city,camp,scout,front,next};
}
test('scouting provides an interception turn and two rounds of warning before a raid launches',()=>{
  const {s,city,next}=raidFixture();
  next();assert.equal(s.barbarians.parties[0].report,city.id);assert.ok(!s.barbarians.camps[0].target);
  next();const camp=s.barbarians.camps[0];
  assert.equal(camp.target,city.id);assert.equal(camp.prepare,s.round+2);
  next();assert.ok(!s.barbarians.parties.length);
  next();assert.equal(s.barbarians.parties[0].type,'raider');
  assert.ok(s.log.every(e=>e.seat===0));assert.ok(!s.log.some(e=>e.tile===camp.tile));
  const before=s.players[0].capital;
  for(let n=0;n<8 && !s.log.some(e=>e.text.includes('looted'));n++)next();
  assert.equal(s.players[0].capital,before-3);assert.equal(city.hp,88);
});
test('city defenses stop an incoming raider; civilian founders and new towns cannot trigger it',()=>{
  const {s,city,camp,front,next}=raidFixture();
  const raid={id:'raid',campId:camp.id,type:'raider',target:city.id,tile:front,hp:44,maxHp:44};
  s.barbarians.parties=[raid];city.buildings=['walls'];
  const before=s.players[0].capital;
  next();assert.equal(city.hp,100);assert.equal(s.players[0].capital,before);
  assert.ok(s.log.at(-1).text.includes('repelled'));
  city.buildings=[];s.barbarians.parties=[{...raid}];
  s.units=[{id:'guard',seat:0,type:'melee',tile:city.tile,hp:84}];
  next();assert.equal(city.hp,100);assert.equal(s.players[0].capital,before);
  s.cities=[];s.units=[{id:'first',seat:0,type:'settler',tile:city.tile,hp:60}];
  s.barbarians.parties=[{...raid}];next();assert.equal(s.units[0].hp,60);
  s.cities=[city];s.barbarians.parties=[{id:'eyes2',type:'lookout',campId:camp.id,tile:front}];
  next();assert.ok(!s.barbarians.parties[0].report && !s.barbarians.camps[0].target);
});
test('clearing a camp cancels any preparing raid and prevents fresh patrols',()=>{
  const {s,city,camp,front,next}=raidFixture();
  s.barbarians.camps[0]={...camp,target:city.id,prepare:s.round+1,hp:1};
  s.barbarians.parties=[];
  s.units=[{id:'guard',seat:0,type:'melee',tile:front,hp:88,maxHp:100,moves:2,maxMoves:2}];
  const cleared=applyAction(s,0,{type:'attack',tile:camp.tile,unit:'guard'});
  s.barbarians=cleared.barbarians;
  for(let i=0;i<5;i++)next();
  assert.ok(!s.barbarians.camps.length&&!s.barbarians.parties.length);
});
