import assert from 'node:assert/strict';
import test from 'node:test';
import {getMap} from '../docs/rules.js';
import {adjacent,chartPerimeter,dX,dY,idFor,pos} from '../docs/hex-survey.js';

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
