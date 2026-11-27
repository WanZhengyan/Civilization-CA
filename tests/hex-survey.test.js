import assert from 'node:assert/strict';
import test from 'node:test';
import {getMap} from '../docs/rules.js';
import {adjacent,chartPerimeter,dX,dY,idFor,pos,interiorEdges,inkHexGrid} from '../docs/hex-survey.js';

function canonicalEdge(a,b) { return [a.join(','),b.join(',')].sort().join('|'); }
function edgesOf(rings) {
  return rings.flatMap(points=>points.map((a,n)=>canonicalEdge(a,points[(n+1)%points.length])));
}
function hexEdges(tiles) {
  const counts=new Map();
  for(const tile of tiles) {
    const [x,y]=pos(tile.q,tile.r);
    const corners=dX.map((dx,i)=>[x+dx,y+dY[i]]);
    for(const edge of edgesOf([corners])) counts.set(edge,(counts.get(edge)||0)+1);
  }
  return counts;
}
test('each campaign frame follows exactly the outside edges of selectable land and water',()=>{
  for (const region of ['la','sf','sd']) {
    const {tiles}=getMap(region),counts=hexEdges(tiles);
    const rings=chartPerimeter(tiles);
    const expected=[...counts].filter(([,count])=>count===1).map(([edge])=>edge);
    assert.equal(rings.length,1);
    assert.deepEqual(edgesOf(rings).sort(),expected.sort());
    assert.deepEqual(chartPerimeter(tiles.map(({q,r})=>({q,r}))),rings);
    for(const type of ['ocean','urban']){
      assert.ok(tiles.some(t=>t.terrain===type && [0,1,2,3,4,5].some(k=>!getMap(region).byId[idFor(...adjacent(t.q,t.r,k))])));
    }
  }
});
test('holes and separated land have their own closed outlines',()=>{
  const tiles=[0,1,2,3,4,5].map(side=>{const [q,r]=adjacent(1,1,side);return {q,r};});
  tiles.push({q:10,r:7});
  assert.deepEqual(chartPerimeter(tiles).map(r=>r.length).sort((x,y)=>x-y),[6,6,18]);
});

test('the survey mesh strokes each interior edge once without using terrain or ownership',()=>{
  for(const key of ['la','sf','sd']){
    const {tiles}=getMap(key),expected=[...hexEdges(tiles)].filter(([,count])=>count===2).map(([edge])=>edge);
    const mesh=interiorEdges(tiles);
    assert.deepEqual(mesh.map(([a,b,c,d])=>canonicalEdge([a,b],[c,d])).sort(),expected.sort());
    assert.deepEqual(interiorEdges(tiles.map(({q,r})=>({q,r}))),mesh);
  }
});
test('grid pens keep the same visible width throughout camera zoom',()=>{
  for (const scale of [.32,1,2.7]) {
    const widths=[];
    const ctx={save(){},restore(){},translate(){},stroke(){widths.push(this.lineWidth*scale);}};
    inkHexGrid(ctx,{},scale);
    assert.ok(Math.abs(widths[0]-1.45)<1e-9 && Math.abs(widths[1]-.8)<1e-9);
  }
});

test('fit region includes the whole campaign and a margin on phones and wide canvases',async()=>{
  const {regionOverviewZoom}=await import('../docs/hex-survey.js');
  for (const [width,height] of [[320,410],[390,340],[920,415],[1770,680]]) {
    const base=Math.max(width/(1260+197),height/(760+175),Math.min(width/(72*15.65),height/(57*12.55)));
    const zoom=regionOverviewZoom(width,height,1260,760,base);
    assert.ok(base*zoom*1260<=width-28+1e-8);
    assert.ok(base*zoom*760<=height-28+1e-8);
  }
  const {translate}=await import('../docs/i18n.js');
  for (const label of ['Fit region','Hex grid','Territory border','Map edge','Map line key']) {
    assert.notEqual(translate(label,'zh-CN'),label);
  }
});

test('both localized city nameplates fit inside the staggered easternmost row',async()=>{
  const {fitAtlasCaption}=await import('../docs/atlas.js');
  const {tiles}=getMap('la');
  const interior=(x,y)=>tiles.some(tile=>{
    const [tx,ty]=pos(tile.q,tile.r),dx=Math.abs(tx-x),dy=Math.abs(ty-y);
    return dx<=36 && dy<=38-dx*76/144;
  });
  for (const id of ['16,3','16,12','0,0','0,11']) {
    const [q,r]=id.split(',').map(Number),[x,y]=pos(q,r);
    for (const half of [49,72]) {
      const [cx,cy]=fitAtlasCaption(x,y+26,half,12);
      for(const side of [-1,1]) for(const end of [-1,1]) assert.ok(interior(cx+side*half,cy+end*12));
    }
  }
});

test('fit and focus use the open play area beneath floating map controls',async()=>{
  const {chartViewport,regionOverviewZoom}=await import('../docs/hex-survey.js');
  for (const [w,h,insets] of [[1363,936,{left:196,right:250,top:114,bottom:70}],[390,844,{top:98,bottom:84}],[844,390,{top:96,bottom:82}]]) {
    const view=chartViewport(w,h,insets),scale=regionOverviewZoom(view.width,view.height,1240,760,1);
    assert.ok(view.x-1240*scale/2>=view.left+13.99);
    assert.ok(view.y-760*scale/2>=view.top+13.99);
    for(const [x,y] of [[0,0],[1240,760]]) {
      const cx=x+(w/2-view.x)/scale,cy=y+(h/2-view.y)/scale;
      assert.ok(Math.abs((x-cx)*scale+w/2-view.x)<1e-8 && Math.abs((y-cy)*scale+h/2-view.y)<1e-8);
    }
  }
});
