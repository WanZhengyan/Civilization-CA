import test from 'node:test';
import assert from 'node:assert/strict';
import {newSolo,restoreSolo,soloSlotKey,SOLO_KEY} from '../docs/solo-saves.js';
import {createGame,getScoreTarget} from '../docs/rules.js';

test('all solo setups keep their chosen opponents, practice mode and civic target after reload',()=>{
  for (const region of ['la','sf','sd']) for (const size of ['standard','large']) {
    for (const rivals of [0,1,2,3]) for (const goal of [100,125,150]) {
      const game = newSolo(region,size,rivals,goal);
      const loaded = restoreSolo(JSON.parse(JSON.stringify(game)));
      assert.equal(loaded.mapId,region);
      assert.equal(loaded.mapSize || 'standard',size);
      assert.equal(loaded.players.length,rivals+1);
      assert.equal(loaded.players.filter(p=>p.bot).length,rivals);
      assert.equal(Boolean(loaded.practice),rivals === 0);
      assert.equal(getScoreTarget(loaded),goal);
      assert.equal(loaded.seed,game.seed);
    }
  }
  const practice = newSolo('la','standard',0);
  assert.equal(restoreSolo({...practice,practice:false}),null);
  assert.equal(restoreSolo({...practice,players:[{bot:true}]}),null);
  assert.equal(restoreSolo({...practice,players:[{},{}]}),null);
});

// Exercise the normal dialog handlers and storage writes. Only the DOM, URL
// and storage surface are replaced; each campaign and player view is real.
async function openPage(address,storage) {
  const document = new EventTarget();
  const body = {scrollTop:0};
  const dialog = Object.assign(new EventTarget(),{
    innerHTML:'', querySelector:selector=>selector === '.modal-body' ? body : null,
    setAttribute(){}, showModal(){this.open=true;}, close(){this.open=false;}
  });
  const title = Object.assign(new EventTarget(),{querySelectorAll:()=>[]});
  const elements = {modal:dialog,'title-screen':title,'title-nav':new EventTarget()};
  Object.assign(document,{
    getElementById:id=>elements[id], querySelector:selector=>selector === 'link[data-region-styles]' ? {} : null,
    body:{classList:{toggle(){}}}
  });
  const location = new URL(address);
  const localStorage = {
    getItem:key=>storage.get(key) ?? null,
    setItem:(key,value)=>storage.set(key,String(value)), removeItem:key=>storage.delete(key)
  };
  const history = {replaceState(_data,_title,url){location.href = url.href;}};
  Object.assign(globalThis,{document,location,history,window:{localStorage,scrollTo(){}},localStorage,requestAnimationFrame:cb=>cb()});
  const {Game} = await import('../docs/game.js?session='+crypto.randomUUID());
  await Game.init({render(){},locate(){},toast(){}});
  function dispatch(type,target) {
    const event = new Event(type);
    Object.defineProperty(event,'target',{value:target});
    dialog.dispatchEvent(event);
  }
  return {Game,dialog,body,location,
    select(name,value){dispatch('change',{name,value:String(value)});},
    click(act){
      assert.ok(dialog.innerHTML.includes('data-act="'+act+'"'),'Missing dialog action '+act);
      dispatch('click',{closest:()=>({dataset:{act}})});
    }
  };
}

test('an occupied slot resumes its original campaign, confirms only a replacement, and preserves other slots',async()=>{
  const base='https://example.test/Civilization-CA/game.html';
  const storage=new Map();
  const old=createGame([{name:'You'},{bot:true},{bot:true}],'la',{seed:417005,scoreTarget:100});
  old.round=7;
  storage.set(SOLO_KEY,JSON.stringify(old));
  const otherKey=soloSlotKey('sf');
  const legacy=createGame([{name:'You'},{bot:true}],'sf',{seed:17});
  delete legacy.scoreTarget;
  storage.set(otherKey,JSON.stringify(legacy));
  const saved=()=>JSON.parse(storage.get(SOLO_KEY));
  const page=await openPage(base+'?setup=solo',storage);
  const markup=page.dialog.innerHTML;
  assert.ok(markup.indexOf('data-act="load-region"') < markup.indexOf('name="rivals"'));
  assert.ok(markup.indexOf('name="rivals"') < markup.indexOf('name="mapId"'));
  assert.ok(markup.indexOf('name="scoreTarget"') < markup.indexOf('name="mapId"'));

  page.select('rivals',0);
  page.select('scoreTarget',150);
  page.click('load-region');
  assert.equal(saved().seed,417005);
  assert.equal(saved().players.length,3);
  assert.equal(getScoreTarget(saved()),100);
  assert.equal(saved().round,7);
  assert.equal(page.location.hash,'#campaign');
  page.Game.open('campaign-atlas');
  page.select('rivals',0);
  page.select('scoreTarget',150);
  page.body.scrollTop=240;
  const before=storage.get(SOLO_KEY);
  page.click('start-configured');
  assert.match(page.dialog.innerHTML,/Replace saved campaign\?/);
  assert.equal(page.body.scrollTop,0);
  assert.equal(storage.get(SOLO_KEY),before);
  page.click('campaign-atlas');
  assert.match(page.dialog.innerHTML,/name="rivals" value="0" checked/);
  assert.match(page.dialog.innerHTML,/name="scoreTarget" value="150" checked/);
  assert.equal(storage.get(SOLO_KEY),before);

  page.click('start-configured');
  page.click('restart');
  assert.equal(saved().round,1);
  assert.equal(saved().practice,true);
  assert.equal(getScoreTarget(saved()),150);
  assert.equal(saved().players.length,1);
  assert.equal(storage.get(otherKey),JSON.stringify(legacy));
  const practiceSeed=saved().seed;
  const reopened=await openPage(page.location.href,storage);
  assert.equal(reopened.dialog.open,undefined);
  reopened.Game.open('campaign-atlas');
  assert.match(reopened.dialog.innerHTML,/name="rivals" value="0" checked/);
  assert.match(reopened.dialog.innerHTML,/name="scoreTarget" value="150" checked/);
  reopened.select('mapId','sf');
  reopened.click('load-region');
  assert.equal(saved().seed,17);
  assert.equal(getScoreTarget(saved()),125);
  assert.equal(JSON.parse(storage.get(soloSlotKey('la'))).seed,practiceSeed);

  reopened.Game.open('campaign-atlas');
  reopened.select('mapSize','large');
  assert.doesNotMatch(reopened.dialog.innerHTML,/data-act="load-region"/);
  reopened.select('scoreTarget',100);
  reopened.select('rivals',2);
  reopened.click('start-configured');
  assert.equal(saved().mapId,'sf');
  assert.equal(saved().mapSize,'large');
  assert.equal(saved().players.length,3);
  assert.equal(getScoreTarget(saved()),100);
  assert.equal(JSON.parse(storage.get(otherKey)).seed,17);
});

test('the guide and standings use the chosen target and a practice finish reports the score earned',async()=>{
  const link='https://example.test/Civilization-CA/game.html#campaign';
  const active=newSolo('la','standard',2,150);
  const page=await openPage(link,new Map([[SOLO_KEY,JSON.stringify(active)]]));
  page.Game.open('standings');
  assert.match(page.dialog.innerHTML,/reaches 150,/);
  page.Game.open('help');
  page.click('guide-research');
  assert.match(page.dialog.innerHTML,/reaches 150 civic points/);

  for (const [earned,winners,heading] of [[24,[],'Practice complete'],[152,[0],'Practice goal reached']]) {
    const practice=newSolo('sd','large',0,150);
    Object.assign(practice,{phase:'finished',victoryReason:'practice',round:30,winners});
    practice.players[0].score=earned;
    const ended=await openPage(link,new Map([[SOLO_KEY,JSON.stringify(practice)]]));
    assert.match(ended.dialog.innerHTML,new RegExp(heading));
    assert.match(ended.dialog.innerHTML,new RegExp(earned+' / 150'));
    assert.doesNotMatch(ended.dialog.innerHTML,/won on civic points|last civilization standing|tie shares victory/);
  }
});

test('team standings keep other seats’ scores private during play and explain shared victories using final team totals',async()=>{
  const game=createGame([{name:'West'},{bot:true},{name:'友军'},{bot:true}],'la',{seed:417005,teams:[0,1,0,1]});
  game.players.forEach((p,i)=>{p.score=[75,65,55,65][i];});
  const link='https://example.test/Civilization-CA/game.html#campaign';
  const saved=()=>new Map([[SOLO_KEY,JSON.stringify(game)]]);
  const active=await openPage(link,saved());
  active.Game.open('standings');
  assert.match(active.dialog.innerHTML,/Team standings/);
  assert.match(active.dialog.innerHTML,/Team civic target/);
  assert.match(active.dialog.innerHTML,/translate="no">友军/);
  assert.doesNotMatch(active.dialog.innerHTML,/(55|65|130) pts/);
  active.Game.open('help');
  active.click('guide-research');
  assert.match(active.dialog.innerHTML,/Team civic target<\/strong> · 250/);
  Object.assign(game,{phase:'finished',round:30,victoryReason:'civic',winners:[0,1,2,3]});
  const done=await openPage(link,saved());
  assert.match(done.dialog.innerHTML,/Shared victory/);
  assert.equal(done.dialog.innerHTML.match(/130 pts/g)?.length,2);
  assert.ok(done.dialog.innerHTML.includes('Team A') && done.dialog.innerHTML.includes('Team B'));
});
