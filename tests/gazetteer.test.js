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
