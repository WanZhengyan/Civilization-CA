import test from 'node:test';
import assert from 'node:assert/strict';
import {describeBattle,pendingIncoming} from '../docs/battle-history.js';
import {battleMarkers,paintBattleReport} from '../docs/battle-overlay.js';
import {createGame,getMap} from '../docs/rules.js';

const game=createGame(undefined,'la',{seed:417007});
const map=getMap(game);
const attacker={kind:'unit',type:'scout',seat:1,tile:'5,6'};
const target={kind:'unit',type:'scout',seat:0,tile:'4,7'};
const report={id:5,round:9,attacker,target,damage:26,retaliation:13,outcome:'hit'};

test('combat descriptions identify the same historical fight from each seat in both languages',()=>{
  for(const [locale,defender,observer,own] of [['en','Under attack','Observed battle','Your attack'],['zh-CN','我方遇袭','目击交战','我方进攻']]){
    const d=describeBattle(report,game.players,map,0,locale);
    assert.equal(d.category,defender);
    assert.equal(describeBattle(report,game.players,map,2,locale).category,observer);
    assert.equal(describeBattle(report,game.players,map,1,locale).category,own);
    assert.match(d.details,/26/);assert.match(d.details,/13/);assert.match(d.location,/4, 7/);
    assert.notEqual(d.source,d.target);
    const city={...target,kind:'city',name:'Coral Station'};
    const capture=describeBattle({...report,target:city,outcome:'captured'},game.players,map,0,locale);
    assert.match(capture.action,/Coral Station/);assert.match(capture.details,/City captured|城市被占领/);
  }
});

test('playback schedules distinct incoming attacks across snapshots and caps reconnect bursts',()=>{
  const reports=Array.from({length:15},(_,i)=>({...report,id:i+1,round:i+1}));
  reports.push({...report,id:16,round:15,target:attacker,attacker:target});
  assert.deepEqual(pendingIncoming(reports,0,0,0,15).map(r=>r.id),[14,15]);
  assert.deepEqual(pendingIncoming(reports,0,5,0,15).map(r=>r.id),[10,11,12,13,14,15]);
  assert.deepEqual(pendingIncoming(reports,0,12,14,15).map(r=>r.id),[15]);
  assert.deepEqual(pendingIncoming(reports,0,15,0,15),[]);
});

test('unseen origins never read a source tile, draw a flight path, or name an attacker',()=>{
  const hidden={...report,attacker:{kind:'unknown'},retaliation:0};
  const accessed=[],ctxCalls=[];
  const markers=battleMarkers(hidden,{get(key){accessed.push(key);return map.byId[key];}});
  assert.deepEqual(accessed,['4,7']);assert.equal(markers.from,null);
  const ctx=new Proxy({measureText(){return {width:8};}}, {get(target,key){
    return target[key] || ((...args)=>ctxCalls.push([key,...args]));
  }});
  const active=paintBattleReport(ctx,{report:hidden,...markers,still:true,start:0,duration:1200},1,500);
  assert.equal(active,false);
  assert.ok(ctxCalls.some(([op,text])=>op==='fillText' && text==='−26'));
  assert.ok(!ctxCalls.some(([op])=>op==='lineTo'));
  assert.equal(describeBattle(hidden,game.players,map,0,'en').source,'Unidentified attacker');
  assert.equal(describeBattle(hidden,game.players,map,0,'zh-CN').source,'未辨明的攻击者');
});
