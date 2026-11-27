import test from 'node:test';
import assert from 'node:assert/strict';
import {regionThumbnail} from '../docs/regions-ui.js';

test('the region plate follows an indented footprint and draws only public terrain',()=>{
  const row = (r, cols) => cols.map(q=>({q,r,terrain:'plains'}));
  const full = [...row(0,[0,1,2]),...row(1,[0,1,2]),...row(2,[0,1,2])];
  const cut = full.filter(t=>t.q!==2 || t.r!==1);
  const chart = regionThumbnail({tiles:cut});
  assert.notEqual(chart,regionThumbnail({tiles:full}));
  assert.equal(chart,regionThumbnail({tiles:cut.map(t=>({...t,resource:'iron',owner:2}))}));
  assert.match(chart,/class="region-rim"/);
});
