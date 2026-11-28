import test from 'node:test';
import assert from 'node:assert/strict';
import {newGazetteer,gazetteerContent,gazetteerAction} from '../docs/gazetteer.js';
test('county profiles identify the boundary and dated source in both languages',()=>{
  const view=newGazetteer('sd');
  assert.match(gazetteerContent(view,'en').body,/3,298,634/);
  gazetteerAction(view,'region-sf');
  assert.match(gazetteerContent(view,'zh-CN').body,/奥克兰与东湾位于县界外/);
  assert.match(gazetteerContent(view,'en').body,/census.gov\/quickfacts\/sanfranciscocountycalifornia/);
});
test('city profiles use municipal counts and permit moving between regions',()=>{
  const view=newGazetteer();
  gazetteerAction(view,'place-oakland');
  assert.equal(view.region,'sf');
  assert.match(gazetteerContent(view,'en').body,/440,646/);
  assert.match(gazetteerContent(view,'en').body,/Incorporated city boundary/);
});
test('comparison ranks cities and counties separately and a row opens its underlying profile',()=>{
  const v=newGazetteer();gazetteerAction(v,'section-compare');let body=gazetteerContent(v,'en').body;
  assert.ok(body.indexOf('3,898,747')<body.indexOf('1,386,932'));assert.ok(!body.includes('10,014,009'));
  gazetteerAction(v,'counties');body=gazetteerContent(v,'en').body;assert.match(body,/10,014,009/);
  gazetteerAction(v,'place-sd-county');assert.equal(v.section,'profile');assert.equal(v.region,'sd');
});
test('decadal comparison uses the 2010 base and exposes both original counts',()=>{
  const v=newGazetteer();gazetteerAction(v,'section-compare');gazetteerAction(v,'metric-growth');
  assert.match(gazetteerContent(v,'en').body,/12\.78/);
  gazetteerAction(v,'place-oakland');assert.match(gazetteerContent(v,'en').body,/390,724/);
});
test('land comparison converts area consistently and can use metric units in both views',()=>{
  const v=newGazetteer();gazetteerAction(v,'place-berkeley');gazetteerAction(v,'unit-km');
  assert.match(gazetteerContent(v,'en').body,/27\.01 km²/);
  gazetteerAction(v,'section-compare');gazetteerAction(v,'metric-density');
  assert.match(gazetteerContent(v,'zh-CN').body,/单位为平方公里/);
});
test('locating a place requires a previously charted district on the matching campaign',()=>{
  const v=newGazetteer();gazetteerAction(v,'place-pasadena');
  const campaign={mapId:'la',intel:{explored:[]}};
  assert.equal(gazetteerAction(v,'locate-pasadena',campaign),null);
  campaign.intel.explored=['15,3'];
  assert.equal(gazetteerAction(v,'locate-pasadena',campaign),'15,3');
  assert.match(gazetteerContent(v,'en',campaign).body,/Show charted district/);
  assert.equal(gazetteerAction(v,'locate-berkeley',campaign),null);
});
test('three public-agency field sites present region-specific measures and map links',()=>{
  const v=newGazetteer('sd');gazetteerAction(v,'section-sites');
  assert.match(gazetteerContent(v,'en').body,/1855–1891/);
  gazetteerAction(v,'site-topanga');assert.match(gazetteerContent(v,'zh-CN').body,/36 英里步道/);
  gazetteerAction(v,'site-fort-point');assert.match(gazetteerContent(v,'en').body,/nps.gov\/places\/fort-point/);
});
test('players can step along three coastal engineering milestones and locate the matching endpoint',()=>{
  const v=newGazetteer();gazetteerAction(v,'work-coronado-bridge');
  const body=gazetteerContent(v,'en').body;
  assert.ok(body.indexOf('1909')<body.indexOf('1937'));assert.match(body,/2.12-mile/);assert.match(body,/preceding project · 32/);
  gazetteerAction(v,'work-golden-gate');assert.match(gazetteerContent(v,'zh-CN').body,/5 月 28 日/);
});
test('county economies compare four separately dated measures and prevent applying county income to a city',()=>{
  const v=newGazetteer();gazetteerAction(v,'section-compare');gazetteerAction(v,'counties');gazetteerAction(v,'metric-income');
  let body=gazetteerContent(v,'en').body;assert.ok(body.indexOf('140,970')<body.indexOf('106,268'));assert.match(body,/2024 USD/);
  gazetteerAction(v,'cities');assert.equal(v.metric,'population');
  gazetteerAction(v,'place-sd-county');assert.match(gazetteerContent(v,'zh-CN').body,/1,391,721/);
});
import {searchPlaces} from '../docs/gazetteer.js';
test('a bilingual index supports multi-word region matching and safe empty results',()=>{
  assert.deepEqual(searchPlaces('GOLDEN BAY').map(p=>p.id),['golden-gate']);
  assert.deepEqual(searchPlaces('要塞').map(p=>p.id),['fort-point']);
  assert.equal(searchPlaces('<script>').length,0);
  const v=newGazetteer();gazetteerAction(v,'section-search');v.query='"<x>';
  assert.match(gazetteerContent(v,'en').body,/&quot;&lt;x&gt;/);
});
test('field notebooks persist ordered real sites across atlas sessions and recover from malformed local data',()=>{
  let data='null';const old=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>data,setItem:(_,value)=>{data=value;}}});
  try {
    let v=newGazetteer();gazetteerAction(v,'pin-oakland');gazetteerAction(v,'pin-lighthouse');gazetteerAction(v,'pin-unknown');
    v=newGazetteer();assert.deepEqual(v.pins,['oakland','lighthouse']);gazetteerAction(v,'section-saved');
    assert.match(gazetteerContent(v,'en').body,/Show|Old Point Loma Lighthouse/);
    gazetteerAction(v,'pin-oakland');assert.deepEqual(newGazetteer().pins,['lighthouse']);
  } finally {if(old)Object.defineProperty(globalThis,'localStorage',old);else delete globalThis.localStorage;}
});
import {surveyProgress} from '../docs/gazetteer.js';
test('survey counts shared districts once, respects the active map, and keeps undiscovered coordinates out of the UI',()=>{
  const campaign={mapId:'la',intel:{explored:['4,7']}};
  const p=surveyProgress(campaign);assert.equal(p.known.length,1);assert.equal(p.total,4);
  assert.equal(p.known[0].places.length,2);assert.equal(surveyProgress(null),null);
  const v=newGazetteer();gazetteerAction(v,'section-survey');const body=gazetteerContent(v,'en',campaign).body;
  assert.match(body,/1 \/ 4/);assert.ok(!body.includes('15,3'));assert.ok(!body.includes('Pasadena'));
});
test('three-stop regional field trips offer context, adapt next objectives to exploration and save without duplicates',()=>{
  const v=newGazetteer('sf');gazetteerAction(v,'section-trips');
  assert.match(gazetteerContent(v,'en',{mapId:'sf',intel:{explored:['4,4']}}).body,/Next uncharted stop · Golden Gate Bridge/);
  gazetteerAction(v,'region-la');gazetteerAction(v,'save-trip');gazetteerAction(v,'save-trip');
  assert.deepEqual(v.pins,['topanga','municipal-pier','los-angeles']);gazetteerAction(v,'region-sd');
  assert.match(gazetteerContent(v,'zh-CN').body,/寻访圣迭戈湾/);
});
import {createGame,campaignView,getMap} from '../docs/rules.js';
import {scoutApproaches} from '../docs/gazetteer.js';
import {cities} from '../docs/gazetteer-data.js';
test('scout approach planner uses engine routes for the current player and rechecks map focus',()=>{
  const raw=createGame(undefined,'la',{seed:1}),source=raw.units.find(u=>u.seat===0);
  Object.assign(source,{type:'scout',tile:'4,6',moves:4,maxMoves:4});
  const campaign=campaignView(raw,0),place=cities.find(p=>p.id==='santa-monica');
  assert.equal(getMap(campaign).byId['4,7'].name,'Santa Monica');
  const [scout]=scoutApproaches(place,campaign);assert.equal(scout.distance,1);assert.equal(scout.cost,1);
  const v=newGazetteer();gazetteerAction(v,'plan-santa-monica',campaign);
  assert.match(gazetteerContent(v,'zh-CN',campaign).body,/1 移动力/);
  assert.equal(gazetteerAction(v,'scout-'+source.id,campaign),source.tile);
  assert.equal(gazetteerAction(v,'scout-foreign',campaign),null);
  campaign.intel.explored=[];assert.equal(gazetteerAction(v,'scout-'+source.id,campaign),null);
});
import {districtProfiles} from '../docs/gazetteer.js';
test('district inspectors can open every related real place and never provide notes for an uncharted hex',()=>{
  const campaign={mapId:'sd',intel:{explored:['7,8']}};
  assert.deepEqual(districtProfiles(campaign,'7,8').map(p=>p.id),['coronado','coronado-bridge']);
  assert.deepEqual(districtProfiles(campaign,'10,6'),[]);
  const v={...newGazetteer('sd'),section:'district',district:'7,8'};
  const body=gazetteerContent(v,'zh-CN',campaign).body;
  assert.match(body,/data-act="gaz-work-coronado-bridge"/);assert.match(body,/data-act="gaz-place-coronado"/);
});
