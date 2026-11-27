import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,getMap,getMovePath,getUnitOptions,getPortSite,getRouteDetail,applyAction,migrateGame,campaignView} from '../docs/rules.js';
import {createClassicGame} from './classic-game.js';
import {chartHit,chartPerimeter,pos} from '../docs/hex-survey.js';
import {fitAtlasCaption} from '../docs/atlas.js';

const regions=['la','sf','sd'];
const sea=tile=>tile.terrain==='ocean';
const land=tile=>!sea(tile) && tile.terrain!=='mountains';

function component(map,start,allowed,includeCrossings) {
  const reached=new Set([start]);
  for (const site of reached) {
    const crossing=includeCrossings ? (map.bridgesByTile[site]||[]).map(link=>link.to) : [];
    for(const next of [...map.neighbors(site),...crossing])if(allowed(map.byId[next]))reached.add(next);
  }
  return reached;
}

test('each region has a distinct playable silhouette, one land network and one shipping network',()=>{
  const outlines=new Set();
  for(const id of regions){
    const map=getMap(id), rectangle=getMap({mapId:id});
    assert.ok(map.tiles.length>130 && map.tiles.length<180);
    assert.equal(chartPerimeter(map.tiles).length,1);
    outlines.add(map.tiles.map(t=>t.id).join('|'));
    const water=map.tiles.filter(sea),ground=map.tiles.filter(land);
    assert.equal(component(map,water[0].id,sea,false).size,water.length);
    assert.equal(component(map,ground[0].id,land,true).size,ground.length);
    const coastCount=ground.filter(t=>map.neighbors(t.id).some(next=>sea(map.byId[next]))).length;
    assert.ok(coastCount>=10);
    for(const tile of rectangle.tiles){
      assert.equal(chartHit(...pos(tile.q,tile.r),cell=>Object.hasOwn(map.byId,cell)),map.byId[tile.id]?.id || null);
      if(!map.byId[tile.id])assert.deepEqual(map.neighbors(tile.id),[]);
      else for(const next of map.neighbors(tile.id))assert.ok(map.neighbors(next).includes(tile.id));
    }
  }
  assert.equal(outlines.size,regions.length);
});

test('new saves, rooms, movement, founding and city work share the same chart mask',()=>{
  for(const id of regions){
    const state=createGame(['Host','Guest'],id,{seed:1602}),map=getMap(id);
    const omitted=getMap({mapId:id}).tiles.find(t=>!map.byId[t.id]).id;
    const unit=state.units[0];
    assert.equal(getMap(state),map);
    assert.deepEqual(Object.keys(state.board),map.tiles.map(t=>t.id));
    for(const seat of [0,1]){
      const view=campaignView(state,seat);
      assert.equal(getMap(view),map);
      assert.ok(view.intel.visible.every(tile=>map.byId[tile]));
      assert.deepEqual(Object.keys(view.board),Object.keys(state.board));
    }
    assert.equal(getMap(migrateGame(JSON.parse(JSON.stringify(state)))),map);
    assert.deepEqual(getMovePath(state,unit.id,omitted),[]);
    assert.throws(()=>applyAction(state,0,{type:'move',unit:unit.id,tile:omitted}));
    assert.throws(()=>applyAction(state,0,{type:'claim',tile:omitted}));
    const coast=map.tiles.find(t=>land(t) && map.neighbors(t.id).length<6 && map.neighbors(t.id).some(n=>sea(map.byId[n])));
    unit.tile=coast.id;
    state.barbarians={camps:[],parties:[]};
    const town=applyAction(state,0,{type:'found',unit:unit.id}),city=town.cities[0];
    assert.deepEqual(Object.keys(town.board),Object.keys(state.board));
    assert.ok(sea(map.byId[getPortSite(town,city.id)]));
    for(const tile of Object.keys(town.board).filter(tile=>town.board[tile].owner===0)){
      assert.ok(tile===coast.id || map.neighbors(coast.id).includes(tile));
    }
  }
});

test('legacy saves and projected seats retain holdings and playable routes beyond the new survey',()=>{
  for(const id of regions){
    const state=createClassicGame(['Host','Guest'],id),map=getMap(state),fresh=getMap(id);
    const edge=map.tiles.find(t=>land(t) && !fresh.byId[t.id] && map.neighbors(t.id).some(n=>land(map.byId[n])));
    const next=map.neighbors(edge.id).find(n=>land(map.byId[n]));
    const unit=state.units.find(u=>u.seat===0 && u.type==='melee');
    unit.tile=edge.id;
    state.board[edge.id].owner=0;
    const restored=migrateGame(JSON.parse(JSON.stringify(state)));
    assert.equal(getMap(restored).tiles.length,221);
    assert.equal(getMap(campaignView(restored,0)),map);
    assert.ok(campaignView(restored,0).intel.visible.includes(edge.id));
    assert.ok(getUnitOptions(restored,unit.id).moves.includes(next));
    assert.equal(applyAction(restored,0,{type:'move',unit:unit.id,tile:next}).units.find(u=>u.id===unit.id).tile,next);
  }
});

test('the Angel Island ferry joins the mainland in two land moves and leaves the bay sailable',()=>{
  const state=createGame(['Marin','Oakland'],'sf',{seed:84}),map=getMap(state);
  const ferry=map.crossings.find(crossing=>crossing.kind==='ferry');
  const unit=state.units[0];
  state.units=[unit];state.barbarians={camps:[],parties:[]};
  unit.type='melee';unit.tile=ferry.a;
  assert.deepEqual(getRouteDetail(state,unit.id,ferry.b),{cost:2,crossings:[ferry.name],path:[ferry.a,ferry.b]});
  assert.equal(applyAction(state,0,{type:'move',unit:unit.id,tile:ferry.b}).units[0].tile,ferry.b);
  assert.equal(getMap({mapId:'sf'}).crossings.some(c=>c.kind==='ferry'),false);
});

test('city nameplates stay inside the playable chart on clipped coasts and peninsulas',()=>{
  for(const id of regions){
    const map=getMap(id),contains=cell=>Object.hasOwn(map.byId,cell);
    for(const tile of map.tiles.filter(t=>map.neighbors(t.id).length<6)){
      const [x,y]=pos(tile.q,tile.r);
      for(const halfWidth of [49,72]){
        const [cx,cy]=fitAtlasCaption(x,y+26,halfWidth,12,map);
        for(const side of [-1,1]) for(const end of [-1,1]){
          assert.ok(chartHit(cx+side*halfWidth,cy+end*12,contains),id+' '+tile.id);
        }
      }
    }
  }
});
