import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAction,createGame,campaignView,getCitizenWorkforce} from '../docs/rules.js';
import {advisorReport} from '../docs/advisors.js';

const start=()=>createGame([{name:'Planner',civilization:'arroyo'}],'la',{seed:624101,practice:true});
const capital=()=>{const s=start();return applyAction(s,0,{type:'found',unit:s.units[0].id});};
const read=(s,lang='en')=>advisorReport(campaignView(s,0),0,lang);
test('the food desk quotes actual worker assignments and accepts only the requesting seat’s chart',()=>{
  const s=capital(),city=s.cities[0];city.population=3;city.focus='science';city.food=0;
  const v=campaignView(s,0),food=getCitizenWorkforce(v,city.id,'food').yields;
  assert.deepEqual(advisorReport(s,0),[]);
  assert.deepEqual(advisorReport(v,1),[]);
  const card=read(s).find(r=>r.desk==='food');assert.ok(card);assert.equal(card.link.city,city.id);
  assert.ok(food.food>getCitizenWorkforce(v,city.id).yields.food);
  assert.match(read(s,'zh-CN').find(r=>r.desk==='food').detail,/粮食/);
});
