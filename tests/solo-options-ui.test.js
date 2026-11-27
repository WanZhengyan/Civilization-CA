import test from 'node:test';
import assert from 'node:assert/strict';
import {translate} from '../docs/i18n.js';
import {rivalPicker, victoryPicker} from '../docs/regions-ui.js';
import {SCORE_TARGETS, TARGET_SCORE} from '../docs/rules.js';

function radioOptions(markup, name) {
  return Array.from(markup.matchAll(/<label>([\s\S]*?)<\/label>/g), ([, label]) => {
    const input = label.match(/<input\b[^>]*>/)[0];
    assert.match(input,/type="radio"/);
    assert.ok(input.includes(`name="${name}"`));
    const text = Array.from(label.matchAll(/>([^<>]+)</g), ([,raw])=>raw.trim()).filter(Boolean);
    assert.ok(text.length>=2);
    for (const part of text) {
      assert.equal(translate(part,'en'),part);
      assert.notEqual(translate(part,'zh-CN'),part);
    }
    return {value:Number(input.match(/value="(\d+)"/)[1]), checked:/\bchecked\b/.test(input), text};
  });
}

test('solo setup identifies the practice board and total civilization count for every rival choice',()=>{
  for(const selected of [0,1,2,3]) {
    const markup=rivalPicker(selected);
    assert.match(markup,/<fieldset[^>]*><legend>Computer opponents<\/legend>/);
    const options=radioOptions(markup,'rivals');
    assert.deepEqual(options.map(option=>option.value),[0,1,2,3]);
    assert.deepEqual(options.filter(option=>option.checked).map(option=>option.value),[selected]);
    assert.deepEqual(options[0].text,['0 rivals','Solo practice']);
    for(const {value,text} of options.slice(1)) assert.equal(text[1],(value+1)+' civilizations total');
    const descriptionId=markup.match(/value="0"[^>]*aria-describedby="([^"]+)"/)[1];
    const note=markup.match(new RegExp('<p id="'+descriptionId+'">([^<]+)</p>'))[1];
    assert.ok(note.includes('neutral camps') && note.includes('earn civic points'));
    assert.notEqual(translate(note,'zh-CN'),note);
  }
});

test('each supported victory target has a localized length, an explicit score and one checked option',()=>{
  const labels=['Short','Standard','Long'];
  for(const selected of [undefined,...SCORE_TARGETS]) {
    const markup=victoryPicker(selected);
    assert.match(markup,/<fieldset[^>]*><legend>Victory target<\/legend>/);
    const options=radioOptions(markup,'scoreTarget');
    assert.deepEqual(options.map(option=>option.value),SCORE_TARGETS);
    assert.deepEqual(options.filter(option=>option.checked).map(option=>option.value),[selected??TARGET_SCORE]);
    for(const [index,option] of options.entries()) assert.deepEqual(option.text,[labels[index],option.value+' civic points']);
  }
});
