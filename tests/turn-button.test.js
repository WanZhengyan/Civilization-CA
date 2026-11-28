import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAction,campaignView,createGame,getCivicOptions,getResearchOptions} from '../docs/rules.js';
import {paintTurnButton,turnButtonState} from '../docs/turn-button.js';

const opening=()=>createGame([{name:'West'},{name:'East'}],'la',{seed:21895,mapSize:'standard'});
const solo=s=>({state:campaignView(s,0),seat:0,mode:'solo'});
const first=options=>options.find(option=>option.enabled).item;

test('primary control directs each opening decision, then permits an explicit end order',()=>{
  let state=opening();
  const openingTask=turnButtonState(solo(state),'en');
  assert.equal(openingTask.kind,'unit');
  assert.match(openingTask.title,/1 decision left/);
  state=applyAction(state,0,{type:'found',unit:openingTask.task.id});
  const research=turnButtonState(solo(state),'zh-CN');
  assert.deepEqual([research.label,research.count],['选择科技',3]);
  state=applyAction(state,0,{type:'research',item:first(getResearchOptions(state,0))});
  assert.equal(turnButtonState(solo(state),'en').kind,'civics');
  state=applyAction(state,0,{type:'civic',item:first(getCivicOptions(state,0))});
  const production=turnButtonState(solo(state),'zh-CN');
  assert.equal(production.count,1);
  assert.equal(production.task.id,state.cities[0].id);
  assert.match(production.title,/待处理 1 项/);
  state=applyAction(state,0,{type:'produce',city:production.task.id,item:'melee'});
  assert.deepEqual(turnButtonState(solo(state),'en'),{kind:'end',label:'End turn',disabled:false,count:0,checked:true});
});

test('an active allied seat gets its own tasks while ready, disconnected and older rooms keep valid controls',()=>{
  const view=solo(opening());
  view.mode='online';
  const team={team:0,activeSeats:[0,1],readySeats:[]};
  const online={...view,state:{...view.state,turn:1,teamPhase:team},room:{phase:'playing'}};
  assert.equal(turnButtonState(online,'en').kind,'unit');
  assert.equal(turnButtonState({...online,state:{...online.state,teamPhase:{...team,activeSeats:[1],readySeats:[0]}}},'en').label,'Waiting for allies…');
  assert.equal(turnButtonState({...online,busy:true,roomStatus:'Reconnecting…'},'en').disabled,true);
  assert.equal(turnButtonState({...online,room:{phase:'lobby'}},'en').kind,'lobby');
  assert.equal(turnButtonState({...online,state:{...online.state,phase:'finished'}},'en').kind,'standings');
  const intel={...online.state.intel};
  delete intel.turnReadiness;
  assert.deepEqual(turnButtonState({...online,state:{...online.state,intel}},'en'),{kind:'end',label:'Mark ready',disabled:false,count:0,checked:false});
});

test('button painting replaces both the end caption and its accessible name',()=>{
  const state=opening(),label={},count={},button={dataset:{},querySelector:s=>s==='#end-label'?label:count,setAttribute(k,v){this[k]=v}};
  paintTurnButton(button,solo(state));
  assert.equal(label.textContent,'Unit needs orders');
  assert.equal(count.textContent,'1');
  assert.equal(count.hidden,false);
  assert.match(button['aria-label'],/Settler/);
  const after=applyAction(state,0,{type:'skipUnit',unit:state.units[0].id});
  paintTurnButton(button,solo(after));
  assert.equal(count.hidden,true);
  assert.equal(label.textContent,'End turn');
  assert.equal(button['aria-label'],'End turn');
});
