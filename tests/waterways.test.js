import test from 'node:test';
import assert from 'node:assert/strict';
import {getMap} from '../docs/rules.js';
import {planWaterways} from '../docs/waterways.js';
const regions=['la','sf','sd'], sizes=['standard','large','grand','epic'];
test('seeded channels vary on every chart and reach the marine network without replacing landmarks or existing crossings',()=>{
  for(const region of regions)for(const size of sizes){
    const map=getMap(region,size), signatures=new Set();
    const fixed=new Set([...map.starts.flat(),...map.crossings.flatMap(c=>[c.a,c.b])]);
    for(const seed of [0,1,2,7,17,42,72,193]){
      const plan=planWaterways(map,seed), path=plan.river;
      assert.deepEqual(plan,planWaterways(map,seed));
      signatures.add(path.join('/'));assert.ok(path.length>=3);
      assert.equal(map.byId[plan.mouth].terrain,'ocean');
      assert.ok(map.neighbors(path.at(-1)).includes(plan.mouth));
      path.forEach((id,i)=>{
        assert.ok(!fixed.has(id) && !map.byId[id].landmark);
        assert.ok(!['mountains','ocean'].includes(map.byId[id].terrain));
        if(i)assert.ok(map.neighbors(path[i-1]).includes(id));
      });
    }
    assert.ok(signatures.size>=5,region+' '+size);
  }
});

test('the multi-hex lake opens onto the headwater, with freshwater and saltwater joined by an uninterrupted route',()=>{
  for(const region of regions)for(const size of sizes)for(const seed of [3,19,117]){
    const map=getMap(region,size),plan=planWaterways(map,seed);
    assert.ok(plan.lake.length>=2);assert.equal(new Set([...plan.river,...plan.lake]).size,plan.river.length+plan.lake.length);
    assert.ok(map.neighbors(plan.river[0]).some(id=>plan.lake.includes(id)));
    const connected=new Set([plan.lake[0]]);
    for(const id of connected)for(const n of map.neighbors(id))if(plan.lake.includes(n))connected.add(n);
    assert.equal(connected.size,plan.lake.length);
    for(const id of plan.lake){
      assert.ok(!map.byId[id].landmark && !map.starts.flat().includes(id));
      assert.ok(map.neighbors(id).every(n=>map.byId[n].terrain!=='ocean'));
    }
  }
});

function landGroup(map,from,water,links) {
  const visited=new Set([from]);
  for(const id of visited)for(const next of [...map.neighbors(id),...links.filter(x=>x.a===id || x.b===id).map(x=>x.a===id?x.b:x.a)]){
    if(!water.has(next) && !['mountains','ocean'].includes(map.byId[next].terrain))visited.add(next);
  }
  return visited;
}
test('bridge banks face across actual water and keep the same land districts connected, including protected homes',()=>{
  for(const region of regions)for(const size of sizes){
    const map=getMap(region,size),home=map.starts[0][0];
    const before=landGroup(map,home,new Set(),map.crossings);
    for(const seed of [9,31,720]){
      const plan=planWaterways(map,seed),water=new Set([...plan.lake,...plan.river]);
      assert.ok(plan.crossings.length>0);
      for(const c of plan.crossings){
        assert.ok(water.has(c.via));assert.ok(!water.has(c.a) && !water.has(c.b));
        assert.ok([c.a,c.b].every(id=>map.neighbors(c.via).includes(id)));
        assert.ok(!map.neighbors(c.a).includes(c.b));
      }
      const after=landGroup(map,home,water,[...map.crossings,...plan.crossings]);
      for(const id of before)if(!water.has(id))assert.ok(after.has(id),region+'/'+size+' isolated '+id);
    }
  }
});

import {createGame,migrateGame} from '../docs/rules.js';
test('new saves persist exact physical river/lake water, historical games and static charts retain their dry districts',()=>{
  for(const region of regions)for(const size of sizes){
    const settings={mapSize:size,seed:13};
    const state=createGame(['You','Rival'],region,settings),map=getMap(state),base=getMap(region,size);
    const old=createGame(['You','Rival'],region,{...settings,waterways:false});
    assert.equal(old.waterways,undefined);assert.equal(getMap(migrateGame(JSON.parse(JSON.stringify(old)))),base);
    assert.deepEqual(map.waterways,createGame(['You','Rival'],region,settings).waterways);
    const saved=JSON.parse(JSON.stringify(state));
    assert.equal(getMap(saved),map);
    for(const [ids,kind,name] of [[state.waterways.river,'river',state.waterways.riverName],[state.waterways.lake,'lake',state.waterways.lakeName]]){
      for(const id of ids) {
        const water=map.byId[id];assert.equal(water.waterway,kind);assert.equal(water.name,name);assert.equal(water.terrain,'ocean');
        assert.notEqual(base.byId[id].terrain,'ocean');assert.equal(map.terrainAtlas.find(t=>t.id===id),water);
      }
    }
    for(const settler of state.units)assert.ok(!['mountains','ocean'].includes(map.byId[settler.tile].terrain));
    for(const b of map.waterways.crossings)assert.ok(map.bridgesByTile[b.a].some(v=>v.to===b.b));
  }
});

import {chartedWaterways,waterwayChart} from '../docs/waterways.js';
import {campaignView} from '../docs/rules.js';
test('online seats, computers and reconnects receive only surveyed water, names, shore mouths and complete crossings',()=>{
  const sample=createGame([{name:'Scout'},{bot:true}], 'la',{seed:4242,mapSize:'grand'}),full=getMap(sample);
  const plan=sample.waterways,bridge=plan.crossings[0];
  const blank=chartedWaterways(plan,new Set());
  assert.deepEqual(blank,{version:1,river:[],lake:[],riverName:null,lakeName:null,mouth:null,crossings:[]});
  assert.equal(chartedWaterways(plan,new Set([bridge.a,bridge.b])).crossings.length,0);
  assert.ok(chartedWaterways(plan,new Set([bridge.a,bridge.b,bridge.via])).crossings.length);
  assert.equal(chartedWaterways(plan,new Set([plan.mouth])).mouth,null);
  for(let seat=0;seat<2;seat++){
    const view=campaignView(sample,seat),known=new Set(view.intel.explored),chart=getMap(view);
    assert.equal(view.seed,undefined);
    assert.deepEqual(view.waterways,chartedWaterways(plan,known));
    assert.equal(chart,getMap(JSON.parse(JSON.stringify(view))));
    for(const id of [...plan.river,...plan.lake]) {
      if(known.has(id))assert.deepEqual(chart.byId[id],full.byId[id]);
      else assert.equal(chart.byId[id].waterway,undefined);
    }
  }
  const observed=new Set([plan.lake[0],plan.river[1]]);
  const partial=chartedWaterways(plan,observed);
  assert.equal(partial.lakeName,plan.lakeName);assert.equal(partial.riverName,plan.riverName);
  assert.equal(partial.mouth,null);assert.equal(partial.crossings.length,0);
  assert.equal(waterwayChart(getMap('la','grand'),partial).byId[plan.river[1]].waterway,'river');
});

import {applyAction,getRouteDetail,getUnitOptions} from '../docs/rules.js';
test('ships sail from the marine mouth up the river into the inland lake and ground units can cross the banks',()=>{
  let game=createGame([{name:'Captain'}],'la',{seed:42,mapSize:'large',practice:true});
  const map=getMap(game),plan=map.waterways,ship=game.units[0];
  game.barbarians={camps:[],parties:[]};
  Object.assign(ship,{type:'cutter',tile:plan.mouth,moves:3,maxMoves:3});
  // The hull starts on an ordinary saltwater tile, takes real orders along
  // each adjacent hex and refreshes through real end-turn actions.
  const firstLake=map.neighbors(plan.river[0]).find(id=>plan.lake.includes(id));
  for(const tile of [...plan.river].reverse().concat(firstLake)){
    if(game.units[0].moves===0)game=applyAction(game,0,{type:'end'});
    const options=getUnitOptions(game,ship.id),view=campaignView(game,0);
    assert.ok(options.moves.includes(tile));
    assert.deepEqual(getRouteDetail(view,ship.id,tile),getRouteDetail(game,ship.id,tile));
    game=applyAction(game,0,{type:'move',unit:ship.id,tile});
    assert.equal(game.units[0].tile,tile);
  }
  assert.equal(map.byId[game.units[0].tile].waterway,'lake');
  const location=plan.crossings[0];
  Object.assign(game.units[0],{type:'settler',tile:location.a,moves:2,maxMoves:2});
  assert.ok(!getUnitOptions(game,ship.id).moves.includes(location.via));
  const order=getRouteDetail(game,ship.id,location.b);
  assert.deepEqual(order,{path:[location.a,location.b],cost:2,crossings:[location.name]});
  game=applyAction(game,0,{type:'move',unit:ship.id,tile:location.b});
  assert.equal(game.units[0].tile,location.b);
});
