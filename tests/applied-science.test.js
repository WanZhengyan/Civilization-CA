import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createClassicGame} from './classic-game.js';
import {applyAction, campaignView, getCityYield, getResearchOptions, getMap, getRouteDetail, neighbors, UNIT_TYPES} from '../docs/rules.js';
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

test('mapping speeds scout travel through foothills without expanding the owner’s visible map',()=>{
  let state=learn(fundedCampaign(),'civics');
  const map=getMap(state);
  const hill=map.tiles.find(t=>t.terrain==='hills' && neighbors(t.id).some(id=>map.byId[id]?.terrain==='plains'));
  const start=neighbors(hill.id).find(id=>map.byId[id]?.terrain==='plains');
  const unit={...state.units[0],type:'scout',tile:start,moves:3,maxMoves:3};
  state.units=[unit];
  state.cities=[];
  for(const id of Object.keys(state.board)) state.board[id]={owner:null,level:0};
  const before=[...getVisibleTiles(state,0)].sort();
  assert.equal(getRouteDetail(state,unit.id,hill.id).cost,2);
  state=learn(state,'cartography');
  assert.deepEqual(campaignView(state,0).intel.visible.sort(),before);
  assert.equal(campaignView(state,1).intel.visible.length,0);
  assert.equal(campaignView(state,1).players[0].technologies,undefined);
  for (const [type,cost] of [['scout',1],['cavalry',1],['melee',2]]) {
    state.units[0].type=type;
    assert.equal(getRouteDetail(campaignView(state,0),unit.id,hill.id).cost,cost);
    const walked=applyAction(state,0,{type:'move',unit:unit.id,tile:hill.id});
    assert.equal(walked.units[0].moves,3-cost);
    assert.equal(walked.units[0].tile,hill.id);
  }
});

test('the council can explain every applied technology in both languages',()=>{
  const state=fundedCampaign();
  for(const [key,project] of Object.entries(appliedScience)) {
    const option=getResearchOptions(state,0).find(item=>item.item===key);
    assert.ok(option.locked && option.requires.length);
    for(const text of [project.name,project.description,option.reason]) assert.notEqual(translate(text,'zh-CN'),text);
  }
});

test('two-sided railway crossings use one movement only between friendly ends',()=>{
  let state=createClassicGame(['West','East'],'sf');
  state.players[0].science=200;
  for(const id of ['industry','steam','civics','cartography','railways']) state=learn(state,id);
  const bridge=getMap(state).crossings[0], unit=state.units.find(u=>u.seat===0 && u.type==='melee');
  unit.tile=bridge.a;
  state.board[bridge.a].owner=0;
  state.board[bridge.b].owner=null;
  assert.equal(getRouteDetail(state,unit.id,bridge.b).cost,2);
  state.board[bridge.b].owner=0;
  assert.equal(getRouteDetail(state,unit.id,bridge.b).cost,1);
  const next=applyAction(state,0,{type:'move',unit:unit.id,tile:bridge.b});
  assert.equal(next.units.find(u=>u.id===unit.id).moves,unit.moves-1);
});

test('sea charts and field medicine refresh units on their own turn',()=>{
  let state=fundedCampaign();
  for(const id of ['navigation','hydrography','agronomy','tactics','fieldMedicine']) state=learn(state,id);
  const soldier=state.units.find(u=>u.seat===0 && u.type==='melee');
  soldier.tile='11,8';soldier.hp=45;
  const boat={...soldier,type:'workboat',id:'fishers',tile:'2,9',hp:35,maxHp:60,maxMoves:UNIT_TYPES.workboat.moves,moves:0};
  state.units.push(boat);
  const expected=boat.maxMoves+1;
  state=applyAction(state,0,{type:'end'});
  assert.equal(state.units.find(u=>u.id==='fishers').moves,0);
  state=applyAction(state,1,{type:'end'});
  const ship=state.units.find(u=>u.id==='fishers');
  assert.equal(ship.moves,expected);
  assert.equal(ship.maxMoves,expected);
  assert.equal(state.units.find(u=>u.id===soldier.id).hp,51);
  assert.equal(ship.hp,35);
});

test('a functioning radar berth reveals sea approaches only to its owner',()=>{
  let state=fundedCampaign();
  state.cities[0].buildings.push('harbor');
  state.cities[0].portTile='3,10';
  for(const id of ['navigation','hydrography','industry','steam','radio']) state=learn(state,id);
  const enemyBefore=campaignView(state,1).intel.visible;
  const seaApproach='0,11';
  assert.ok(!getVisibleTiles(state,0).has(seaApproach));
  state=learn(state,'radar');
  assert.ok(campaignView(state,0).intel.visible.includes(seaApproach));
  assert.deepEqual(campaignView(state,1).intel.visible,enemyBefore);
  state.cities[0].buildings=[];
  assert.ok(!getVisibleTiles(state,0).has(seaApproach));
});

test('research links follow real prerequisites and formation requirements',async()=>{
  const {researchLinks}=await import('../docs/research-catalog.js');
  const options=getResearchOptions(fundedCampaign(),0);
  const links=researchLinks('steam',options,UNIT_TYPES);
  assert.ok(links.discoveries.includes('District Railways'));
  assert.ok(links.formations.includes('Field Artillery'));
  assert.ok(researchLinks('hydrography',options,UNIT_TYPES).discoveries.includes('Coastal Radar'));
});

test('governors choose for their own economy and ignore a remote rival economy',async()=>{
  const {chooseBotAction}=await import('../docs/rules.js');
  let state=learn(fundedCampaign(),'industry');
  state.board['10,7']={owner:1,level:1,resource:'iron',improvement:'mine'};
  assert.notEqual(chooseBotAction(state).item,'metallurgy');
  state.board['10,7'].owner=0;
  assert.equal(chooseBotAction(state).item,'metallurgy');
  state=learn(state,'metallurgy');
  state.cities[0].buildings.push('harbor');
  assert.equal(chooseBotAction(state).item,'navigation');
  state=learn(state,'navigation');
  assert.equal(chooseBotAction(state).item,'hydrography');
});
