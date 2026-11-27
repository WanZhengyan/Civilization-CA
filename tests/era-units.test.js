import {test} from 'node:test';
import assert from 'node:assert/strict';
import {UNIT_TYPES,applyAction,combatPreview,createGame,getEra,getProductionOptions,getUnitOptions,hexDistance} from '../docs/rules.js';
const fresh=()=>createGame(['West','East']);
const act=(s,a)=>applyAction(s,s.turn,a);
const nextRound=s=>act(act(s,{type:'end'}),{type:'end'});
const city=s=>s.cities.find(c=>c.seat===0);
const option=(s,type)=>getProductionOptions(s,city(s).id).find(o=>o.item===type);

test('training follows research and mobilized new units retain their actual service health',()=>{
  let s=fresh();
  const id=city(s).id;
  const locked=option(s,'artillery');
  assert.equal(locked.enabled,false);
  assert.match(locked.reason,/Steam Power/);
  assert.throws(()=>act(s,{type:'produce',city:id,item:'artillery'}),/Requires/);
  s.players[0].technologies=['industry','steam'];
  s.players[0].civics=['mobilization'];
  assert.equal(option(s,'armor').enabled,false);
  assert.equal(option(s,'artillery').enabled,true);
  s=act(s,{type:'produce',city:id,item:'artillery'});
  for(let n=0;n<10&&!s.units.some(u=>u.type==='artillery');n++)s=nextRound(s);
  const gun=s.units.find(u=>u.type==='artillery');
  assert.ok(gun);
  assert.equal(gun.hp,UNIT_TYPES.artillery.maxHp+20);
  s.players[0].technologies.push('ballistics','motorization');
  assert.equal(getEra(s,0).id,'modern');
  assert.equal(option(s,'armor').enabled,true);
});

test('an authorized field upgrade spends treasury and movement and carries fractional wounds',()=>{
  const old=fresh();
  const original=old.units.find(u=>u.seat===0 && u.type==='melee');
  original.hp=55;
  old.players[0].technologies=['tactics','ballistics'];
  old.players[0].capital=30;
  const offer=getUnitOptions(old,original.id).upgrade;
  assert.ok(offer.enabled);
  const next=act(old,{type:'upgrade',unit:original.id});
  const upgraded=next.units.find(u=>u.id===original.id);
  assert.equal(upgraded.type,'riflemen');
  assert.equal(upgraded.tile,original.tile);
  assert.equal(upgraded.hp,60);
  assert.equal(upgraded.moves,0);
  assert.equal(next.players[0].capital,30-offer.cost);
  assert.equal(original.type,'melee');
  old.board[original.tile].owner=null;
  assert.throws(()=>act(old,{type:'upgrade',unit:original.id}),/territory/);
});

test('artillery bombards a city at distance three without capturing it and armor occupies from an adjacent tile',()=>{
  const s=fresh(),port=s.cities[1];
  const gun=s.units.find(u=>u.seat===0 && u.type==='melee');
  s.units=[gun];
  gun.type='artillery';
  gun.tile='7,7'; port.hp=3;
  assert.equal(hexDistance(gun.tile,port.tile),3);
  const forecast=combatPreview(s,gun.id,port.tile);
  assert.equal(forecast.capture,false);
  assert.equal(forecast.defenderHpAfter,1);
  const shot=act(s,{type:'attack',unit:gun.id,tile:port.tile});
  assert.equal(shot.cities[1].hp,1);
  gun.tile='5,7';gun.type='armor';
  assert.equal(combatPreview(s,gun.id,port.tile).capture,true);
  const taken=act(s,{type:'attack',unit:gun.id,tile:port.tile});
  assert.equal(taken.cities[1].seat,0);
  assert.equal(taken.units[0].tile,port.tile);
});
