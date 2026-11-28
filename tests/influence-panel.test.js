import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,applyAction,campaignView,getMap} from '../docs/rules.js';
import {influencePanelModel,influencePanelHtml} from '../docs/influence-panel.js';

function opening(){
  return createGame([{name:'West'},{name:'East'}],'la',{seed:21895,mapSize:'standard'});
}
function panel(state,lang='en',extra={}){
  return influencePanelModel({state:campaignView(state,0),seat:0,...extra},lang);
}

test('the opening explains how to spend starting influence and why income is zero',()=>{
  const model=panel(opening(),'zh-CN'),html=influencePanelHtml(model,'zh-CN');
  assert.equal(model.balance,6);
  assert.equal(model.rate,0);
  assert.match(html,/先建立首都/);
  assert.match(html,/建立首都后开始获得影响力/);
  assert.match(html,/第一次颁布政策免费/);
  assert.match(html,/查看影响力收入来源/);
  assert.equal(model.cards.find(c=>c.id==='mission').options.length,0);
});

test('a priced expansion targets the same district as the rules and reports its effects',()=>{
  const start=opening();
  const state=applyAction(start,0,{type:'found',unit:start.units.find(u=>u.seat===0).id});
  const model=panel(state),card=model.cards.find(c=>c.id==='border'),q=card.selected;
  assert.equal(card.reason,'');
  assert.equal(q.cost,6);
  assert.equal(q.tile,q.action.tile);
  assert.match(q.detail,/\d+ \/ \d+/);
  assert.match(q.detail,/0\/8 to 0/);
  assert.match(influencePanelHtml(model,'en'),/0 influence left after spending/);
  const after=applyAction(state,0,q.action),next=panel(after);
  assert.equal(next.balance,0);
  assert.equal(after.board[q.tile].owner,0);
  assert.match(next.cards[0].reason,/already expanded/);
  assert.equal(panel(state,'zh-CN',{busy:true}).cards[0].reason,'正在同步指令…');
});

test('the panel excludes foreign and hidden targets, escapes city names and honors older rooms',()=>{
  const start=opening();
  const state=applyAction(start,0,{type:'found',unit:start.units.find(u=>u.seat===0).id});
  state.cities[0].name='<New town>';
  const projected=campaignView(state,0);
  delete projected.intel.borderCharters;
  const hidden=getMap(state).tiles.find(tile=>!projected.intel.visible.includes(tile.id));
  projected.board[hidden.id]={owner:1,level:0};
  const model=influencePanelModel({state:projected,seat:0},'en');
  assert.match(model.cards[0].reason,/does not support/);
  assert.ok(model.cards.find(c=>c.id==='contest').options.every(o=>o.tile!==hidden.id));
  const html=influencePanelHtml(model,'en');
  assert.match(html,/&lt;New town&gt;/);
  assert.doesNotMatch(html,/<New town>/);
});
