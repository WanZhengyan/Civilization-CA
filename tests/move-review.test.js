import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,campaignView,getUnitOptions,applyAction} from '../docs/rules.js';
import {previewMove,sameMove,reviewPointerMove} from '../docs/move-review.js';
import {translate} from '../docs/i18n.js';

function opening() {
  const state=createGame([{name:'Review'}],'la',{seed:30,mapSize:'large',practice:true});
  const seat=0,view=campaignView(state,seat),unit=view.units[0];
  return {state,seat,view,unit};
}

test('touch and compact pointer orders preview; desktop mouse and arrow-key orders stay direct',()=>{
  for(const compact of [true,false]){
    assert.equal(reviewPointerMove('keyboard',compact),false);
    assert.equal(reviewPointerMove('touch',compact),true);
    assert.equal(reviewPointerMove('pen',compact),true);
    assert.equal(reviewPointerMove('mouse',compact),compact);
  }
});
test('an uncommitted move is read-only and its quote agrees with the move that is charged',()=>{
  const {state,seat,unit,view}=opening(), original=JSON.stringify(view);
  const moves=getUnitOptions(view,unit.id).moves;
  assert(moves.length>1);
  const quotes=moves.map(id=>previewMove(view,unit,id));
  assert.equal(JSON.stringify(view),original);
  for(const quote of quotes){
    assert.equal(quote.path[0],unit.tile); assert.equal(quote.path.at(-1),quote.tile);
    const next=applyAction(state,seat,{type:'move',unit:unit.id,tile:quote.tile});
    assert.equal(next.units[0].moves,quote.left);assert.equal(unit.moves-next.units[0].moves,quote.cost);
  }
  assert.equal(sameMove(quotes[0],quotes[1]),false);
  assert.equal(previewMove(view,unit,unit.tile),null);
});
test('a changed round, budget, unit, route or occupied destination invalidates a pending move',()=>{
  const {state,seat,unit,view}=opening(), target=getUnitOptions(view,unit.id).moves[0];
  const before=previewMove(view,unit,target),current=campaignView(state,seat);
  assert(sameMove(before,previewMove(current,current.units[0],target)));
  for(const changed of [{round:before.round+1},{unit:'other'},{left:10},{path:[unit.tile,'elsewhere',target]}]){
    assert.equal(sameMove(before,{...before,...changed}),false);
  }
  current.units.push({...unit,id:'blocking-piece',tile:target});
  assert.equal(sameMove(before,previewMove(current,current.units[0],target)),false);
});
test('naval orders and route budgets are fully translated, including remaining movement of zero',()=>{
  for(const [en,zh] of [['Confirm move','确认移动'],['Cancel','取消'],['Move cost','消耗移动力'],['Remaining movement','剩余移动力'],['Move costs 1 point','移至此处需 1 点移动力'],['0 points left','剩余 0 点移动力'],['Your Naval patrol unit','己方海上巡逻单位'],['Rival Maritime engineering unit','敌方海上工程单位']]){
    assert.equal(translate(en,'en'),en);assert.equal(translate(en,'zh-CN'),zh);
  }
});
