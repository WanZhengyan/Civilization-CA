import test from 'node:test';
import assert from 'node:assert/strict';
import {getCitizenWorkforce,createGame,getCityYield,getStats,applyAction,getMap,neighbors} from '../docs/rules.js';
import {assignWorkforce} from '../docs/workforce.js';

test('each citizen works once; governor picks a controlled farm, hill or research district',()=>{
  const tiles=['plains','hills','urban'].map((terrain,i)=>({id:''+i,name:terrain,terrain}));
  const city={population:1};
  assert.deepEqual(assignWorkforce(city,tiles,'food').yields,{food:3,production:0,science:0});
  assert.deepEqual(assignWorkforce(city,tiles,'industry').yields,{food:0,production:3,science:0});
  assert.deepEqual(assignWorkforce(city,tiles,'science').yields,{food:0,production:1,science:2});
  const crowded=assignWorkforce({population:8},tiles,'food');
  assert.equal(crowded.workedTiles.reduce((sum,w)=>sum+w.workers,0),8);
  assert.equal(crowded.eligibleTiles.length,3);
});
test('focus is an owner order and affects the actual research budget; foreign or contested land cannot be worked',()=>{
  let s=createGame([{name:'A'},{name:'B'}],'la',{seed:1258});
  if(!s.cities.length)s=applyAction(s,0,{type:'found',unit:s.units.find(u=>u.seat===0).id});
  const c=s.cities.find(c=>c.seat===0);
  for (const n of neighbors(c.tile)) s.board[n]={...s.board[n],owner:null};
  const tileId=neighbors(c.tile).find(id=>['urban','plains','coast','hills','forest'].includes(getMap(s).byId[id].terrain));
  s.board[tileId]={...s.board[tileId],owner:0};
  assert.equal(getCitizenWorkforce(s,c.id).eligibleTiles.some(t=>t.id===tileId),true);
  const industry=applyAction(s,0,{type:'focus',city:c.id,item:'industry'});
  const science=applyAction(s,0,{type:'focus',city:c.id,item:'science'});
  assert.ok(getStats(science,0).scienceIncome>=getStats(industry,0).scienceIncome);
  assert.ok(getCityYield(industry,c.id).production>=getCityYield(science,c.id).production);
  const next=applyAction(science,0,{type:'end'});
  assert.equal(next.players[0].science-science.players[0].science,getStats(science,0).scienceIncome);
  assert.throws(()=>applyAction(next,1,{type:'focus',city:c.id,item:'science'}));
  assert.throws(()=>applyAction(s,0,{type:'focus',city:c.id,item:'hidden'}));
  s.board[tileId]={...s.board[tileId],owner:1};
  assert.ok(!getCitizenWorkforce(s,c.id).eligibleTiles.some(t=>t.id===tileId));
});
