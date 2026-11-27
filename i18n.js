// Localization lives at the presentation boundary. Campaigns, player names,
// network actions and identifiers use the same representation in both languages.
import { catalog } from './zh-catalog.js';

const preference = 'civitas.language';
export function loadLanguage(storage) {
  try { return storage?.getItem(preference) === 'zh-CN' ? 'zh-CN' : 'en'; }
  catch { return 'en'; }
}
let language = loadLanguage(typeof window !== 'undefined' ? (()=>{try{return window.localStorage;}catch{return null;}})() : null);
export const getLanguage = () => language;

// Map-generated city names can be localized. A renamed city is quoted as
// entered when composed into event sentences and settlement tooltips.
let customCities = new Set();
export function observeCityNames(cities, byId) {
  customCities = new Set(cities.filter(city=>city.name && city.name!==byId[city.tile]?.name).map(city=>city.name));
}
function cityLabel(name) { return customCities.has(name) ? name : zh(name); }

const counters = {
  turn:'回合',round:'轮',hex:'格',target:'个目标',charge:'次使用机会',movement:'点移动力',
  production:'生产力',science:'科研点',culture:'文化',capital:'资金',influence:'影响力',
  discovery:'项发现',city:'座城市',unit:'个单位',district:'块领土',pt:'分'
};
const suffixes = {district:'地区',shore:'岸边',foothills:'丘陵',ridge:'山脊',woodland:'林地',lowlands:'低地',coast:'海岸'};
function count(n,word) {
  const normalized = {cities:'city',discoveries:'discovery',hexes:'hex'}[word] || word.replace(/s$/,'');
  return n+' '+(counters[normalized] || word);
}
const phraseRules = [
  [/^Discovered (.+)\.$/,name=>'发现自然奇观“'+zh(name)+'”。'],
  [/^(.+) (grew to|fell to) (\d+) residents\.$/,(city,verb,n)=>cityLabel(city)+(verb==='grew to'?'的人口增至':'的人口减至')+n+'。'],
  [/^Holding every original capital wins immediately\. Civic points are compared at the end of the round when a faction reaches (\d+), or after round (\d+)\.$/,(score,round)=>'占领所有初始首府即可立刻获胜。有阵营达到 '+score+' 分时，在本轮结束后比较积分；最迟于第 '+round+' 轮结算。'],
  [/^If a faction reaches (\d+) civic points, finish the current round and compare scores\. The same scoring applies after round (\d+)\. The highest score wins, and a tie shares victory\.$/,(score,round)=>'当任一阵营达到 '+score+' 分，在当前轮结束后比较积分。第 '+round+' 轮结束后也按此规则结算。最高分获胜，同分者共享胜利。'],
  [/^(?:TURN|Turn) (\d+)$/i, n=>'第 '+n+' 回合'],
  [/^Round (\d+)$/i,n=>'第 '+n+' 轮'],
  [/^Up to (\d+) turns$/i,n=>'最多 '+n+' 回合'],
  [/^(\d+°\d+′) N\s+(\d+°\d+′) W$/, (lat,lon)=>'北纬 '+lat+'　西经 '+lon],
  [/^HEX ([\d /]+)$/,n=>'地块 '+n],
  [/^Room ([A-Z0-9]{6})$/,code=>'房间 '+code],
  [/^View sites \((\d+)\)$/i,n=>'查看选址（'+n+'）'],
  [/^(\d+) nearby districts?$/i,n=>n+' 块相邻可工作地块'],
  [/^(\d+) sites? within reach\. Follow a blue flag to settle next turn\.$/,n=>'移动范围内有 '+n+' 处候选地。蓝旗表示下回合可建城。'],
  [/^(\d+) sites? (?:is|are) ready to settle this turn\. Follow a gold flag or open View sites\.$/,n=>'本回合有 '+n+' 处可立即建城。寻找金旗，或打开「查看选址」。'],
  [/^(.+) is (\d+) hex(?:es)? away\.( Cities must be at least 3 hexes apart\.)?$/, (name,n,rule)=>'距'+cityLabel(name)+' '+n+' 格。'+(rule?'城市间至少相距 3 格。':'')],
  [/^(.+) already occupies this tile\. Cities must be at least 3 hexes apart\.$/, name=>cityLabel(name)+'已位于此处。城市间至少相距 3 格。'],
  [/^(.+) owns this tile\. Settle on friendly or neutral land\.$/,n=>zh(n)+'拥有此地。请在己方或中立地块建城。'],
  [/^Click a highlighted hex to move your (.+)\.$/,n=>'点击高亮地块移动'+zh(n)+'。'],
  [/^Move here for (\d+) movement$/,n=>'移至此处需 '+n+' 点移动力'],
  [/^(Your|Rival) (.+ unit|unit|Naval crew|Patrol ship|Warship)$/i,(owner,role)=>(owner.toLowerCase()==='your'?'己方':'敌方')+zh(role)],
  [/^Food (\d+\s*\/\s*\d+)$/,v=>'粮食 '+v],
  [/^([+-]?\d+(?: \/ \d+)?) (science|culture) banked$/,(v,k)=>'已积累 '+v+' '+zh(k)],
  [/^banked$/i,()=>'已积累'],
  [/^([+-]?\d+)(?: (science|culture))? (?:per|each) turn$/,(v,k)=>'每回合 '+v+(k?' '+zh(k):'')],
  [/^(\d+ \/ \d+) complete$/,v=>'已完成 '+v],
  [/^(\d+) turns? left$/,n=>'还需 '+n+' 回合'],
  [/^([+-]?\d+(?: \/ \d+)?) (turns?|rounds?|hex(?:es)?|targets?|charges?|movement|production|science|culture|capital|influence|discover(?:y|ies)|cit(?:y|ies)|units?|districts?|pts?)$/i,(v,k)=>count(v,k.toLowerCase())],
  [/^(\d+) district orders remain this turn\.$/,n=>'本回合还可下达 '+n+' 次地区指令。'],
  [/^You need (\d+) (capital|influence)\.$/,(n,k)=>'需要 '+n+' '+zh(k)+'。'],
  [/^Producing (.+)$/,n=>'正在生产'+zh(n)],
  [/^(\d+) (incoming damage|retaliation damage)$/,(n,k)=>(k==='incoming damage'?'受到伤害 ':'反击伤害 ')+n],
  [/^(Frontier|Industrial|Modern) Era$/i,n=>zh(n)],
  [/^Requires (.+?)\.?$/i,n=>'前置条件：'+zh(n)],
  [/^(.+) (is the last civilization standing|ended its turn|won on civic points|controls every original capital|captured every original capital|tied on civic points and share victory)\.$/,(n,verb)=>zh(n)+({'is the last civilization standing':'成为最后幸存的文明。','ended its turn':'结束了回合。','won on civic points':'取得了积分胜利。','controls every original capital':'占领了所有初始首府。','captured every original capital':'占领了所有初始首府。','tied on civic points and share victory':'积分并列，共享胜利。'}[verb])],
  [/^(.+) (won|shared victory) with (\d+) (?:civic )?points\.$/,(n,v,points)=>zh(n)+'以 '+points+' 分'+(v==='won'?'获胜。':'并列获胜。')],
  [/^(.+) (began debating|adopted) (.+)\.$/,(n,v,item)=>zh(n)+(v==='adopted'?'通过了':'开始审议')+zh(item)+'。'],
  [/^Upgrade to (.+)$/,n=>'升级为'+zh(n)],
  [/^(.+) upgraded to (.+)\.$/,(a,b)=>zh(a)+'升级为'+zh(b)+'。'],
  [/^(.+) strategy map\. Use arrow keys to preview a district\. Press Enter or Space to select it\. Use plus and minus to zoom, and Home to reset the view\.$/,region=>zh(region)+'战役地图。用方向键预览地块，回车或空格选择。按加减键缩放，按 Home 重置视图。'],
  [/^(.+) (started production of|completed) (.+)\.$/,(a,v,b)=>cityLabel(a)+(v==='completed'?'完成了':'开始生产')+zh(b)+'。'],
  [/^(.+) (founded a city at|founded) (.+)\.$/,(a,v,b)=>zh(a)+'在'+cityLabel(b)+'建城。'],
  [/^(.+) via (Golden Gate Bridge|Bay Bridge|Coronado Bridge|Angel Island ferry)([.]?)$/, (prefix,bridge,end)=>zh(prefix)+'，经'+zh(bridge)+(end?'。':'')],
  [/^Producing$/i,()=>'正在生产'],
  [/^(.+) (moved to|took control of|claimed|developed|discovered|began researching) (.+)\.$/,(a,verb,b)=>zh(a)+({'moved to':'移至','took control of':'夺取了','claimed':'将领土扩展至','developed':'开发了','discovered':'完成了研究：','began researching':'开始研究'}[verb])+zh(b)+'。'],
  [/^(.+) (captured|attacked) (.+) for (\d+) damage\.$/,(a,v,b,n)=>zh(a)+(v==='captured'?'占领了':'攻击了')+cityLabel(b)+'，造成 '+n+' 点伤害。'],
  [/^(.+) built a (.+?) in (.+)\.$/,(a,b,c)=>zh(a)+'在'+zh(c)+'建成了'+zh(b)+'。'],
  [/^([A-Za-z ]+) in ([^·]+)$/,(a,b)=>catalog.has(a.toLowerCase())?zh(b)+'的'+zh(a):a+' in '+b],
  [/^(.+) (district|shore|foothills|ridge|woodland|lowlands|coast)$/,(name,suffix)=>zh(name)+suffixes[suffix]]
];
function zh(source) {
  if (typeof source !== 'string' || !source) return source;
  const direct = catalog.get(source.toLowerCase());
  if (direct !== undefined) return direct;
  // Resolve the whole semantic phrase before its component chips, so a
  // prerequisite such as “Requires A + B.” keeps one localized prefix.
  for (const [pattern,render] of phraseRules) {
    const match=source.match(pattern);
    if (match) return render(...match.slice(1));
  }
  for (const [separator,joined] of [[' · ',' · '],[' + ','、'],[', ','、'],[' and ','与']]) {
    if (!source.includes(separator)) continue;
    const parts=source.split(separator);
    const result=parts.map(zh);
    if (result.some((part,i)=>part!==parts[i])) return result.join(joined);
  }
  // Some tooltips append a nearest-city sentence to a self-contained rule.
  const stop=source.indexOf('. ');
  if (stop>=0) {
    const first=source.slice(0,stop+1),last=source.slice(stop+2);
    if (catalog.has(first.toLowerCase())) return zh(first)+zh(last);
  }
  return source;
}
export function translate(value, locale = language) {
  if (locale !== 'zh-CN' || typeof value !== 'string') return value;
  return value.replace(/^(\s*)([\s\S]*?)(\s*)$/,(_all,lead,body,trail)=>lead+zh(body)+trail);
}

const memory=new WeakMap();
const attributes=['aria-label','placeholder','title','alt'];
const blocked='[translate="no"],script,style,textarea,code';
let observer;
function applyValue(node,key,raw,setter) {
  const values=memory.get(node) || {};
  const previous=values[key];
  const english=previous && raw===previous.output ? previous.source : raw;
  const output=translate(english);
  if (raw!==output) setter(output);
  if (output!==english || previous) {
    values[key]={source:english,output};
    memory.set(node,values);
  }
}
function localizeElement(element){
  if (!element.getAttribute) return;
  for (const key of attributes) {
    const value=element.getAttribute(key);
    if (value) applyValue(element,key,value,next=>element.setAttribute(key,next));
  }
}
function translateTree(node){
  if(!node || !node.isConnected) return;
  if(node.nodeType===3){
    if(node.parentElement?.closest(blocked)) return;
    applyValue(node,'text',node.data,v=>{node.data=v;});
    return;
  }
  if(node.nodeType!==1 || node.closest(blocked) || node.namespaceURI==='http://www.w3.org/2000/svg') return;
  localizeElement(node);
  for(const child of node.childNodes) translateTree(child);
}
export function installLanguage(){
  if(observer || typeof MutationObserver==='undefined') return;
  const doc=document;
  doc.documentElement.lang=language;
  if(language!=='en') translateTree(doc.documentElement);
  observer=new MutationObserver(records=>{
    if(language==='en') return;
    for(const record of records) {
      if(record.type==='childList') for(const node of record.addedNodes) translateTree(node);
      else if(record.type==='characterData') translateTree(record.target);
      else if(!record.target.closest(blocked)) localizeElement(record.target);
    }
  });
  observer.observe(doc.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attributes});
}
export function setLanguage(next){
  if(!['en','zh-CN'].includes(next))return;
  language=next;
  try {window.localStorage.setItem(preference,next);} catch {/* Private browsing may disallow writes. */}
  document.documentElement.lang=next;
  translateTree(document.documentElement);
  document.dispatchEvent(new Event('civitas-language'));
}
export function languageControl() {
  const choice=(id,label)=>'<button class="modal-tab" type="button" translate="no" lang="'+id+'" aria-pressed="'+(id===language)+'" data-act="language-'+id+'">'+label+'</button>';
  return '<div class="language-preference"><p class="modal-muted">Language</p><div class="modal-tabs" role="group" aria-label="Language">'+choice('en','English')+choice('zh-CN','简体中文')+'</div></div>';
}
