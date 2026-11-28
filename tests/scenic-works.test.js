import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BUILDINGS, SCENIC_WORKS, applyAction, campaignView, createGame, getCityYield, getMap,
  getProductionOptions, getProjectSites, getScenicWorkStatus, getStats, hexDistance, migrateGame
} from '../docs/rules.js';
import {NATURAL_WONDERS} from '../docs/natural-wonders.js';
import {revisionOf} from '../docs/works.js';

const onLand=tile=>!['ocean','mountains'].includes(tile.terrain);
const offers=(state,city,item)=>getProductionOptions(state,city.id,{replace:true}).find(o=>o.item===item);
const cycle=state=>applyAction(applyAction(state,0,{type:'end'}),1,{type:'end'});

function scenario(item,range=1) {
  const {landmark}=SCENIC_WORKS[item];
  const state=createGame(['West','East'],NATURAL_WONDERS[landmark].region,{seed:0});
  const map=getMap(state);
  const [site]=Object.entries(state.board).find(([,plot])=>plot.naturalWonder===landmark);
  const neighboring=map.neighbors(site).filter(id=>onLand(map.byId[id]) && !map.byId[id].landmark && !state.board[id].naturalWonder);
  const centers=map.tiles.filter(tile=>onLand(tile) && !state.board[tile.id].naturalWonder && hexDistance(site,tile.id)===range);
  const candidates=center=>neighboring.filter(id=>id!==center.id && hexDistance(id,center.id)<=2).length;
  centers.sort((a,b)=>candidates(b)-candidates(a));
  const center=centers[0];
  assert.ok(candidates(center)>0,landmark);
  state.units=state.units.filter(u=>u.seat===0);
  state.units[0].tile=center.id;
  state.barbarians={...state.barbarians,camps:[],parties:[]};
  const founded=applyAction(state,0,{type:'found',unit:state.units[0].id});
  const city=founded.cities[0];
  for (const tile of map.tiles) {
    if (hexDistance(city.tile,tile.id)<=2 && onLand(tile) && !founded.board[tile.id].naturalWonder)
      founded.board[tile.id]={owner:0,level:0};
  }
  founded.exploration=[{},{}];
  return {state:founded,city,site};
}

function unlock(state,item,seat=0) {
  const {tech,civic}=SCENIC_WORKS[item];
  state.players[seat][tech?'technologies':'civics']=[tech || civic];
}

test('every protected landscape has one local commission; all nine require its own research, an explicit adjacent parcel and city production',()=>{
  assert.deepEqual(Object.values(SCENIC_WORKS).map(work=>work.landmark).sort(),Object.keys(NATURAL_WONDERS).sort());
  for (const [item,work] of Object.entries(SCENIC_WORKS)) {
    const {state,city,site}=scenario(item);
    assert.equal(BUILDINGS[item],work);
    assert.equal(offers(state,city,item),undefined);
    assert.deepEqual(getProjectSites(state,city.id,item),[]);
    unlock(state,item);
    const option=offers(state,city,item);
    assert.equal(option.scenicWonder,work.landmark);
    assert.equal(option.required,work.required);
    assert.ok(option.enabled,item);
    assert.equal(option.buyEnabled,false);
    const plots=getProjectSites(state,city.id,item).map(s=>s.id);
    assert.ok(plots.length,item);
    assert.deepEqual(getProjectSites(campaignView(state,0),city.id,item).map(s=>s.id),plots);
    for (const id of plots) {
      assert.equal(hexDistance(site,id),1);
      assert.ok(hexDistance(city.tile,id)<=2);
      assert.notEqual(id,city.tile);
      assert.equal(state.board[id].owner,0);
    }
    const order={type:'produce',city:city.id,item};
    assert.throws(()=>applyAction(state,0,order),/eligible plot/);
    assert.throws(()=>applyAction(state,0,{...order,site}),/eligible plot/);
    assert.throws(()=>applyAction(state,0,{...order,type:'buyProduction',expected:0,gold:option.gold,site:plots[0]}),/require city production/);
    const started=applyAction(state,0,{...order,site:plots[0]});
    assert.equal(started.cities[0].queue.site,plots[0]);
    assert.equal(getScenicWorkStatus(started,item),'commissioned');
    assert.deepEqual(getProjectSites(started,city.id,item),[]);
    assert.equal(state.cities[0].queue,null);
  }
});

test('an undiscovered landscape three hexes away stays private; a remembered discovery survives loss of sight',()=>{
  const item='topangaTrail', {state,city,site}=scenario(item,3);
  unlock(state,item);
  const hidden=campaignView(state,0);
  assert.ok(!hidden.intel.explored.includes(site));
  assert.equal(offers(state,city,item),undefined);
  assert.equal(offers(hidden,city,item),undefined);
  assert.deepEqual(getProjectSites(state,city.id,item),[]);
  state.exploration[0][site]=null;
  const chart=campaignView(state,0);
  assert.ok(chart.intel.explored.includes(site) && !chart.intel.visible.includes(site));
  assert.ok(offers(chart,city,item).enabled);
  assert.deepEqual(getProjectSites(chart,city.id,item),getProjectSites(state,city.id,item));
  const otherRegion=Object.keys(SCENIC_WORKS).find(key=>NATURAL_WONDERS[SCENIC_WORKS[key].landmark].region==='sf');
  unlock(state,otherRegion);
  assert.equal(offers(state,city,otherRegion),undefined);
});

test('protected, improved, deposited, occupied and unowned parcels never accept a scenic work',()=>{
  const item='topangaTrail',{state,city}=scenario(item);
  unlock(state,item);
  const [site]=getProjectSites(state,city.id,item);
  for (const blocked of [
    {owner:1},{owner:null},{resource:'grain'},{improvement:'farm'},{facility:'shop'},
    {fieldStation:'survey'},{naturalWonder:'laBrea'},{wonder:'ucla'}
  ]) {
    const copy=structuredClone(state);
    Object.assign(copy.board[site.id],blocked);
    assert.ok(!getProjectSites(copy,city.id,item).some(plot=>plot.id===site.id),JSON.stringify(blocked));
    assert.throws(()=>applyAction(copy,0,{type:'produce',city:city.id,item,site:site.id}));
  }
  for (const marker of [{tile:site.id},{portTile:site.id},{queue:{item:'shop',site:site.id}}]) {
    const copy=structuredClone(state);
    copy.cities.push({...city,id:'other',...marker});
    assert.ok(!getProjectSites(copy,city.id,item).some(plot=>plot.id===site.id));
  }
  for (const plot of getProjectSites(state,city.id,item)) state.board[plot.id].owner=null;
  assert.match(offers(state,city,item).reason,/Claim an empty land tile/);
});

test('reservations release when production switches and reveal only status to a rival that knows the landscape',()=>{
  const item='missionGorgeTrail', {state,city,site}=scenario(item);
  unlock(state,item);
  const [plot]=getProjectSites(state,city.id,item);
  const order={type:'produce',city:city.id,item,site:plot.id};
  let queued=applyAction(state,0,order);
  const unknown=campaignView(queued,1);
  assert.equal(unknown.scenicRegistry?.[item],undefined);
  queued.exploration[1][site]=null;
  const known=campaignView(queued,1);
  assert.deepEqual(known.scenicRegistry,{[item]:'commissioned'});
  assert.equal(known.cities.some(c=>c.id===city.id),false);
  queued=cycle(queued);
  const progress=queued.cities[0].queue.progress;
  const change=(s,item,site)=>applyAction(s,0,{type:'switchProduction',city:city.id,item,site,expected:revisionOf(s.cities[0])});
  const paused=change(queued,'granary',city.tile);
  assert.equal(getScenicWorkStatus(paused,item),'open');
  assert.equal(getScenicWorkStatus(campaignView(paused,1),item),'open');
  const restored=migrateGame(JSON.parse(JSON.stringify(paused)));
  const resumed=change(restored,item,plot.id);
  assert.equal(resumed.cities[0].queue.progress,progress);
  const secondCenter=getMap(resumed).tiles.find(tile=>onLand(tile) && !resumed.board[tile.id].naturalWonder &&
    hexDistance(tile.id,site)<=3 && hexDistance(tile.id,city.tile)>=3);
  const otherCity={...city,id:'rival-city',seat:1,tile:secondCenter.id,queue:null,parkedProduction:{[item]:3,granary:2}};
  resumed.cities.push(otherCity);
  unlock(resumed,item,1);
  const rivalTurn=applyAction(resumed,0,{type:'end'});
  assert.match(offers(rivalTurn,otherCity,item).reason,/already under construction/);
  assert.throws(()=>applyAction(rivalTurn,1,{...order,city:otherCity.id}),/already under construction/);
  resumed.cities[0].queue.progress=resumed.cities[0].queue.required-1;
  const finished=applyAction(resumed,0,{type:'end'});
  assert.deepEqual(finished.cities[1].parkedProduction,{granary:2});
  assert.equal(otherCity.parkedProduction[item],3);
});

test('all nine completed works preserve their landmark and pay only their stated city and faction yields, including after reload',()=>{
  for (const [item,work] of Object.entries(SCENIC_WORKS)) {
    const {state,city,site}=scenario(item);
    unlock(state,item);
    const [plot]=getProjectSites(state,city.id,item);
    let ordered=applyAction(state,0,{type:'produce',city:city.id,item,site:plot.id});
    let turns=0;
    while (ordered.cities[0].queue && turns++<=work.required) ordered=cycle(ordered);
    assert.equal(ordered.cities[0].queue,null,item);
    const complete=migrateGame(JSON.parse(JSON.stringify(ordered)));
    assert.equal(complete.board[site].naturalWonder,work.landmark);
    assert.equal(complete.board[site].facility,undefined);
    assert.equal(complete.board[plot.id].facility,item);
    assert.equal(complete.board[plot.id].facilityCity,city.id);
    assert.equal(complete.cities[0].buildingSites[item],plot.id);
    assert.equal(getScenicWorkStatus(complete,item),'complete');
    assert.equal(getScenicWorkStatus(campaignView(complete,0),item),'complete');
    assert.match(offers(complete,city,item).reason,/complete/);
    const baseline=structuredClone(complete);
    baseline.cities[0].buildings=baseline.cities[0].buildings.filter(b=>b!==item);
    const local=getCityYield(complete,city.id),otherLocal=getCityYield(baseline,city.id);
    for (const key of ['food','production','capital']) assert.equal(local[key]-otherLocal[key],work.yields[key] || 0,item+' '+key);
    const income=getStats(complete,0),otherIncome=getStats(baseline,0);
    const harvest=applyAction(complete,0,{type:'end'}),otherHarvest=applyAction(baseline,0,{type:'end'});
    for (const key of ['capital','science','culture']) {
      assert.equal(income[key+'Income']-otherIncome[key+'Income'],work.yields[key] || 0,item+' '+key);
      assert.equal(harvest.players[0][key]-otherHarvest.players[0][key],work.yields[key] || 0,item+' '+key);
    }
    assert.deepEqual(getStats(complete,1),getStats(baseline,1));
  }
});
