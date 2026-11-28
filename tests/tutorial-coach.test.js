import test from 'node:test';
import assert from 'node:assert/strict';
import {mountTutorialCoach,tutorialLesson} from '../docs/tutorial-coach.js';
import {newTutorial} from '../docs/tutorial-save.js';

test('a tutorial settler with no movement gets a turn prompt and a lost settler gets a restart review',()=>{
  const {game}=newTutorial();
  const view={tutorial:true,seat:0,state:game};
  game.units[0].moves=0;
  assert.equal(tutorialLesson(view).step,'restFounder');
  game.units=[];
  assert.equal(tutorialLesson(view).step,'restart');
  assert.equal(tutorialLesson({...view,tutorial:false}),null);
});

// The coach is mounted across campaign changes, language switches and a return to title.
test('locating a lesson never issues its order, and hiding it is scoped to the practice save',t=>{
  function stub(){
    const attrs=new Map(),children=new Map(),classes=new Set();
    return {
      hidden:false,classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},
      setAttribute:(k,v)=>attrs.set(k,v),getAttribute:k=>attrs.get(k),
      querySelector(k){if(!children.has(k))children.set(k,stub());return children.get(k);}
    };
  }
  const card=stub(),root=stub(),events={},body=stub();
  root.append=()=>{};
  const prev=globalThis.document;
  globalThis.document={createElement:()=>card,body,querySelector:s=>s==='.map-workspace'?root:root.querySelector(s),addEventListener:(type,fn)=>{events[type]=fn;}};
  t.after(()=>{if(prev===undefined)delete globalThis.document;else globalThis.document=prev;});
  const practice=newTutorial(),view={state:practice.game,seat:0,tutorial:true,tutorialProgress:practice.progress};
  let lang='en',located=null;
  const controller=mountTutorialCoach({getView:()=>view,getLanguage:()=>lang,locate:lesson=>{located=lesson;},
    saveProgress:patch=>{Object.assign(view.tutorialProgress,patch);controller.paint();}});
  controller.paint();
  assert.equal(card.hidden,false);
  card.querySelector('[data-tutor-go]').onclick();
  assert.equal(located.unit.id,practice.game.units[0].id);
  assert.equal(practice.game.cities.length,0);
  assert.equal(card.querySelector('h2').textContent,'Found your capital');
  lang='zh-CN';events['civitas-language']();
  assert.equal(card.querySelector('h2').textContent,'建立首都');
  const toggle=card.querySelector('[data-tutor-toggle]');
  toggle.onclick();
  assert.equal(view.tutorialProgress.collapsed,true);
  assert.equal(card.querySelector('#tutorial-body').hidden,true);
  toggle.onclick();
  assert.equal(toggle.getAttribute('aria-expanded'),'true');
  body.classList.add('on-title');events['civitas-screen']();assert.equal(card.hidden,true);
  body.classList.remove('on-title');events['civitas-screen']();assert.equal(card.hidden,false);
  view.tutorial=false;controller.paint();assert.equal(card.hidden,true);
});
