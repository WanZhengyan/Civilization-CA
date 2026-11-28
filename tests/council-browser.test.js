import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAction,createGame,getResearchOptions,getCivicOptions,getStats,BUILDINGS,UNIT_TYPES} from '../docs/rules.js';
import {WONDERS} from '../docs/wonders.js';
import {POLICIES} from '../docs/policy.js';
import {SCIENCE_PROJECT} from '../docs/victory-rules.js';
import {councilOverview,initialCouncilView,matchesCouncilView,navigateCouncilButtons,renderCouncilBrowser} from '../docs/research-catalog.js';
import {setLanguage} from '../docs/i18n.js';
import {renderCouncilPath} from '../docs/council-path.js';
import {councilGraphRows,councilEdgePath} from '../docs/council-graph.js';

const catalog={buildings:Object.fromEntries(Object.entries(BUILDINGS).filter(([id])=>!WONDERS[id])),units:UNIT_TYPES,universities:WONDERS,policies:POLICIES,projects:{orbitalSurvey:SCIENCE_PROJECT}};
const full={mode:'all',era:''};
function opening(){
  const game=createGame([{name:'Player'}],'la',{seed:624101,mapSize:'large',practice:true});
  return applyAction(game,0,{type:'found',unit:game.units[0].id});
}
function council(state,track){
  const science=track==='research',resource=science?'science':'culture';
  const options=(science?getResearchOptions:getCivicOptions)(state,0);
  return {action:track,resource,options,balance:state.players[0][resource],rate:getStats(state,0)[resource+'Income'],
    active:options.find(o=>o.active),completed:options.filter(o=>o.completed).length};
}
const cardIds=html=>Array.from(html.matchAll(/data-card="([^"]+)"/g),m=>m[1]);
const card=(html,id)=>html.split('data-card="'+id+'"')[1]?.split('</article>')[0];
for(const [track,starter,successor] of [['research','industry','mechanics'],['civic','charter','landRegistry']]){
  test(track+' selections follow the same available, full and completed views through a real opening',()=>{
    let state=opening(),c=council(state,track);
    assert.deepEqual(initialCouncilView(c.options),{mode:'all',era:''});
    const browse=(prefs,may=true)=>renderCouncilBrowser(c,prefs,catalog,may);
    const start=browse(initialCouncilView(c.options));
    assert.deepEqual(new Set(cardIds(start)),new Set(c.options.map(o=>o.item)));
    assert.deepEqual(new Set(cardIds(browse({mode:'available',era:''}))),new Set(c.options.filter(o=>o.enabled).map(o=>o.item)));
    assert.match(card(start,starter),new RegExp('data-project="'+starter+'"'));
    assert.match(card(start,starter),new RegExp('data-plan-item="'+successor+'"'));
    assert.match(card(browse(full),successor),new RegExp('View prerequisites for '));
    assert.doesNotMatch(card(browse(full),successor),/data-project="/);
    assert.match(browse({mode:'complete',era:'modern'}),/data-council-reset/);
    assert.deepEqual(cardIds(browse({mode:'all',era:'industrial'})).sort(),c.options.filter(o=>o.era==='industrial').map(o=>o.item).sort());
    state=applyAction(state,0,{type:track,item:starter});
    c=council(state,track);
    assert.match(browse({mode:'available',era:''}),new RegExp('data-status="active" data-card="'+starter+'"'));
    assert.match(councilOverview(c,true),/progress value="[0-9]+"/);
    assert.doesNotMatch(card(browse(full),starter),/data-project="/);
    state.players[0][c.resource]=c.options.find(o=>o.item===starter).cost;
    state=applyAction(state,0,{type:'end'});
    c=council(state,track);
    assert.ok(cardIds(browse({mode:'complete',era:''})).includes(starter));
    assert.ok(cardIds(browse({mode:'available',era:''})).includes(successor));
    assert.match(card(browse(full),successor),/Requirements met/);
    assert.match(card(browse(full,false),successor),/disabled/);
  });
}
test('each council shows actual unlocks from its own track, policies and successors',()=>{
  const state=opening();
  const science=renderCouncilBrowser(council(state,'research'),full,catalog,true);
  const civics=renderCouncilBrowser(council(state,'civic'),full,catalog,true);
  assert.match(card(science,'steam'),/Shipyard/);
  assert.match(card(science,'steam'),/Field Artillery/);
  assert.match(card(science,'steam'),/Caltech/);
  assert.match(card(civics,'charter'),/Public lectures/);
  assert.match(card(civics,'mutualAid'),/Pike Guard/);
  assert.match(card(civics,'publicWorks'),/Residential quarter/);
  for(const [track,tree] of [['tech',science],['civic',civics]]){
    for(const def of Object.values(BUILDINGS)){
      if(def[track] && card(tree,def[track]))assert.ok(card(tree,def[track]).includes(def.name),def.name);
    }
  }
  assert.doesNotMatch(renderCouncilBrowser(council({...state,victoryMode:'conquest'},'research'),full,catalog,true),/Orbital Survey/);
});
test('locked project paths in both councils preview missing dependencies while orders stay disabled out of turn',()=>{
  const state=opening();
  for(const [track,goal] of [['research','electricity'],['civic','publicLibraries']]){
    const c=council(state,track);
    const html=renderCouncilPath(c,goal,false);
    assert.match(html,/Needs /);
    assert.match(html,/data-path-back/);
    assert.doesNotMatch(html,/data-route-order/);
    c.options=c.options.map(o=>({...o,completed:true,enabled:false,active:false}));
    assert.deepEqual(initialCouncilView(c.options),{mode:'all',era:''});
  }
});
test('Chinese controls, costs, current order and income use the correct vocabulary for each council',()=>{
  const state=opening();
  globalThis.document={documentElement:{},dispatchEvent(){}};
  try{
    setLanguage('zh-CN');
    for(const [track,starter,unit,verb] of [['research','industry','科研点','研究'],['civic','charter','文化点','议定']]){
      const c=council(state,track),html=renderCouncilBrowser(c,full,catalog,true);
      assert.match(html,/完整树/);assert.match(html,/查看前置路线/);
      assert.ok(card(html,starter).includes(verb));assert.ok(card(html,starter).includes(unit));
      assert.match(councilOverview(c,true),/每回合/);
      assert.ok(!matchesCouncilView(c.options.find(o=>o.item===starter),'complete',''));
    }
  } finally {setLanguage('en');delete globalThis.document;}
});
test('keyboard switches wrap, reach either end, and leave native controls and modifiers alone',()=>{
  const logs=[];
  const controls=[0,1,2].map(i=>({focus(){logs.push('focus'+i);},click(){logs.push('choose'+i);}}));
  const key=(key,index,options={})=>navigateCouncilButtons({target:controls[index],key,preventDefault(){logs.push('handled');},...options},controls);
  key('ArrowLeft',0);key('ArrowRight',2);key('Home',2);key('End',0);
  key('Enter',0);key('ArrowRight',0,{altKey:true});key('ArrowRight',9);
  assert.deepEqual(logs,['handled','focus2','choose2','handled','focus0','choose0','handled','focus0','choose0','handled','focus2','choose2']);
});

test('both vertical trees draw every real prerequisite exactly once and above its dependent project',()=>{
  for(const pace of [1,2])for(const track of ['research','civic']){
    const state=opening();state.researchPace=pace;
    const c=council(state,track), html=renderCouncilBrowser(c,full,catalog,true);
    const {rows,width}=councilGraphRows(c.options,['frontier','industrial','modern']);
    const rank=new Map(rows.flatMap((row,i)=>row.nodes.map(({option})=>[option.item,i])));
    const edges=Array.from(html.matchAll(/data-from="([^"]+)" data-to="([^"]+)"/g),m=>m[1]+'>'+m[2]);
    assert.deepEqual(edges.sort(),c.options.flatMap(o=>o.requires.map(id=>id+'>'+o.item)).sort());
    assert.ok(width>=2);
    for(const row of rows){
      assert.equal(new Set(row.nodes.map(n=>n.lane)).size,row.nodes.length);
      for(const {option,lane} of row.nodes){
        assert.ok(lane>=0 && lane<width);
        for(const id of option.requires)assert.ok(rank.get(id)<rank.get(option.item));
      }
    }
    for(const o of c.options)assert.ok(html.includes('data-tree-inspect="'+o.item+'" aria-controls="tree-detail-'+o.item+'" aria-expanded="false"'));
  }
});

test('inspecting a junction in either council traces its ancestors and reveals only its own detail',()=>{
  for(const [track,goal] of [['research','motorization'],['civic','regionalPlanning']]){
    const c=council(opening(),track);
    const html=renderCouncilBrowser(c,{...full,selected:goal},catalog,true);
    const option=c.options.find(o=>o.item===goal);
    assert.equal([...html.matchAll(/aria-expanded="true"/g)].length,1);
    assert.equal([...html.matchAll(/class="tree-detail" [^>]* hidden/g)].length,c.options.length-1);
    for(const id of option.requires){
      assert.match(html,new RegExp('data-from="'+id+'" data-to="'+goal+'" data-known="false" data-traced="true"'));
      assert.ok(card(html,goal).includes('data-tree-jump="'+id+'"'));
    }
    const filtered=renderCouncilBrowser(c,{mode:'available',era:'',selected:goal},catalog,true);
    assert.ok(!filtered.includes('data-selection="true"'));
    assert.ok(!filtered.includes('data-to="'+goal+'"'));
  }
});

test('a long dependency uses a gutter clear of every intervening node',()=>{
  const source={left:20,right:90,top:15,bottom:70};
  const end={left:20,right:90,top:305,bottom:380};
  const obstacle={left:16,right:100,top:150,bottom:230};
  const path=councilEdgePath(source,end,0,0,[source,obstacle,end],400,1);
  const coords=[...path.matchAll(/[HV]([-0-9.]+)/g)].map(m=>Number(m[1]));
  assert.ok(coords[0]<obstacle.top);
  assert.ok(coords[1]<obstacle.left || coords[1]>obstacle.right);
  assert.ok(coords[2]>obstacle.bottom);
  assert.equal(coords.at(-1),end.top);
});

test('focused branch includes prior steps and direct requirements, and excludes downstream and independent projects',()=>{
  for(const [track,goal] of [['research','cartography'],['civic','federation']]){
    const c=council(opening(),track), byId=new Map(c.options.map(o=>[o.item,o]));
    const selected=renderCouncilBrowser(c,{...full,selected:goal},catalog,true);
    const parents=byId.get(goal).requires;
    const ancestors=new Set(parents);
    for(const id of ancestors)for(const previous of byId.get(id).requires)ancestors.add(previous);
    const edges=[...selected.matchAll(/data-from="([^"]+)" data-to="([^"]+)" data-known="[^"]+" data-traced="[^"]+" data-incoming="([^"]+)"/g)];
    assert.ok(edges.some(([,from,to])=>from===goal && !ancestors.has(to)));
    for(const [,from,to,relation] of edges){
      assert.equal(relation,to===goal?'direct':ancestors.has(to)?'earlier':'off',from+' → '+to);
    }
    for(const option of c.options){
      const expected=option.item===goal?'selected':parents.includes(option.item)?'direct':ancestors.has(option.item)?'earlier':'off';
      assert.ok(card(selected,option.item).includes('data-relation="'+expected+'"'));
    }
    assert.ok(card(selected,goal).includes('Show all branches'));
    const root=c.options.find(option=>!option.requires.length).item;
    const first=renderCouncilBrowser(c,{...full,selected:root},catalog,true);
    assert.doesNotMatch(first,/data-traced="true"/);
    assert.ok(card(first,root).includes('No prerequisites.'));
  }
});
