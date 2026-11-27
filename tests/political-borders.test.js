import test from 'node:test';
import assert from 'node:assert/strict';
import {adjacent, idFor} from '../docs/hex-survey.js';
import {borderChains, frontierEdges, frontierSeatsAt, politicalPaths, inkPolitics} from '../docs/political-borders.js';
import {translate} from '../docs/i18n.js';

function survey(entries) {
  const board = Object.fromEntries(Object.entries(entries).map(([id, owner]) => [id, {owner}]));
  const tiles = Object.keys(entries).map(id => {
    const [q,r] = id.split(',').map(Number);
    return {id,q,r};
  });
  return {tiles, board, byId: Object.fromEntries(tiles.map(tile => [tile.id,tile]))};
}

test('shared frontiers occur once, distinguish owner zero, and stop at actual cutlines', () => {
  const {tiles, board, byId} = survey({'3,2':0, '4,2':1, '2,2':null, '3,3':0});
  board['3,1'] = {owner:2}; // an omitted, non-playable tile
  const edges = frontierEdges(tiles, board);
  assert.equal(edges.filter(edge => edge.owners.includes(1)).length,2);
  assert.equal(edges.filter(edge => edge.owners.includes(null)).length,1);
  assert.ok(edges.every(edge => edge.owners[0] !== edge.owners[1] && !edge.owners.includes(2)));
  assert.deepEqual(frontierSeatsAt('4,2', board, null, byId), [1,0]);
  assert.deepEqual(frontierSeatsAt('2,2', board, null, byId), []);
});

test('changing a hidden owner cannot alter the chart or disclose a faction in the inspector', () => {
  const {tiles, board, byId} = survey({'3,2':0, '4,2':1, '2,2':null, '3,3':2});
  const visible = new Set(['2,2','3,2','4,2']);
  const before = frontierEdges(tiles,board,visible);
  assert.deepEqual(frontierSeatsAt('3,2',board,visible,byId), [0,1]);
  assert.deepEqual(frontierSeatsAt('3,3',board,visible,byId), []);
  for (const owner of [0,1,3,null]) {
    board['3,3'].owner = owner;
    assert.deepEqual(frontierEdges(tiles,board,visible),before);
  }
  visible.delete('4,2');
  assert.deepEqual(frontierSeatsAt('3,2',board,visible,byId), []);
  assert.equal(frontierEdges(tiles,board,visible).length,1);
});

test('frontier paths join around hex corners and close around an enclave', () => {
  const entries = {'2,2':0};
  for (let side=0; side<6; side++) entries[idFor(...adjacent(2,2,side))]=1;
  const {tiles,board}=survey(entries);
  const edges=frontierEdges(tiles,board);
  const chains=borderChains(edges);
  assert.equal(edges.length,6);
  assert.equal(chains.length,1);
  assert.equal(chains[0].length,7);
  assert.deepEqual(chains[0][0],chains[0].at(-1));
  const open=borderChains(edges.slice(1));
  assert.equal(open.length,1);
  assert.equal(open[0].length,6);
  assert.notDeepEqual(open[0][0],open[0].at(-1));
});

test('shared ribbons only use cells touching the frontier and keep a scale-capped ink', () => {
  class Path { addPath(){} moveTo(){} lineTo(){} closePath(){} }
  const previous=globalThis.Path2D;
  globalThis.Path2D=Path;
  try {
    const {tiles,board}=survey({'1,2':0,'2,2':0,'3,2':1,'4,2':null});
    const clipped=[];
    const paths=politicalPaths(tiles,board,null,(q,r)=>{clipped.push(idFor(q,r));return new Path();});
    assert.deepEqual(clipped.sort(),['2,2','3,2']);
    assert.equal(paths.claims.length,1);
    for (const scale of [.25,1,2]) {
      const strokes=[],dashes=[];
      const ctx={save(){},restore(){},clip(){},setLineDash(v){dashes.push(v)},stroke(){strokes.push([this.strokeStyle,this.lineWidth])}};
      inkPolitics(ctx,paths,scale,i=>['#gold','#blue'][i]);
      const ink=strokes.find(([color])=>color==='#203036')[1];
      assert.ok(ink <= 16 && ink*scale <= 9.4);
      assert.equal(dashes.length,1);
    }
  } finally {
    if (previous===undefined) delete globalThis.Path2D;
    else globalThis.Path2D=previous;
  }
  for(const name of ['Claim edge','Shared frontier']) assert.notEqual(translate(name,'zh-CN'),name);
});
