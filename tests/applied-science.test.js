import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createClassicGame} from './classic-game.js';
import {applyAction, campaignView, getCityYield, getResearchOptions} from '../docs/rules.js';
import {getVisibleTiles} from '../docs/vision.js';
import {translate} from '../docs/i18n.js';
import {appliedScience} from '../docs/applied-science.js';

function fundedCampaign() {
  const state=createClassicGame(['West','East']);
  state.players[0].science=200;
  return state;
}
const learn=(state,item)=>applyAction(state,0,{type:'research',item});

test('crop and mineral discoveries pay only for working, connected sites',()=>{
  let state=fundedCampaign();
  const city=state.cities[0].id;
  const fields=['10,7','11,8'];
  for(const id of fields) assert.equal(state.board[id].owner,0);
  Object.assign(state.board[fields[0]],{resource:'citrus',improvement:'orchard'});
  Object.assign(state.board[fields[1]],{resource:'iron',improvement:'mine'});
  state=learn(learn(state,'agronomy'),'industry');
  const before=getCityYield(state,city);
  state=learn(learn(state,'agriculturalScience'),'metallurgy');
  assert.equal(getCityYield(state,city).food,before.food+1);
  assert.equal(getCityYield(state,city).production,before.production+2);
  state.board[fields[1]].pillaged=true;
  const inactive=getCityYield(state,city).production;
  state.players[0].technologies=state.players[0].technologies.filter(key=>key!=='metallurgy');
  assert.equal(getCityYield(state,city).production,inactive);
});

test('mapping reveals the outer ring just to the civilization that made the discovery',()=>{
  let state=fundedCampaign();
  state.units=[{...state.units[0],type:'scout',tile:'8,6'}];
  state.cities=[];
  for(const id of Object.keys(state.board)) state.board[id]={owner:null,level:0};
  state=learn(state,'civics');
  const before=getVisibleTiles(state,0);
  assert.equal(before.size,37);
  state=learn(state,'cartography');
  assert.equal(getVisibleTiles(state,0).size,61);
  assert.equal(campaignView(state,0).intel.visible.length,61);
  assert.equal(campaignView(state,1).intel.visible.length,0);
  assert.equal(campaignView(state,1).players[0].technologies,undefined);
});

test('the council can explain every applied technology in both languages',()=>{
  const state=fundedCampaign();
  for(const [key,project] of Object.entries(appliedScience)) {
    const option=getResearchOptions(state,0).find(item=>item.item===key);
    assert.ok(option.locked && option.requires.length);
    for(const text of [project.name,project.description,option.reason]) assert.notEqual(translate(text,'zh-CN'),text);
  }
});
