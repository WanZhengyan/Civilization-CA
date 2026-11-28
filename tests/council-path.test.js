import test from 'node:test';
import assert from 'node:assert/strict';
import {councilCourse,councilStages,renderCouncilPath} from '../docs/council-path.js';

const tree=[
  {item:'first',label:'First',era:'frontier',tier:1,cost:10,requires:[],completed:true},
  {item:'common',label:'Common',era:'frontier',tier:2,cost:15,requires:['first'],enabled:true},
  {item:'west',label:'West',era:'industrial',tier:1,cost:40,requires:['common'],locked:true},
  {item:'east',label:'East',era:'industrial',tier:1,cost:42,requires:['common'],locked:true},
  {item:'end',label:'End',era:'industrial',tier:2,cost:70,requires:['west','east'],locked:true}
];
test('a shared prerequisite and the bank each count once in the actual route',()=>{
  const path=councilCourse(tree,'end',6);
  assert.deepEqual(path.steps.map(s=>s.item),['first','common','west','east','end']);
  assert.equal(path.cost,167);
  assert.equal(path.remaining,161);
  assert.equal(councilCourse(tree,'end',250).remaining,0);
  assert.equal(councilCourse(tree,'unoffered',0),null);
  const html=renderCouncilPath({options:tree,action:'civic',balance:6,resource:'culture'},'end',true);
  assert.deepEqual([...html.matchAll(/data-route-order="([^"]+)"/g)].map(m=>m[1]),['common']);
  assert.doesNotMatch(renderCouncilPath({options:tree,action:'civic',balance:6,resource:'culture'},'end',false),/data-route-order/);
});
test('older councils get their own prerequisites and prices without added stage headings',()=>{
  const old=tree.map(({tier,...o})=>({...o,requires:[],cost:7}));
  assert.equal(councilStages(old).length,1);assert.equal(councilStages(old)[0][0],undefined);
  assert.deepEqual(councilCourse(old,'end',6).steps.map(o=>o.item),['end']);
  assert.equal(councilCourse(old,'end',6).remaining,1);
  assert.deepEqual(councilStages(tree.filter(o=>o.era==='industrial')).map(([n,items])=>[n,items.map(o=>o.item)]),[[1,['west','east']],[2,['end']]]);
});
