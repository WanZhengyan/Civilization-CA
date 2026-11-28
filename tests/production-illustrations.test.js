import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {illustration, illustrationPath} from '../docs/illustrations.js';
import {BUILDINGS, IMPROVEMENTS, UNIT_TYPES} from '../docs/rules.js';
import {RESOURCES} from '../docs/resources.js';
import {ledgerBody} from '../docs/resource-ledger.js';
import {translate} from '../docs/i18n.js';

test('each unit, building, improvement and resource has a distinct WebP and a localized name',()=>{
  const hashes=new Set();
  for(const [id,entry] of Object.entries({...UNIT_TYPES,...BUILDINGS,...IMPROVEMENTS,...RESOURCES})){
    const path=illustrationPath(id);
    const url=new URL('../docs/'+path,import.meta.url);
    const data=readFileSync(url);
    assert.equal(data.toString('ascii',0,4),'RIFF',id);
    assert.equal(data.toString('ascii',8,12),'WEBP',id);
    assert.equal(data.readUInt32LE(4)+8,data.length,id);
    assert.ok(data.length>3000,id);
    const hash=createHash('sha256').update(data).digest('hex');
    assert.ok(!hashes.has(hash),'Reused artwork: '+id);
    hashes.add(hash);
    assert.ok(illustration(id).includes('src="'+path+'"'),id);
    assert.notEqual(translate(entry.name,'zh-CN'),entry.name,id);
  }
  for(const id of [null,'unknown','toString','../outside']) {
    assert.equal(illustrationPath(id),null);
    assert.equal(illustration(id),'');
  }
});

test('the supply ledger pairs each balance and both of its dispatch buttons with that cargo’s illustration',()=>{
  const accounts=Object.fromEntries(Object.keys(RESOURCES).map(key=>[key,{stock:3,income:1}]));
  const state={cities:[],turn:0,phase:'playing',round:1,players:[{}]};
  const rows=ledgerBody(state,0,accounts,null,false,String).split('<div class="cargo-row">').slice(1);
  assert.equal(rows.length,Object.keys(RESOURCES).length);
  for(const [i,[id,item]] of Object.entries(RESOURCES).entries()){
    assert.ok(rows[i].includes(illustration(id)));
    assert.ok(rows[i].includes('<strong>'+item.name+'</strong>'));
    assert.ok(rows[i].includes('data-act="cargo-'+id+'-sell"'));
    assert.ok(rows[i].includes('data-act="cargo-'+id+'-city"'));
  }
});

test('the treasury explains the current balance, actual signed income and both influence prices',()=>{
 const state={cities:[],players:[{capital:22,influence:8}],turn:0,round:2,phase:'playing'};
 const accounts=Object.fromEntries(Object.keys(RESOURCES).map(id=>[id,{stock:0,income:0}]));
 const html=ledgerBody(state,0,accounts,null,false,String,{capitalIncome:-2,influenceIncome:4});
 for(const token of ['Treasury</span> · 22','Influence</span> · 8','Income per turn</span> -2','Income per turn</span> +4','3 influence','4 gold and 5 influence'])assert.ok(html.includes(token),token);
});
