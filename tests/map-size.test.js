import assert from 'node:assert/strict';
import test from 'node:test';
import {applyAction,campaignView,createGame,getMap,getRouteDetail,getUnitOptions,hexDistance,migrateGame} from '../docs/rules.js';
import {chartPerimeter} from '../docs/hex-survey.js';
import {translate} from '../docs/i18n.js';

const regions=['la','sf','sd'];
const land=tile=>tile.terrain!=='ocean' && tile.terrain!=='mountains';
const sea=tile=>tile.terrain==='ocean';

function reachable(map,allowed,withLandings) {
  const tiles=map.tiles.filter(allowed);
  const reached=new Set([tiles[0].id]);
  for(const id of reached) {
    const next=[...map.neighbors(id)];
    if(withLandings) for(const bridge of map.bridgesByTile[id] || []) {
      // A lone explorer can use this crossing without another unit scouting ahead.
      if(hexDistance(id,bridge.to)<=2) next.push(bridge.to);
    }
    for(const neighbor of next) if(allowed(map.byId[neighbor])) reached.add(neighbor);
  }
  assert.equal(reached.size,tiles.length);
}

test('large charts retain the regional footprint, landmark locations and navigable waterways',()=>{
  for(const region of regions) {
    const standard=getMap(region),large=getMap(region,'large');
    assert.ok(large.tiles.length>standard.tiles.length*3.5);
    assert.ok(large.tiles.length<large.columns*large.rowsCount);
    assert.equal(large.terrainAtlas.length,large.columns*large.rowsCount);
    assert.equal(chartPerimeter(large.tiles).length,1);
    assert.equal(large.tiles.filter(t=>t.namedCenter).length,standard.tiles.length);
    assert.equal(large.tiles.filter(t=>t.landmark).length,standard.tiles.filter(t=>t.landmark).length);
    for(const tile of standard.tiles) {
      const anchor=large.byId[large.anchorId(tile.id)];
      assert.deepEqual([anchor.terrain,anchor.name,anchor.landmark],[tile.terrain,tile.name,tile.landmark]);
    }
    reachable(large,land,true);
    reachable(large,sea,false);
    const district=large.tiles.find(tile=>tile.name.endsWith(' · NW'));
    assert.ok(translate(district.name,'zh-CN').endsWith(' · 西北'));
  }
});

test('large-game seeds yield separated settler starts, private sight, nearby resources and two regional wonders',()=>{
  for(const region of regions) for(const seed of [0,9,35,417007]) {
    const players=['A','B','C','D'],options={seed,mapSize:'large'},game=createGame(players,region,options),map=getMap(game);
    assert.deepEqual(createGame(players,region,options),game);
    assert.deepEqual(game.units.map(u=>u.type),Array(4).fill('settler'));
    assert.equal(game.cities.length,0);
    assert.equal(Object.keys(game.board).length,map.tiles.length);
    assert.equal(Object.values(game.board).filter(cell=>cell.naturalWonder).length,2);
    assert.equal(getMap(migrateGame(JSON.parse(JSON.stringify(game)))),map);
    for(const unit of game.units) {
      assert.ok(game.units.every(other=>other===unit || hexDistance(unit.tile,other.tile)>=9));
      assert.ok(map.neighbors(unit.tile).some(id=>game.board[id].resource && land(map.byId[id])));
      const view=campaignView(game,unit.seat);
      for(const id of view.intel.explored)assert.deepEqual(getMap(view).byId[id],map.byId[id]);
      assert.deepEqual(view.units.map(u=>u.id),[unit.id]);
      assert.ok(view.intel.visible.length<=19);
      assert.ok(view.intel.visible.every(id=>hexDistance(unit.tile,id)<=2));
      assert.ok(Object.values(view.board).every(cell=>!cell.resource));
    }
  }
});

test('a settler can move, found and restore a city beyond the old atlas boundary',()=>{
  for(const region of regions) {
    const game=createGame(['Host','Guest'],region,{seed:1602,mapSize:'large'}),map=getMap(game);
    const unit=game.units[0];
    const site=map.tiles.find(tile=>tile.q>18 && land(tile) && !game.board[tile.id].naturalWonder &&
      map.neighbors(tile.id).some(n=>land(map.byId[n]) && !game.board[n].naturalWonder));
    unit.tile=site.id;game.barbarians={camps:[],parties:[]};
    const next=getUnitOptions(game,unit.id).moves.find(id=>hexDistance(id,site.id)===1 && !game.board[id].naturalWonder);
    assert.ok(next);
    const moved=applyAction(game,0,{type:'move',unit:unit.id,tile:next});
    assert.deepEqual(campaignView(moved,0).units.find(u=>u.id===unit.id).tile,next);
    // Founding requires a fresh activation when the crossing consumed all movement.
    const fresh=applyAction(applyAction(moved,0,{type:'end'}),1,{type:'end'});
    const settled=applyAction(fresh,0,{type:'found',unit:unit.id});
    const restored=migrateGame(JSON.parse(JSON.stringify(settled)));
    assert.equal(restored.cities[0].tile,next);
    assert.equal(getMap(restored),map);
    assert.equal(restored.board[next].owner,0);
  }
});

test('both shores of the expanded Golden Gate and Angel Island passages support a real movement order',()=>{
  const state=createGame(['Marin','Oakland'],'sf',{seed:42,mapSize:'large'});
  const map=getMap(state),unit=state.units[0];
  state.units=[unit];state.barbarians={camps:[],parties:[]};
  const passages=map.crossings.filter(c=>c.kind==='ferry' || c.name==='Golden Gate Bridge');
  for(const crossing of passages) for(const [from,to] of [[crossing.a,crossing.b],[crossing.b,crossing.a]]) {
    unit.tile=from;
    assert.ok(campaignView(state,0).intel.visible.includes(to));
    assert.deepEqual(getRouteDetail(state,unit.id,to),{path:[from,to],cost:2,crossings:[crossing.name]});
    assert.equal(applyAction(state,0,{type:'move',unit:unit.id,tile:to}).units[0].tile,to);
  }
});

test('old masked and rectangular saves keep their geometry and standard seeds keep their original serialization',()=>{
  for(const region of regions) {
    assert.deepEqual(createGame(undefined,region,{seed:90}),createGame(undefined,region,{seed:90,mapSize:'standard'}));
    assert.equal(getMap({mapId:region,mapShape:'regional'}),getMap(region,'standard'));
    assert.equal(getMap({mapId:region}).tiles.length,221);
  }
  assert.throws(()=>createGame(undefined,'la',{seed:90,mapSize:'unknown'}),/valid map size/i);
});


test('new-size surveys retain every regional center, connect land and sea, and resolve localities',()=>{
  for(const region of regions) for(const size of ['large','grand','epic']){
    const map=getMap(region,size), original=getMap(region,'standard');
    const scale={large:2,grand:3,epic:4}[size];
    assert.equal(map.columns,17*scale);
    assert.equal(map.rowsCount,13*scale);
    assert.equal(chartPerimeter(map.tiles).length,1);
    for(const tile of original.tiles)assert.equal(map.byId[map.anchorId(tile.id)].name,tile.name);
    reachable(map,land,true);reachable(map,sea,false);
    const district={la:'Westwood',sf:'Berkeley',sd:'Balboa Park'}[region];
    const places=map.tiles.filter(t=>t.district===district && t.localityLabel);
    assert.ok(places.length>=2,region+' '+size);
    assert.equal(new Set(places.map(t=>t.locality)).size,places.length);
    const state=createGame(undefined,region,{mapSize:size,seed:842});
    const view=campaignView(state,0),actual=getMap(state);
    assert.deepEqual(getMap(view).tiles.map(t=>t.id),map.tiles.map(t=>t.id));
    for(const id of view.intel.explored)assert.deepEqual(getMap(view).byId[id],actual.byId[id]);
    assert.equal(getMap(migrateGame(JSON.parse(JSON.stringify(state)))),actual);
  }
});
