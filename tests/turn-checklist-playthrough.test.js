import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as rules from '../docs/rules.js';

test('a solo player founds, chooses both councils and production, then moves or skips every scout',()=>{
  const seat=0;
  let state=rules.createGame([{name:'Player'}],'la',{seed:624101,mapSize:'large',practice:true});
  const play=action=>{state=rules.applyAction(state,seat,action);};
  const view=()=>rules.campaignView(state,seat);
  const tasks=()=>rules.getPendingTurnTasks(view(),seat);
  const end=()=>play({type:'end',requireReady:true});
  const founder=state.units[0];
  assert.deepEqual(tasks().map(task=>task.id),[founder.id]);
  play({type:'found',unit:founder.id});
  assert.deepEqual(tasks().map(task=>task.kind),['research','civics','production']);
  const city=state.cities[0];
  function plan() {
    for(const task of tasks()) {
      if(task.kind==='research') play({type:'research',item:rules.getResearchOptions(view(),seat).find(row=>row.enabled).item});
      if(task.kind==='civics') play({type:'civic',item:rules.getCivicOptions(view(),seat).find(row=>row.enabled).item});
      if(task.kind==='production') play({type:'produce',city:task.id,item:'scout'});
    }
  }
  while(state.units.length<2 && state.round<=12) {
    plan();
    for(const task of tasks()) {
      assert.equal(task.kind,'unit');
      play({type:'skipUnit',unit:task.id});
    }
    assert.deepEqual(tasks(),[]);
    end();
  }
  assert.ok(state.cities.find(c=>c.id===city.id));
  plan();
  const [scout,other]=tasks().filter(task=>task.kind==='unit');
  assert.ok(scout && other,'both trained scouts should have a fresh turn');
  const firstStep=rules.getUnitOptions(view(),scout.id).moves[0];
  assert.ok(firstStep);
  play({type:'move',unit:scout.id,tile:firstStep});
  assert.ok(tasks().some(task=>task.id===other.id));
  assert.throws(end);
  for(const task of tasks()) play({type:'skipUnit',unit:task.id});
  const round=state.round;
  end();
  assert.equal(state.round,round+1);
  assert.ok(tasks().some(task=>task.id===other.id));
});
