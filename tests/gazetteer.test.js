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
