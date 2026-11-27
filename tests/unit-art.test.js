import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {drawUnitArt} from '../docs/unit-art.js';

const pieces = ['cavalry','riflemen','artillery','armor','cutter','frigate','workboat'];

// A recorded drawing catches accidentally routing an unfamiliar unit through
// the settler fallback. Avoid a platform-specific canvas dependency in Node.
function drawing(type,options={}) {
  const trace=[];
  let depth=0;
  const ctx={save(){depth++;},restore(){depth--;}};
  for(const name of ['translate','scale','rotate','beginPath','moveTo','lineTo','bezierCurveTo','closePath','ellipse','fill','stroke']) {
    ctx[name]=(...values)=>{
      assert.ok(values.every(Number.isFinite),'Every coordinate must be finite');
      trace.push([name,...values,ctx.strokeStyle,ctx.fillStyle]);
    };
  }
  drawUnitArt(ctx,type,0,0,{color:'#cea46d',...options});
  assert.equal(depth,0,'Leave the caller’s coordinate system untouched');
  return createHash('sha256').update(JSON.stringify(trace)).digest('hex');
}

test('era units and ships have distinct faction-colored miniatures and moving poses',()=>{
  const portraits=new Set([drawing('settler')]);
  for(const type of pieces) {
    const rest=drawing(type);
    assert.ok(!portraits.has(rest),type+' must have its own miniature');
    portraits.add(rest);
    assert.notEqual(rest,drawing(type,{stride:1.3}),type+' must animate as it moves');
    assert.notEqual(rest,drawing(type,{color:'#547b99'}),type+' must retain its faction colors');
  }
});

test('every advanced unit and the harbor have individual field command illustrations',()=>{
  for(const type of [...pieces,'harbor']) {
    const file=readFileSync(new URL('../docs/art/'+type+'.webp',import.meta.url));
    assert.equal(file.toString('ascii',8,12),'WEBP');
    assert.ok(file.length<80*1024,type+' should stay light enough for a phone');
  }
});
