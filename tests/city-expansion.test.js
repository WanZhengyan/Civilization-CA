import {test} from 'node:test';
import assert from 'node:assert/strict';
import {borderBudget} from '../docs/city-expansion.js';

test('each resident contributes a point; old cities start with zero progress', () => {
  assert.deepEqual(borderBudget({population:2}), {progress:0, rate:2, required:8, turns:4});
  assert.equal(borderBudget({population:4, borderProgress:5}).turns, 1);
});

import {borderParcels} from '../docs/city-expansion.js';
import {createGame, applyAction, getMap, hexDistance} from '../docs/rules.js';
function founded(mapId='la',mapSize='standard',seed=21895) {
  const setup=createGame([{name:'West'},{name:'East'}],mapId,{seed,mapSize});
  return applyAction(setup,0,{type:'found',unit:setup.units.find(u=>u.seat===0).id});
}
test('the frontier follows contiguous friendly land and stops after three steps', () => {
  const s=founded(), c=s.cities[0], map=getMap(s), parcels=borderParcels(s,c,map);
  assert.ok(parcels.length>0);
  for(const {id,distance} of parcels) {
    assert.equal(s.board[id].owner,null);
    assert.ok(distance<=3 && hexDistance(c.tile,id)<=distance);
    assert.ok(map.neighbors(id).some(n=>s.board[n].owner===0));
  }
  for(const id of map.neighbors(c.tile))s.board[id]={...s.board[id],owner:1};
  assert.deepEqual(borderParcels(s,c,map),[]);
});

import {getCityExpansion} from '../docs/rules.js';
test('the report nominates one deterministic next parcel and distinguishes a blocked frontier', () => {
  const s=founded(), c=s.cities[0];
  assert.deepEqual(getCityExpansion(s,c.id),getCityExpansion(JSON.parse(JSON.stringify(s)),c.id));
  assert.equal(getCityExpansion(s,'unknown'),null);
  for(const id of getMap(s).neighbors(c.tile))s.board[id]={...s.board[id],owner:1};
  assert.equal(getCityExpansion(s,c.id).tile,null);
  assert.equal(getCityExpansion(s,c.id).turns,null);
});

test('a foreign unit, a barbarian camp and an improved tile cannot be annexed', () => {
  const s=founded(),c=s.cities[0];
  const [first,second,third]=borderParcels(s,c,getMap(s));
  s.units.push({seat:1,tile:first.id});
  s.barbarians.camps.push({type:'camp',tile:second.id});
  s.board[third.id].improvement='farm';
  const ids=borderParcels(s,c,getMap(s)).map(p=>p.id);
  for(const p of [first,second,third])assert.ok(!ids.includes(p.id));
});

import {campaignView} from '../docs/rules.js';
test('the same next tile is reported on the server and own view; rivals have no private estimate', () => {
  const s=founded(), c=s.cities[0];
  s.units.push({...s.units.find(u=>u.seat===1),id:'observer',tile:c.tile});
  const mine=campaignView(s,0), rival=campaignView(s,1);
  assert.deepEqual(getCityExpansion(mine,c.id),getCityExpansion(s,c.id));
  assert.ok(mine.intel.visible.includes(getCityExpansion(s,c.id).tile));
  assert.ok(rival.cities.some(o=>o.id===c.id));
  assert.equal(getCityExpansion(rival,c.id),null);
  const visible=new Set([c.tile]);
  assert.deepEqual(borderParcels(s,c,getMap(s),visible),[]);
});

test('ending the city turn annexes the forecast parcel, preserves its deposit and charges no district order', () => {
  const s=founded(), c=s.cities[0]; c.borderProgress=7;
  const report=getCityExpansion(s,c.id), tile=report.tile;
  s.board[tile].resource='grain';
  const before=Object.values(s.board).filter(b=>b.owner===0).length;
  const after=applyAction(s,0,{type:'end'});
  assert.equal(after.board[tile].owner,0); assert.equal(after.board[tile].resource,'grain');
  assert.equal(after.cities[0].borderProgress,0); assert.equal(after.cities[0].borderClaims,1);
  assert.equal(Object.values(after.board).filter(b=>b.owner===0).length,before+1);
  assert.equal(s.board[tile].owner,null);
});

test('successive surveys increase in cost up to a fixed ceiling; a metropolis gains at most one tile in a turn', () => {
  assert.equal(borderBudget({population:6,borderClaims:1}).required,10);
  assert.equal(borderBudget({population:6,borderClaims:50}).required,16);
  const s=founded(), c=s.cities[0];c.population=50;
  const before=Object.values(s.board).filter(t=>t.owner===0).length;
  const next=applyAction(s,0,{type:'end'});
  assert.equal(Object.values(next.board).filter(t=>t.owner===0).length-before,1);
  assert.ok(next.cities[0].borderProgress<getCityExpansion(next,c.id).required);
});

import {getCityExpansions} from '../docs/rules.js';
test('nearby cities receive distinct nominations from one turn snapshot', () => {
  const s=founded(), c=s.cities[0], plaza=getMap(s).neighbors(c.tile).find(id=>s.board[id].owner===0);
  s.cities.push({...c,id:'sister',tile:plaza,originalSeat:null,borderProgress:7});
  c.borderProgress=7;
  const reports=getCityExpansions(s,0), nominations=[...reports.values()].map(p=>p.tile);
  assert.equal(new Set(nominations).size,2);
  const next=applyAction(s,0,{type:'end'});
  for(const id of nominations)assert.equal(next.board[id].owner,0);
});

import {translate} from '../docs/i18n.js';
test('annexations enter the owner’s journal while hidden rivals learn neither tile nor city', () => {
  const s=founded(), c=s.cities[0];c.borderProgress=7;
  const next=applyAction(s,0,{type:'end'});
  const article=campaignView(next,0).log.find(e=>e.type==='border');
  assert.equal(article.city,c.id);
  assert.equal(article.tile,getCityExpansion(s,c.id).tile);
  assert.notEqual(translate(article.text,'zh-CN'),article.text);
  assert.ok(!campaignView(next,1).log.some(e=>e.type==='border'));
});

test('capture clears former-owner progress; a closed border banks no invisible growth', () => {
  const s=founded(), c=s.cities[0], map=getMap(s);
  c.borderProgress=5;
  for(const id of map.neighbors(c.tile))s.board[id]={...s.board[id],owner:1};
  const closed=applyAction(s,0,{type:'end'});
  assert.equal(closed.cities[0].borderProgress,5);
  const ground=map.neighbors(c.tile).find(id=>!['ocean','mountains'].includes(map.byId[id].terrain));
  closed.units.push({id:'raider',type:'melee',seat:1,tile:ground,hp:100,maxHp:100,moves:2,maxMoves:2});
  closed.cities[0].hp=1;
  const taken=applyAction(closed,1,{type:'attack',unit:'raider',tile:c.tile});
  assert.equal(taken.cities[0].seat,1);assert.equal(taken.cities[0].borderProgress,0);
  assert.ok(!Object.hasOwn(campaignView(taken,0).cities.find(t=>t.id===c.id)||{},'borderProgress'));
});

import {borderSummary} from '../docs/border-summary.js';
test('private city planning names the parcel, expense and blocked state with bilingual labels', () => {
  const s=founded(),c=s.cities[0],report=getCityExpansion(s,c.id);
  const summary=borderSummary(report,{name:'San Francisco'},String);
  assert.match(summary,/Border expansion/); assert.match(summary,/San Francisco/);assert.match(summary,/Points per turn/);
  assert.match(borderSummary({...report,tile:null,turns:null},null,String),/Frontier blocked/);
  assert.equal(borderSummary(null,null,String),'');
  for(const key of ['Border expansion','Frontier blocked','Border progress','Next district','Points per turn'])
    assert.notEqual(translate(key,'zh-CN'),key);
});

import {planCityLabels} from '../docs/city-labels.js';
import {chartViewport} from '../docs/hex-survey.js';
test('nameplate measures the resident countdown, never attaching it to a rival', () => {
  const s=founded(),city=s.cities[0],map=getMap(s), enemy={...city,id:'rival',seat:1};
  const plan=(town,forecasts,width=1800)=>planCityLabels({cities:[town],byId:new Map(map.tiles.map(t=>[t.id,t])),seat:0,
    view:chartViewport(width,800),project:()=>[width/2,300],scale:1,unitBoxes:[],measure:t=>t.length*7,forecasts})[0];
  const forecasts=new Map([[city.id,{turns:2}],[enemy.id,{turns:3}]]);
  assert.equal(plan(city,forecasts).border,'2'); assert.equal(plan(enemy,forecasts).border,'');
  const normal=plan(city,new Map()).box,shown=plan(city,forecasts).box;
  assert.ok(shown[2]-shown[0] > normal[2]-normal[0]);
  assert.equal(plan(city,new Map([[city.id,{turns:null}]])).border,'–');
  const small=plan({...city,name:'长地名'.repeat(30)},forecasts,120);
  assert.ok(small.box && small.box[0]>=0 && small.box[2]<=120 && small.text.endsWith('…'));
});

test('locating a forecast is available only when a specific site exists', () => {
  const s=founded(), report=getCityExpansion(s,s.cities[0].id);
  assert.match(borderSummary(report,getMap(s).byId[report.tile],String),new RegExp('data-frontier-tile="'+report.tile+'"'));
  assert.ok(!borderSummary({...report,tile:null,turns:null},null,String).includes('data-frontier-tile'));
  assert.notEqual(translate('Locate next district','zh-CN'),'Locate next district');
});

test('coastal and inland forecasts survive save reload and observed occupancy across region sizes', () => {
  for(const mapId of ['la','sf','sd'])for(const size of ['standard','large','grand','epic']){
    const initial=founded(mapId,size,413); const c=initial.cities[0], map=getMap(initial);
    const work=JSON.parse(JSON.stringify(initial));
    work.cities[0].borderProgress=7;
    const forecast=getCityExpansion(work,c.id);
    assert.ok(forecast.tile,size+' '+mapId);
    assert.ok(!['ocean','mountains'].includes(map.byId[forecast.tile].terrain));
    assert.deepEqual(forecast,getCityExpansion(campaignView(work,0),c.id));
    const a=applyAction(work,0,{type:'end'}), b=applyAction(JSON.parse(JSON.stringify(work)),0,{type:'end'});
    assert.deepEqual(a,b);
    assert.equal(a.board[forecast.tile].owner,0);
  }
});

test('allies expand once per ready order even when the later seat finishes first', () => {
  let state=createGame(['Oak','Palm','Cedar'],'sf',{seed:21895,teams:[0,0,1],simultaneousTeams:true});
  for (const seat of [0,1]) {
    state=applyAction(state,seat,{type:'found',unit:state.units.find(u=>u.seat===seat).id});
  }
  for (const city of state.cities) city.borderProgress=7;
  const [first,second]=state.cities.map(c=>getCityExpansion(state,c.id).tile);
  state=applyAction(state,1,{type:'end'});
  assert.equal(state.board[second].owner,1);
  assert.equal(state.board[first].owner,null);
  assert.throws(()=>applyAction(state,1,{type:'end'}));
  state=applyAction(state,0,{type:'end'});
  assert.equal(state.board[first].owner,0);
  assert.equal(state.cities.find(c=>c.seat===1).borderClaims,1);
  assert.equal(state.log.filter(e=>e.type==='border').length,2);
});
