import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAction,campaignView,createGame,getMap} from '../docs/rules.js';
import {surveyLayer} from '../docs/campaign-lenses.js';
const fresh=()=>createGame([{name:'Planner',civilization:'arroyo'}],'la',{seed:624101,practice:true});
function capital(){
  const start=fresh();return applyAction(start,0,{type:'found',unit:start.units[0].id});
}
test('a survey paints only projected memories, separating current sight and uncharted hexes',()=>{
  const raw=fresh(),state=campaignView(raw,0),tile=state.intel.visible[0];
  assert.equal(surveyLayer(raw,0,'survey').size,0);
  assert.equal(surveyLayer(state,1,'survey').size,0);
  const visible=surveyLayer(state,0,'survey');
  assert.equal(visible.get(tile).band,0);
  assert.equal(visible.size,state.intel.explored.length);
  const memory={...state,intel:{...state.intel,visible:[]}};
  assert.equal(surveyLayer(memory,0,'survey').get(tile).band,1);
});

test('potential quotes the food, production and science of a real eligible job',async()=>{
  const {getCitizenWorkforce}=await import('../docs/rules.js'),s=campaignView(capital(),0);
  const rows=surveyLayer(s,0,'land'),work=getCitizenWorkforce(s,s.cities[0].id);
  assert.ok(work.eligibleTiles.length);
  for(const job of work.eligibleTiles)assert.equal(rows.get(job.id).rank,job.output.reduce((a,b)=>a+b,0));
});

test('work assignments agree with current city workforce and do not list rival cities',async()=>{
  const {getCitizenWorkforce}=await import('../docs/rules.js'),s=campaignView(capital(),0),c=s.cities[0];
  const rows=surveyLayer(s,0,'jobs'),work=getCitizenWorkforce(s,c.id);
  assert.equal(rows.get(c.tile).band,0);
  assert.deepEqual([...rows].filter(([,r])=>r.band===2).map(([id])=>id).sort(),work.workedTiles.filter(j=>!j.specialist).map(j=>j.id).sort());
});

test('three alternate focus maps show exact marginal yields without changing an order',async()=>{
  const {getCitizenWorkforce}=await import('../docs/rules.js'),s=campaignView(capital(),0),c=s.cities[0],snap=JSON.stringify(s);
  for(const focus of ['food','industry','science']){
    const projected=getCitizenWorkforce(s,c.id,focus),active=getCitizenWorkforce(s,c.id);
    const next=surveyLayer(s,0,'focus-'+focus),gain=['food','production','science'].reduce((a,k)=>a+Math.abs(projected.yields[k]-active.yields[k]),0);
    assert.equal(next.get(c.tile).rank,gain);
  } assert.equal(JSON.stringify(s),snap);
});

test('supply map hides unsurveyed resources and names the matching site improvement',()=>{
  const s=campaignView(capital(),0),id=s.cities[0].tile;
  s.board[id]={...s.board[id],owner:0,resource:'iron',improvement:null};
  assert.match(surveyLayer(s,0,'supply').get(id).en,/Mine/);
  s.board[id].improvement='mine';
  assert.match(surveyLayer(s,0,'supply').get(id).en,/1 good/);
  assert.equal(surveyLayer(campaignView(fresh(),0),0,'supply').size,0);
});

test('city frontier marks the authoritative next annexation and quotes influence and wait',async()=>{
  const {getCityExpansions,getBorderCharter}=await import('../docs/rules.js'),s=campaignView(capital(),0),c=s.cities[0];
  const report=getCityExpansions(s,0).get(c.id),quote=getBorderCharter(s,0,c.id);
  assert.ok(report.tile);
  const row=surveyLayer(s,0,'borders').get(report.tile);
  assert.equal(row.band,quote.enabled?2:1);assert.ok(row.en.includes(report.turns+' turns'));
  assert.ok(row.en.includes(quote.cost+' influence'));
});
