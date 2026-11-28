import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAction,campaignView,createGame,getUnitOptions,getSettlementAssessment,hexDistance} from '../docs/rules.js';
import {cityReports,compareCities} from '../docs/city-directory.js';

test('city comparisons use the same food, housing, production and time as a playable two-city opening',()=>{
  let s=createGame([{name:'Governor',civilization:'republic'}],'sf',{mapSize:'large',seed:624102,practice:true});
  const act=order=>{s=applyAction(s,0,order);};
  act({type:'found',unit:s.units[0].id});
  act({type:'research',item:'industry'});
  act({type:'civic',item:'charter'});
  for(let i=0;i<12 && s.cities[0].population<3;i++)act({type:'end'});
  assert.equal(s.cities[0].population,3);
  const capital=s.cities[0];
  act({type:'produce',city:capital.id,item:'settler'});
  for(let i=0;i<12 && !s.units.some(u=>u.type==='settler');i++)act({type:'end'});
  const settler=s.units.find(u=>u.type==='settler').id;
  for(let n=0;n<12 && s.cities.length<2;n++){
    const options=getUnitOptions(s,settler), position=s.units.find(u=>u.id===settler).tile;
    if(options.canFound){act({type:'found',unit:settler});break;}
    const dest=options.moves.filter(id=>hexDistance(capital.tile,id)>hexDistance(capital.tile,position))
      .sort((a,b)=>Number(getSettlementAssessment(s,settler,b).status!=='invalid')-Number(getSettlementAssessment(s,settler,a).status!=='invalid') || hexDistance(capital.tile,b)-hexDistance(capital.tile,a))[0];
    act(dest ? {type:'move',unit:settler,tile:dest} : {type:'end'});
  }
  assert.equal(s.cities.length,2);
  const second=s.cities[1];
  act({type:'produce',city:second.id,item:'ranged'});
  const view=campaignView(s,0),rows=cityReports(view,0);
  assert.deepEqual(cityReports(view,1),[]);
  assert.deepEqual(compareCities(rows,'all','slow').map(r=>r.id),[second.id,capital.id]);
  assert.deepEqual(compareCities(rows,'all','production').map(r=>r.id),[capital.id,second.id]);
  assert.deepEqual(compareCities(rows,'all','needs').map(r=>r.id),[capital.id,second.id]);
  assert.deepEqual(compareCities(rows,'full','needs').map(r=>r.id),[capital.id]);
  assert.deepEqual(compareCities(rows,'idle','needs').map(r=>r.id),[capital.id]);
  assert.equal(compareCities(rows,'deficit','needs').length,0);
  const row=rows.find(r=>r.id===second.id);
  assert.equal(row.turns,3);
  assert.equal(row.production,5);
  act({type:'end'});
  assert.equal(s.cities.find(c=>c.id===second.id).queue.progress,row.production);
});
