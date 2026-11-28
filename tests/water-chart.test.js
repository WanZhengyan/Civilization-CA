import test from 'node:test';
import assert from 'node:assert/strict';
import {pos} from '../docs/hex-survey.js';
import {waterGeometry,waterCaptions} from '../docs/water-chart.js';

const tiles=[[1,1,'lake'],[2,1,'lake'],[3,1,'river'],[4,2,'river'],[5,2,undefined]].map(([q,r,waterway])=>({q,r,id:q+','+r,terrain:'ocean',waterway}));
const map={tiles,byId:Object.fromEntries(tiles.map(t=>[t.id,t])),waterways:{lake:['1,1','2,1'],river:['3,1','4,2'],mouth:'5,2'}};

test('river rendering passes through every navigable center and joins the lake and open-water mouth',()=>{
  assert.deepEqual(waterGeometry(map).courses,[[[2,1],[3,1],[4,2],[5,2]].map(([q,r])=>pos(q,r))]);
  assert.equal(waterGeometry(map).rings.length,1);
  assert.equal(waterGeometry({}),null);
});

test('disconnected sightings never draw a route across uncharted water',()=>{
  const hidden={...map,waterways:{lake:[],river:['1,1','5,2'],mouth:null}};
  assert.deepEqual(waterGeometry(hidden).courses,[[pos(1,1)],[pos(5,2)]]);
  assert.deepEqual(waterGeometry({...map,waterways:{lake:[],river:[],mouth:null}}),{courses:[],lake:[],rings:[]});
});
test('charted names attach to known hexes; separate sightings get separate captions',()=>{
  const named=[tiles[0],tiles[1],tiles[4]].map(t=>({...t,waterway:'river',waterName:'Survey river'}));
  const labels=waterCaptions(named);
  assert.equal(labels.length,2);
  assert.ok(labels.every(mark=>named.includes(mark.tile)));
  assert.deepEqual(waterCaptions([]),[]);
});

import {chartedWaterSites,knownCrossings,waterKind} from '../docs/water-key.js';
import {translate} from '../docs/i18n.js';

test('lake, river and sea have distinct translated readings and functional crossing only appears once known',()=>{
  assert.deepEqual([waterKind(tiles[0]),waterKind(tiles[2]),waterKind(tiles[4])].map(s=>translate(s,'zh-CN')),['湖泊','河道','海洋与海湾']);
  const crossing={a:'bank1',b:'bank2',via:tiles[2].id,waterway:true,name:'Bridge'};
  const chart={...map,byId:Object.fromEntries(tiles.map(t=>[t.id,{...t,waterName:t.waterway==='lake'?'Lake':'River'}])),crossings:[crossing]};
  const explored=new Set([tiles[2].id,crossing.a]);
  assert.deepEqual(knownCrossings(chart,crossing.via,explored),[]);
  assert.deepEqual(chartedWaterSites(chart,explored).map(s=>s.name),['River']);
  explored.add(crossing.b);
  assert.deepEqual(chartedWaterSites(chart,explored).map(s=>s.name),['River','Bridge']);
  assert.deepEqual(knownCrossings(chart,crossing.via,explored),[crossing]);
  assert.deepEqual(chartedWaterSites(chart,new Set()),[]);
});

import {getMap} from '../docs/rules.js';
import {planWaterways,chartedWaterways,waterwayChart} from '../docs/waterways.js';
test('regional charts and seat projections paint reachable water and contain no unseen geography in their names or position list',()=>{
  for(const region of ['la','sf','sd'])for(const size of ['large','grand','epic']){
    const base=getMap(region,size),plan=planWaterways(base,42);
    const live=waterwayChart(base,plan),geometry=waterGeometry(live);
    assert.equal(geometry.courses.length,1);
    assert.equal(geometry.courses[0].length,plan.river.length+2);
    assert.ok(geometry.rings.length);
    const surveyed=new Set(plan.river.filter((id,i)=>i%3===0));
    const partial=waterwayChart(base,chartedWaterways(plan,surveyed));
    const geometry2=waterGeometry(partial);
    assert.equal(geometry2.lake.length,0);
    assert.ok(geometry2.courses.flat().every(([x,y])=>[...surveyed].some(id=>{const p=pos(live.byId[id].q,live.byId[id].r);return x===p[0]&&y===p[1];})));
    assert.ok(chartedWaterSites(partial,surveyed).every(site=>surveyed.has(site.id)));
  }
});
