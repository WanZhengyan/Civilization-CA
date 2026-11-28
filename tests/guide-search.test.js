import assert from 'node:assert/strict';
import test from 'node:test';
import {bindGuideSearch,searchGuide} from '../docs/guide-search.js';
import {armyHandbook} from '../docs/army-handbook.js';

globalThis.window={};
const {gameGuideIndex}=await import('../docs/game.js');
const index=gameGuideIndex(null);

test('a query in either language finds a matching guide topic in the chosen display language',()=>{
  for(const [query,lang,chapter,title] of [
    ['影响力','en','influence','Use your first 6 influence'],['production','zh-CN','city','粮食与生产'],
    ['移动','en','start','Move a unit'],['scout','zh-CN','formations','侦察兵']
  ]){
    const [match]=searchGuide(index,query,lang);
    assert.equal(match.chapter,chapter);
    assert.equal(match.title,title);
    assert.ok(match.snippet.length);
    if(chapter==='formations')assert.ok(armyHandbook(String).includes('data-guide-target="'+match.key+'"'));
  }
  assert.deepEqual(searchGuide(index,'   ','en'),[]);
  assert.deepEqual(searchGuide(index,'unobtainium','en'),[]);
});

test('search uses current campaign rules and filters out irrelevant victory modes',()=>{
  const conquest=gameGuideIndex({campaignVariety:1,victoryMode:'conquest',researchPace:2});
  assert.ok(conquest.some(topic=>topic.en.title==='Conquest victory'));
  assert.ok(!conquest.some(topic=>topic.en.title==='Science victory'));
  const legacy=gameGuideIndex({});
  assert.ok(!legacy.some(topic=>topic.en.title==='Carry freight between harbors'));
});

test('typing preserves the field, Escape clears it, and Enter opens the first match after IME composition',()=>{
  const node=()=>Object.assign(new EventTarget(),{value:'',hidden:false,innerHTML:'',replaceChildren(){this.innerHTML='';},focus(){this.focused=true;}});
  const field=node(),results=node(),chapter=node(),clear=node(),count=node();
  clear.click=()=>clear.onclick();
  const root={querySelector:key=>({'#guide-query':field,'#guide-results':results,'[data-guide-chapter]':chapter,'[data-clear-search]':clear,'.guide-result-count':count})[key]};
  const opened=[];
  bindGuideSearch(root,'zh-CN',()=>index,item=>opened.push(item),String);
  function keydown(key,isComposing=false){field.dispatchEvent(Object.assign(new Event('keydown',{cancelable:true}),{key,isComposing}));}
  field.value='influence';field.dispatchEvent(new Event('input'));
  assert.equal(chapter.hidden,true);
  assert.match(results.innerHTML,/开局的 6 点影响力/);
  keydown('Enter',true);assert.equal(opened.length,0);
  keydown('Enter');assert.equal(opened[0].chapter,'influence');
  keydown('Escape');assert.equal(field.value,'');assert.equal(chapter.hidden,false);assert.equal(results.hidden,true);
  field.value='xxxxxxxx';field.dispatchEvent(new Event('input'));
  assert.match(count.textContent,/没有找到/);
});

test('building searches give the real city cost, prerequisites and benefit in the selected language',()=>{
  for (const [key,query,title,details] of [
    ['academy','学院','Academy',/Topographic Mapping.*22 production.*2 science/],
    ['shop','商店','Shop',/Land Surveying.*12 production.*3 gold/],
    ['foundry','铸造厂','Foundry',/Industrial Metallurgy.*Workshop.*27 production.*3 production/],
  ]) {
    const [result]=searchGuide(index,query,'en');
    assert.equal(result.key,'building-'+key);
    assert.equal(result.title,title);
    const topic=index.find(t=>t.key===result.key);
    assert.match(topic.en.body,details);
    assert.ok(topic['zh-CN'].body.includes('生产力'));
  }
  assert.ok(!gameGuideIndex({}).some(t=>t.key==='building-printingHouse'));
});
