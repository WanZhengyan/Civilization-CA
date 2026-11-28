import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { translate, loadLanguage, languageControl, setLanguage, observeCityNames } from '../docs/i18n.js';
import * as rules from '../docs/rules.js';

const zh=s=>translate(s,'zh-CN');

test('Chinese covers every trainable unit, building, improvement and technology',()=>{
  for (const def of Object.values({...rules.UNIT_TYPES,...rules.BUILDINGS,...rules.IMPROVEMENTS,...rules.TECHS,...rules.CIVICS})) {
    assert.match(zh(def.name),/[\u3400-\u9fff]/,def.name);
    if(def.description) assert.match(zh(def.description),/[\u3400-\u9fff]/,def.description);
    assert.equal(translate(def.name,'en'),def.name);
  }
});
test('settlement, research, production, map labels and dynamic campaign events use Chinese',()=>{
  for(const sample of [
    '5 sites within reach. Follow a blue flag to settle next turn.',
    'Downtown LA is 1 hex away. Cities must be at least 3 hexes apart.',
    'Changing research keeps your banked science.','Changing debates keeps your banked culture.',
    '2 turns left','1 turn left','5 science banked','3 culture banked',
    'Current site · Pico-Union','Pico-Robertson · 2 movement · Move here and found a city next turn.',
    'Your Civilian unit','+3 science per turn','Requires Steam Power + Ballistics',
    'Pacific Union attacked Militia in Hollywood Hills for 13 damage.',
    'California Republic began debating Municipal Charter.','Oakland completed Steam frigate.',
    'Palo Alto woodland','3 / 9 complete','2 / 2 movement','2 turns · 9 production'
  ]) assert.doesNotMatch(zh(sample),/[A-Za-z]/,sample);
  const updated = 'Holding every original capital wins immediately. Civic points are compared at the end of the round when a faction reaches 125, or after round 30.';
  assert.match(zh(updated),/达到 125 分/);
  assert.doesNotMatch(zh(updated),/[A-Za-z]/);
  assert.equal(zh('Room AB123C'),'房间 AB123C');
  assert.equal(zh('Seaside 设施 42'),'Seaside 设施 42');
  assert.match(zh('Seaside 设施 42 completed Workshop.'),/Seaside 设施 42/);
});
test('English is the fresh-install default and only valid stored languages are honored',()=>{
  const storage=value=>({getItem:()=>value});
  assert.equal(loadLanguage(storage('zh-CN')),'zh-CN');
  for(const choice of [null,'en','broken']) assert.equal(loadLanguage(storage(choice)),'en');
  assert.equal(loadLanguage({getItem(){throw Error();}}),'en');
  assert.match(languageControl(),/data-act="language-zh-CN"/);
});
test('switching immediately updates displayed labels and preserves nicknames and input values',()=>{
  const attrKeys=['title','aria-label','placeholder','alt'];
  class Element {
    constructor(tag,attrs={},children=[]){Object.assign(this,{tag,attrs,childNodes:children,nodeType:1,isConnected:true}); for(const child of children)child.parentElement=this;}
    closest(){return this.attrs.translate==='no'?this:this.parentElement?.closest();}
    getAttribute(k){return this.attrs[k];}
    setAttribute(k,v){this.attrs[k]=v;}
  }
  const text=data=>({nodeType:3,isConnected:true,data});
  const game=text('Game menu'),name=text('Builder'),title=new Element('button',{'aria-label':'Game menu'},[game]);
  const field=new Element('input',{placeholder:'Your name',value:'Coast'});
  const html=new Element('html',{},[title,new Element('span',{translate:'no'},[name]),field]);
  const values=new Map();
  globalThis.document={documentElement:html,dispatchEvent(){}};
  globalThis.window={localStorage:{setItem:(k,v)=>values.set(k,v)}};
  try {
    setLanguage('zh-CN');
    assert.equal(html.lang,'zh-CN'); assert.equal(game.data,'游戏菜单'); assert.equal(name.data,'Builder');
    assert.equal(field.getAttribute('value'),'Coast'); assert.equal(field.getAttribute('placeholder'),'你的名字');
    assert.equal(values.get('civitas.language'),'zh-CN'); assert.equal(title.getAttribute(attrKeys[1]),'游戏菜单');
    setLanguage('en');
    assert.equal(game.data,'Game menu'); assert.equal(field.getAttribute('placeholder'),'Your name');
    assert.equal(languageControl().includes('aria-pressed="true" data-act="language-en"'),true);
  } finally { delete globalThis.window;delete globalThis.document; }
});

test('all campaign regions and renamed settlement messages keep their intended labels',()=>{
  for(const region of rules.CAMPAIGN_MAPS || []) {
    for(const label of [region.name,region.shortName,region.description]) assert.doesNotMatch(zh(label),/[a-z]/i,label);
    for(const tile of rules.getMap(region.id).tiles) assert.doesNotMatch(zh(tile.name),/[a-z]/i,tile.name);
  }
  observeCityNames([{name:'Workshop',tile:'0,0'}],{'0,0':{name:'Sausalito'}});
  try {
    assert.equal(zh('Workshop completed Workshop.'),'Workshop完成了工坊。');
    assert.equal(zh('Workshop is 2 hexes away.'),'距Workshop 2 格。');
    assert.equal(zh('Upgrade to Rifle Company'),'升级为步枪连');
    assert.equal(zh('Requires Ballistics + Steam Power.'),'前置条件：弹道学、蒸汽动力');
  } finally { observeCityNames([],{}); }
});


test('city ownership, district decisions and the map key use distinct terms in both languages',()=>{
  const terms={
    'City':'城市','Landmark':'地标','Original capital':'初始首府','Captured original capital':'已易主的初始首府',
    'Controlled by':'当前控制方','Original capital of':'建都阵营','District':'地区',
    'Claim district':'拓展领土','Contest district':'争夺地区',
    '1 border order':'1 次边境指令','1 border order remains this turn.':'本回合还可下达 1 次边境指令。',
    'Capital per turn':'每回合资金收入','Influence per turn':'每回合影响力收入',
    'Your capital city':'己方首府','Rival capital city':'敌方首府','Map key':'地图图例'
  };
  for(const [source,chinese] of Object.entries(terms)){
    assert.equal(translate(source,'zh-CN'),chinese);
    assert.equal(translate(source,'en'),source);
  }
});

test('both editions explain the map toggle, persistent capitals, border orders and civic scoring',()=>{
  const file=name=>readFileSync(new URL('../docs/'+name,import.meta.url),'utf8');
  const toggle=file('game.html').match(/id="map-labels"[^>]*title="([^"]+)"[^>]*>([^<]+)<\/label>/);
  assert.ok(toggle,'map layers must expose a label and a hint');
  assert.equal(translate(toggle[2],'en'),'Geographic labels');
  assert.equal(zh(toggle[2]),'地名与地标名称');
  assert.match(toggle[1],/city names stay enabled/i);
  assert.match(zh(toggle[1]),/城市名称不受此开关影响/);

  const chapters=new Map([...file('game.js').matchAll(/\['([^']+)', '([^']+)'\]/g)].map(match=>[match[1],match[2]]));
  const cases=[
    ['Read city markers',/stays with that city after capture/,/占领后仍保留王冠/],
    ['Plan your turn',/two border orders/,/每回合有两次边境指令/],
    ['Count civic points',/each finished building adds 2/,/每座竣工建筑加 2 分/]
  ];
  for(const [heading,english,chinese] of cases){
    const body=chapters.get(heading);
    assert.match(translate(body,'en'),english);
    assert.match(zh(body),chinese);
    assert.doesNotMatch(zh(heading)+zh(body),/[A-Za-z]/);
  }
});

test('alliances keep consistent Chinese labels in the field and victory report',()=>{
  for (const [text,expected] of [
    ['Allied recon unit','盟友侦察单位'],
    ['Team B controls every original capital.','B 队占领了所有初始首府。'],
    ['Team B is the last team standing.','B 队成为最后幸存的队伍。'],
    ['Team A and Team C shared victory with 125 civic points.','A 队与C 队以 125 分并列获胜。']
  ]) {
    assert.equal(zh(text),expected);
    assert.equal(translate(text,'en'),text);
  }
});
