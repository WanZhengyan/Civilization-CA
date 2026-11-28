import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAction, campaignView, createGame, getStats} from '../docs/rules.js';
import {councilInvestments, incomeHorizon} from '../docs/council-investment.js';

test('a city investment quotes a legal parcel and the gain paid on the next harvest after opening',()=>{
  let state=createGame([{name:'Governor',civilization:'republic'}],'sf',{mapSize:'large',seed:624102,practice:true});
  const action=order=>{state=applyAction(state,0,order);};
  action({type:'found',unit:state.units[0].id});
  action({type:'research',item:'industry'});
  action({type:'civic',item:'charter'});
  for(let n=0;n<3;n++)action({type:'end'});
  const view=campaignView(state,0), all=councilInvestments(view,0);
  assert.deepEqual(councilInvestments(view,1),[]);
  const quote=all.find(q=>q.item==='stanford');
  assert.ok(quote);
  assert.ok(!all.some(q=>q.item==='workshop' || q.item==='caltech'));
  let control=state;
  const bank=state.players[0].science;
  action({type:'produce',item:quote.item,city:quote.city,site:quote.site});
  assert.equal(state.players[0].science,bank);
  for(let n=0;n<quote.turns;n++){
    control=applyAction(control,0,{type:'end'});
    action({type:'end'});
  }
  assert.ok(state.cities[0].buildings.includes(quote.item));
  assert.equal(getStats(state,0).scienceIncome,getStats(control,0).scienceIncome+quote.science);
  const nextIncome=getStats(state,0).scienceIncome, nextBank=state.players[0].science;
  action({type:'end'});
  assert.equal(state.players[0].science-nextBank,nextIncome);
});

test('the building cannot accelerate earlier income during construction',()=>{
  assert.equal(incomeHorizon(48,2),24);
  assert.equal(incomeHorizon(48,2,2,4),14);
  assert.equal(incomeHorizon(6,2,3,4),3);
  assert.equal(incomeHorizon(6,0),null);
  assert.equal(incomeHorizon(6,0,3,4),6);
  assert.equal(incomeHorizon(0,0),0);
});
