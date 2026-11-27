import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {NATURAL_WONDERS} from '../docs/natural-wonders.js';
import {naturalWonderArt} from '../docs/natural-wonder-art.js';

test('each discoverable natural wonder has its own landscape painting',()=>{
  const paintings=new Set();
  for(const id of Object.keys(NATURAL_WONDERS)){
    const file=readFileSync(new URL('../docs/'+naturalWonderArt(id),import.meta.url));
    assert.equal(file.toString('ascii',0,4),'RIFF',id);
    assert.equal(file.toString('ascii',8,12),'WEBP',id);
    assert.equal(file.readUInt32LE(4)+8,file.length,id);
    const hash=createHash('sha256').update(file).digest('hex');
    assert.ok(!paintings.has(hash),id);
    paintings.add(hash);
  }
  assert.equal(naturalWonderArt(null),null);
  assert.equal(naturalWonderArt('unknown'),null);
  assert.equal(naturalWonderArt('constructor'),null);
});
