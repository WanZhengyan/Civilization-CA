import test from 'node:test';
import assert from 'node:assert/strict';
import {RELIEF_PITCH,reliefProject,reliefFacetLight,terrainReliefMesh,reliefRasterLayout,renderReliefAtlas} from '../docs/terrain-relief.js';
import {getMap} from '../docs/rules.js';
import {pos,W,H} from '../docs/hex-survey.js';

test('relief preserves the playable plane and gives slopes distinct upright heights',()=>{
  const maxima={};
  for(const terrain of ['ocean','coast','plains','urban','forest','hills','mountains']){
    const tile={q:5,r:6,id:'5,6',terrain},[x,y]=pos(tile.q,tile.r),mesh=terrainReliefMesh(tile);
    assert.deepEqual(mesh,terrainReliefMesh(tile),'identical map produces identical terrain');
    maxima[terrain]=Math.max(...mesh.flat().map(p=>p[2]));
    for(const [a,b,z] of mesh.flat()){
      assert.ok(Number.isFinite(z)&&z>=0);
      const dx=Math.abs(a-x),dy=Math.abs(b-y);
      assert.ok(dx<=W/2+1e-9 && dy<=H/2-dx*H/(2*W)+1e-9);
      if(dx<1e-8&&dy<1e-8)assert.equal(z,0,'unit center stays on the picking plane');
      if(Math.abs(dx-W/2)<1e-8 || Math.abs(dy-(H/2-dx*H/(2*W)))<1e-8)assert.ok(z<1e-8,'tile seams meet without cliffs');
    }
  }
  assert.equal(maxima.ocean,0);
  assert.ok(maxima.mountains>maxima.hills&&maxima.hills>maxima.forest&&maxima.forest>maxima.plains);
  const ground=reliefProject([40,60,0]),peak=reliefProject([40,60,30]);
  assert.equal(ground[0],peak[0]);assert.ok(Math.abs((ground[1]-peak[1])*RELIEF_PITCH-30)<1e-9);
  const sunward=reliefFacetLight([0,0,0],[10,0,6],[0,10,6]);
  const away=reliefFacetLight([0,0,6],[10,0,0],[0,10,0]);
  assert.ok(sunward>away,'upper-left faces receive the stronger directional light');
});

test('a cropped exploration keeps opening detail and full-size atlases respect the raster budget',()=>{
  for(const region of ['la','sf','sd'])for(const size of ['standard','large','grand','epic']){
    const map=getMap(region,size),layout=reliefRasterLayout(map.tiles);
    assert.ok(layout.width*layout.resolution<=4095.000001);
    assert.ok(layout.height*layout.resolution<=4095.000001);
    assert.ok(layout.width*layout.height*layout.resolution**2<=5_000_000.01);
    const first=map.tiles.slice(0,3),crop=reliefRasterLayout(first);
    assert.equal(crop.resolution,2);
    assert.ok(crop.width<layout.width);
    const [x,y]=pos(first[0].q,first[0].r);
    assert.ok(x>=crop.left&&x<=crop.left+crop.width&&y>=crop.top&&y<=crop.top+crop.height);
  }
});

test('unexplored terrain is absent from relief generation and cannot change an observed patch',()=>{
  const previous=globalThis.OffscreenCanvas,draws=[];
  class MockCanvas{
    constructor(width,height){this.width=width;this.height=height;this.calls=[];draws.push(this.calls);}
    getContext(){return new Proxy({}, {get:(target,key)=>target[key]??((...args)=>this.calls.push([key,...args])),set:(target,key,value)=>{target[key]=value;this.calls.push([key,value]);return true;}});}
  }
  globalThis.OffscreenCanvas=MockCanvas;
  try{
    const visible=[{q:5,r:5,id:'5,5',terrain:'forest'}];
    const hidden={q:5,r:4,id:'5,4',terrain:'mountains'};
    const map={tiles:[...visible,hidden],terrainAtlas:[...visible,hidden],byId:{'5,5':visible[0],'5,4':hidden}};
    renderReliefAtlas(visible,map,[hidden]);
    const alternate={...hidden,terrain:'urban',landmark:'downtown'};
    renderReliefAtlas(visible,{...map,tiles:[...visible,alternate],terrainAtlas:[...visible,alternate],byId:{...map.byId,'5,4':alternate}},[alternate]);
    assert.deepEqual(draws[0],draws[1]);
    const center=terrainReliefMesh(visible[0]);
    assert.deepEqual(center,terrainReliefMesh({...visible[0],resource:'gold',owner:3}),'private holdings do not steer terrain');
  }finally{if(previous===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=previous;}
});
