import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {drawCampus} from '../docs/campus-art.js';
import {getAtlasPlace} from '../docs/atlas.js';
import {getMap, createGame, campaignView} from '../docs/rules.js';
import {WONDERS} from '../docs/wonders.js';
import {translate} from '../docs/i18n.js';

test('each built university has unique map architecture, regional artwork and translated effects',()=>{
  const shapes=new Set(),plates=new Set();
  for(const [id,campus] of Object.entries(WONDERS)){
    const calls=[];
    const ctx=new Proxy({}, {get(_,k){return (...args)=>calls.push([k,...args]);},set(){return true;}});
    drawCampus(ctx,id,1,2,'#dbab68');
    shapes.add(JSON.stringify(calls));
    const image=readFileSync(new URL('../docs/art/'+id+'.webp',import.meta.url));
    assert.equal(image.subarray(8,12).toString(),'WEBP');
    assert.ok(image.length>3000 && image.length<85000);
    plates.add(image.toString('base64'));
    assert.notEqual(translate(campus.description,'zh-CN'),campus.description);
    assert.notEqual(translate(campus.name,'zh-CN'),campus.name);
  }
  assert.equal(shapes.size,4);
  assert.equal(plates.size,4);
});


test('the atlas replaces a landmark only for seats that can see the completed campus',()=>{
  const state=createGame([{name:'West'},{name:'East'}],'la',{seed:275});
  const map=getMap(state), rose=map.byId['15,3'];
  const placeFor=seat=>getAtlasPlace(rose,campaignView(state,seat).board[rose.id]);
  const original={name:'Rose Bowl',landmark:'rosebowl'};
  state.units.find(u=>u.seat===0).tile=rose.id;
  state.units.find(u=>u.seat===1).tile='3,6';
  assert.deepEqual(placeFor(0),original);
  state.board[rose.id].owner=0;
  state.board[rose.id].wonder='ucla';
  assert.deepEqual(placeFor(0),{name:'UCLA',landmark:null});
  assert.deepEqual(placeFor(1),original);
  state.units.find(u=>u.seat===1).tile=rose.id;
  assert.deepEqual(placeFor(1),{name:'UCLA',landmark:null});
  const other=map.tiles.find(t=>t.landmark==='griffith');
  assert.deepEqual(getAtlasPlace(other,{}),{name:'Griffith Observatory',landmark:'griffith'});
  assert.deepEqual(getAtlasPlace({id:'1,1'}, {wonder:'caltech'}),{name:'Caltech',landmark:null});
});
