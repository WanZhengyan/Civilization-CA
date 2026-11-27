import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {drawCampus} from '../docs/campus-art.js';
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
