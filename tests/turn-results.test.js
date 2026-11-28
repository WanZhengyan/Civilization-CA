import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,applyAction,campaignView,getResearchOptions,getCivicOptions,getCityYield} from '../docs/rules.js';
import {previousTurnResults} from '../docs/turn-results.js';

function harvest(){
  let s=createGame([{name:'West'},{name:'East'}],'la',{seed:21895,mapSize:'standard'});
  s=applyAction(s,0,{type:'found',unit:s.units.find(u=>u.seat===0).id});
  const city=s.cities[0];
  s=applyAction(s,0,{type:'produce',city:city.id,item:'melee'});
  const research=getResearchOptions(s,0).find(o=>o.enabled);
  const civic=getCivicOptions(s,0).find(o=>o.enabled);
  s=applyAction(s,0,{type:'research',item:research.item});
  s=applyAction(s,0,{type:'civic',item:civic.item});
  const own=s.cities[0];
  own.name='<Cedar>';
  own.queue.progress=own.queue.required-getCityYield(s,own.id).production;
  s.players[0].science=research.cost-1;
  s.players[0].culture=civic.cost-1;
  return applyAction(s,0,{type:'end'});
}
const view=s=>({state:campaignView(s,0),seat:0,mode:'solo'});

test('one actual harvest produces a private recap on return to the map with valid council and city actions',()=>{
  const waiting=harvest();
  assert.deepEqual(previousTurnResults(view(waiting),'en'),[]);
  const s=applyAction(waiting,1,{type:'end'}),v=view(s);
  const rows=previousTurnResults(v,'en');
  assert.equal(rows.length,3);
  const unit=rows.find(r=>r.detail==='Unit deployed · <Cedar>');
  assert.ok(unit);
  assert.equal(unit.next.kind,'production');
  assert.equal(unit.next.id,s.cities[0].id);
  assert.deepEqual(rows.map(r=>r.next.kind).sort(),['civics','production','research']);
  const chinese=previousTurnResults(v,'zh-CN');
  assert.ok(chinese.some(r=>r.detail==='新单位已部署 · <Cedar>'));
  assert.ok(chinese.some(r=>r.detail==='科技已完成'));
  const selected=applyAction(s,0,{type:'research',item:getResearchOptions(s,0).find(o=>o.enabled).item});
  assert.equal(previousTurnResults(view(selected),'en').find(r=>r.detail==='Technology completed').next,undefined);
});

test('exclude enemy, current-round, and unconfirmed events even on reconnect',()=>{
  const s=applyAction(harvest(),1,{type:'end'}),v=view(s),before=previousTurnResults(v,'en');
  const log=v.state.log;
  const marker=log.findIndex(e=>e.type==='end' && e.seat===0 && e.round===1);
  log.splice(marker,0,{type:'complete',seat:1,round:1,item:'granary',text:'SECRET'});
  log.push({type:'complete',seat:0,round:2,item:'granary'},{type:'discovery',seat:0,round:1,item:'industry'});
  assert.deepEqual(previousTurnResults(v,'en'),before);
  const noMarker={...v,state:{...v.state,log:log.filter(e=>e.type!=='end' || e.seat!==0)}};
  assert.deepEqual(previousTurnResults(noMarker,'en'),[]);
});
