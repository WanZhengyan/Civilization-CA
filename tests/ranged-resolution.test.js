import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassicGame} from './classic-game.js';
import {applyAction,campaignView,combatPreview,getMap,hexDistance,UNIT_TYPES} from '../docs/rules.js';
import {attackMode} from '../docs/attack-mode.js';

function scenario(type,targetType,range=1) {
  const state=createClassicGame(['West','East']);
  const map=getMap(state),def=UNIT_TYPES[type],sea=def.domain==='sea';
  const dry=t=>['coast','urban','plains'].includes(t.terrain);
  const victim=map.tiles.find(t=>dry(t) && map.tiles.some(src=>(sea?src.terrain==='ocean':dry(src)) && hexDistance(t.id,src.id)===range));
  const src=map.tiles.find(t=>(sea?t.terrain==='ocean':dry(t)) && hexDistance(victim.id,t.id)===range);
  const attacker={id:'a',type,seat:0,tile:src.id,hp:def.maxHp,maxHp:def.maxHp,moves:def.moves,maxMoves:def.moves};
  const defender={id:'d',type:'melee',seat:1,tile:victim.id,hp:100,maxHp:100,moves:2,maxMoves:2};
  state.units=[attacker];
  state.cities=state.cities.filter(c=>c.tile!==victim.id && c.tile!==src.id);
  state.barbarians={camps:[],parties:[]};
  if(targetType==='unit')state.units.push(defender);
  if(targetType==='city')state.cities.push({id:'fort',seat:1,tile:victim.id,name:'Harbor',hp:100,maxHp:100,buildings:[],population:2,food:0});
  if(targetType==='camp')state.barbarians.camps.push({id:'c',type:'camp',tile:victim.id,hp:48,maxHp:48});
  return {state,attacker,tile:victim.id};
}
function strike(state,attacker,tile) {
  const forecast=combatPreview(state,attacker.id,tile);
  assert.ok(forecast,attacker.type+' against '+tile);
  const visible=combatPreview(campaignView(state,0),attacker.id,tile);
  assert.deepEqual(visible,forecast);
  const next=applyAction(state,0,{type:'attack',unit:attacker.id,tile});
  const actual=next.units.find(u=>u.id===attacker.id), report=next.battleReports[0].at(-1);
  assert.equal(actual.hp,forecast.attackerHpAfter);assert.equal(actual.moves,0);
  assert.equal(report.damage,forecast.damage);assert.equal(report.retaliation,forecast.retaliation);
  assert.equal(report.attackMode,forecast.attackMode);assert.equal(report.target.hpAfter,forecast.defenderHpAfterHit);
  assert.equal(report.attacker.hpAfter,actual.hp);
  return {forecast,actual,report};
}
test('Rangers preserve their 35 outgoing damage at range one and two with zero attacker HP loss',()=>{
  for(const range of [1,2]) for(const kind of ['unit','city','camp']) {
    const {state,attacker,tile}=scenario('ranged',kind,range);
    const {forecast,actual}=strike(state,attacker,tile);
    assert.equal(forecast.attackMode,'ranged');assert.equal(forecast.damage,35);assert.equal(forecast.retaliation,0);
    assert.equal(actual.hp,80);assert.equal(actual.tile,attacker.tile);
    assert.equal(forecast.defenderHpAfter,kind==='camp'?13:65);
  }
});
test('guns, light infantry and every armed ship fire even beside their target',()=>{
  for(const [type,damage] of Object.entries({artillery:46,skirmisher:26,cutter:36,frigate:48,ironclad:40,destroyer:39})){
    const {state,attacker,tile}=scenario(type,'unit');
    attacker.hp=attacker.maxHp;
    const {forecast,actual}=strike(state,attacker,tile);
    assert.equal(forecast.damage,damage);assert.equal(forecast.attackMode,'ranged');
    assert.equal(forecast.retaliation,0);assert.equal(actual.hp,attacker.hp);
  }
});
test('melee counterattacks remain distinct for troops, cities and camps',()=>{
  for(const [kind,counter,remaining] of [['unit',25,58],['city',15,58],['camp',12,6]]){
    const {state,attacker,tile}=scenario('melee',kind);
    const {forecast,actual}=strike(state,attacker,tile);
    assert.equal(forecast.attackMode,'melee');assert.equal(forecast.retaliation,counter);assert.equal(actual.hp,100-counter);
    assert.equal(forecast.defenderHpAfter,remaining);
  }
  assert.equal(attackMode(UNIT_TYPES.scout),'melee');assert.equal(attackMode(UNIT_TYPES.workboat),null);
});

test('wounds, cover and final city/camp HP caps affect outgoing damage without ever hurting a shooter',()=>{
  for(const kind of ['city','camp']){
    const {state,attacker,tile}=scenario('ranged',kind);
    attacker.hp=40;
    const target=kind==='city'?state.cities.find(c=>c.tile===tile):state.barbarians.camps[0];
    if(kind==='city')target.buildings=['walls'];
    const first=combatPreview(state,attacker.id,tile);
    assert.equal(first.damage,kind==='city'?24:31);
    target.hp=3;
    const {forecast,actual}=strike(state,attacker,tile);
    assert.equal(forecast.damage,2);assert.equal(forecast.capture,false);assert.equal(actual.hp,40);
  }
});

import {describeBattle} from '../docs/battle-history.js';
import {paintBattleReport} from '../docs/battle-overlay.js';
import {forecastCounterLabel,witnessedMode} from '../docs/attack-mode.js';
import {translate} from '../docs/i18n.js';
test('bilingual forecasts and replay describe the actual zero loss even for older witnessed reports',()=>{
  const {state,attacker,tile}=scenario('ranged','unit');
  const {forecast,report}=strike(state,attacker,tile), map=getMap(state);
  for (const [locale,forecastText,mode,counter] of [['en','Ranged strike · 0 retaliation damage','Ranged strike','0 counterdamage'],['zh-CN','远程攻击 · 反击伤害 0','远程攻击','反击造成 0 伤害']]) {
    assert.equal(translate(forecastCounterLabel(forecast),locale),forecastText);
    const legacy={...report};delete legacy.attackMode;
    for (const saved of [report,legacy]) {
      const summary=describeBattle(saved,state.players,map,0,locale).details;
      assert.ok(summary.includes(mode));assert.ok(summary.includes(counter));
    }
    const hidden={...report,attacker:{kind:'unknown'},retaliation:null};
    const summary=describeBattle(hidden,state.players,map,1,locale).details;
    assert.equal(witnessedMode(hidden,UNIT_TYPES),null);assert.ok(!summary.includes(counter)&&!summary.includes(mode));
  }
});
test('reduced-motion replay displays both numeric HP deltas without moving the shooter',()=>{
  const {state,attacker,tile}=scenario('ranged','unit'),{report}=strike(state,attacker,tile);
  const marks=[];
  const ctx=new Proxy({
    measureText(s){return {width:s.length*7};},
    fillText(s,x,y){marks.push({s,x,y});}
  },{get:(obj,key)=>key in obj?obj[key]:()=>{}});
  paintBattleReport(ctx,{report,to:[90,85],from:[30,35],still:true,color:'#dbc',start:0,duration:1000},1,500);
  assert.deepEqual(marks.map(m=>[m.s,m.x]),[['−35',90],['0',30]]);
});

test('the city order forecast explains naval bombardment, capture-capable troops and the garrison shield',async()=>{
  const {cityAttackHint}=await import('../docs/attack-mode.js');
  const city={tile:'20,15'};
  assert.match(cityAttackHint({defenderType:'city'},{captures:false},city),/1 HP/);
  assert.match(cityAttackHint({defenderType:'unit'},{captures:false},city),/garrison/);
  assert.equal(cityAttackHint({defenderType:'city'},{captures:true},city),'');
  assert.equal(cityAttackHint({defenderType:'unit'},{captures:false},null),'');
});
