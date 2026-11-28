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
