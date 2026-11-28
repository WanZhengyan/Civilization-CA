import assert from 'node:assert/strict';
import test from 'node:test';
import {SCENIC_WORKS} from '../docs/scenic-works.js';
import {NATURAL_WONDERS} from '../docs/natural-wonders.js';
import {scenicProjectFor,scenicProjectDetails,scenicSiteHint} from '../docs/scenic-project-ui.js';
import {getAtlasPlace} from '../docs/atlas.js';
import {drawCivicBuilding,paintWorkSurvey} from '../docs/construction-art.js';
import {orderButtons,paintSiteBar} from '../docs/work-orders.js';
import {translate} from '../docs/i18n.js';

test('discovery entries explain the city project, its real gate and income in both languages',()=>{
  const state={naturalWonderVersion:2,researchPace:2,intel:{},scenicRegistry:{}};
  for(const [item,work] of Object.entries(SCENIC_WORKS)) {
    assert.equal(scenicProjectFor(state,work.landmark),item);
    const html=scenicProjectDetails(state,item);
    for(const label of [work.name,work.description,'Natural wonder project',scenicSiteHint]) {
      assert.notEqual(translate(label,'zh-CN'),label);
      if(label!==scenicSiteHint) assert.ok(html.includes(label));
    }
    assert.ok(html.includes(work.required+' production'));
    assert.ok(html.includes(work.tech?'Technology':'Civics'));
    assert.match(scenicProjectDetails({...state,scenicRegistry:{[item]:'commissioned'}},item),/Under construction/);
    assert.match(scenicProjectDetails({...state,scenicRegistry:{[item]:'complete'}},item),/Completed/);
  }
  assert.equal(scenicProjectFor({...state,naturalWonderVersion:undefined},'laBrea'),null);
  assert.equal(scenicProjectFor({...state,naturalWonderVersion:1,researchPace:undefined},'missionGorge'),null);
  assert.equal(scenicProjectFor({...state,naturalWonderVersion:1},'laBrea'),'laBreaFieldLab');
  assert.equal(scenicProjectDetails(state,null),'');
});

test('protected projects have a production order, a named landmark and an explicit site confirmation',()=>{
  const item='ballonaBoardwalk',work=SCENIC_WORKS[item],city={id:'west',name:'West',tile:'4,5'};
  const option={item,kind:'building',label:work.name,required:work.required,turns:4,enabled:true};
  const draft={type:'produce',item,city:city.id,expected:0};
  assert.match(orderButtons(option,true),/data-produce="ballonaBoardwalk"/);
  assert.doesNotMatch(orderButtons(option,true),/data-buy=/);
  const sites=[{id:'5,5',name:'West marsh',terrain:'coast'}],bar={dataset:{}};
  paintSiteBar(bar,draft,city,option,sites,true);
  assert.ok(bar.innerHTML.includes(NATURAL_WONDERS[work.landmark].name));
  assert.ok(bar.innerHTML.includes(scenicSiteHint));
  assert.match(bar.innerHTML,/data-site-confirm type="button" disabled/);
  paintSiteBar(bar,{...draft,site:sites[0].id},city,option,sites,true);
  assert.doesNotMatch(bar.innerHTML,/data-site-confirm type="button" disabled/);
});

test('each completed project has its own map silhouette, with the landmark and eligible parcels outlined separately',()=>{
  const drawn=new Set();
  for(const [item,work] of Object.entries(SCENIC_WORKS)){
    const geometry=[];
    const g=new Proxy({},{get:(_,key)=>(...args)=>geometry.push([key,...args]),set:()=>true});
    drawCivicBuilding(g,item,0,0,'#efd');
    const shape=JSON.stringify(geometry);
    assert.ok(!drawn.has(shape),work.name);drawn.add(shape);
    assert.equal(getAtlasPlace({}, {facility:item}).name,work.name);
    assert.equal(getAtlasPlace({}, {}),null);
  }
  const tiles=[{id:'5,4',q:5,r:4},{id:'4,4',q:4,r:4}];
  const [site,landmark]=tiles,byId=new Map(tiles.map(tile=>[tile.id,tile]));
  const strokes=[];
  const g=new Proxy({},{get:(_,key)=>(...args)=>{if(key==='stroke' && args.length)strokes.push(args[0]);},set:()=>true});
  const model={byId,workSites:[site.id],workLandmark:landmark.id};
  const paint=()=>paintWorkSurvey(g,model,1,(q,r)=>q+','+r,(q,r)=>[q,r]);
  model.fog={visible:new Set([site.id]),explored:new Set([site.id])};
  paint();assert.deepEqual(strokes,[site.id]);
  strokes.length=0;model.fog.explored.add(landmark.id);
  paint();assert.deepEqual(strokes,[landmark.id,site.id]);
});
