import {counties,cities,places,regions,sourceOf,census2010,landArea,landmarks,coastalWorks,regionalEconomy,fieldTrips} from './gazetteer-data.js';

import {getMap,hexDistance,getRouteDetail} from './rules.js';

export function knownAnchor(place,campaign) {
  if (!place?.anchor || !campaign?.intel || place.region!==(campaign.mapId||'la')) return null;
  const map=getMap(campaign);
  const surveyed=campaign.intel.explored.map(id=>map.byId[id]).filter(Boolean);
  return surveyed.find(tile=>tile.name===place.anchor || tile.locality===place.anchor)?.id ||
    surveyed.find(tile=>tile.district===place.anchor)?.id || null;
}
export function districtProfiles(campaign,tileId) {
  if(!campaign?.intel?.explored?.includes(tileId))return [];
  const tile=getMap(campaign).byId[tileId];
  if(!tile)return [];
  return catalogue.filter(p=>p.region===(campaign.mapId||'la') && p.anchor &&
    (p.anchor===tile.name || p.anchor===tile.district || p.anchor===tile.locality));
}
function districtNotes(view,lang,campaign) {
  const records=districtProfiles(campaign,view.district);
  if(!records.length)return '<p>'+tr(['No charted district selected.','尚未选择已探索地区。'],lang)+'</p>';
  const tile=getMap(campaign).byId[view.district];
  return '<h3>'+esc(tile.name)+'</h3><p>'+tr(['These real places correspond to the selected campaign district. Choose a record to inspect its geographic coverage and public source.','这些现实地点与选中的战役地区相对应。选择档案可查看地理范围与公开来源。'],lang)+'</p>'+indexRows(records,lang);
}
function mapControl(place,lang,campaign) {
  if(!place.anchor)return '';
  const anchor=knownAnchor(place,campaign);
  if(anchor)return '<div class="gaz-switch">'+choice('locate-'+place.id,tr(['Show charted district on map','在地图上查看已探索的地区'],lang))+choice('plan-'+place.id,tr(['Plan a scout visit','规划侦察兵到访'],lang))+'</div>';
  return '<p>'+tr(campaign && place.region===(campaign.mapId||'la')?
    ['Explore the corresponding district to view it on the map.','探索对应地区后，可以在地图上定位。']:
    ['Map navigation is available in the corresponding campaign.','进入对应战役后可以使用地图定位。'],lang)+'</p>';
}
const catalogue=[...places,...landmarks,...coastalWorks];
function entryAction(p) {
  return (p.slug?'place-':p.year?'work-':'site-')+p.id;
}
const labels = {trips:['Field trips','实地路线'],survey:['Field survey','探索记录'],saved:['Notebook','地点收藏'],search:['Search atlas','搜索地名志'],profile:['Places','地点档案'],compare:['Compare','横向对比'],sites:['Field sites','实地档案'],coast:['Coastal timeline','海岸建设年表']};
const esc = value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tr = (pair,lang)=>pair[lang==='zh-CN'?1:0];
const number = (value,lang)=>new Intl.NumberFormat(lang,{maximumFractionDigits:2}).format(value);
const choice = (action,label,selected=false)=>'<button type="button" class="gaz-choice" data-act="gaz-'+esc(action)+'" aria-pressed="'+selected+'">'+esc(label)+'</button>';
const fact = (label,value)=>'<div><dt>'+esc(label)+'</dt><dd>'+esc(value)+'</dd></div>';
const link = (url,label)=>'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+'</a>';

const bookmarksKey='california-gazetteer.bookmarks.v1';
function readPins() {
  try {
    const ids=JSON.parse(globalThis.localStorage?.getItem(bookmarksKey) || '[]');
    return Array.isArray(ids)?[...new Set(ids)].filter(id=>catalogue.some(p=>p.id===id)):[];
  } catch {return [];}
}
function pinControl(view,p,lang) {
  const pinned=view.pins.includes(p.id);
  return choice('pin-'+p.id,tr(pinned?['Remove from notebook','取消收藏']:['Save to notebook','收藏地点'],lang),pinned);
}
export function surveyProgress(campaign) {
  if(!campaign?.intel)return null;
  const region=campaign.mapId||'la';
  const areas=new Map();
  for(const p of catalogue.filter(p=>p.region===region && p.anchor)){
    if(!areas.has(p.anchor))areas.set(p.anchor,{places:[],tile:knownAnchor(p,campaign)});
    areas.get(p.anchor).places.push(p);
  }
  const known=[...areas.values()].filter(a=>a.tile);
  return {region,total:areas.size,known};
}
export function scoutApproaches(place,campaign) {
  const target=knownAnchor(place,campaign);
  if(!target)return [];
  const charted=new Set(campaign.intel.explored);
  return (campaign.units||[]).filter(u=>u.seat===campaign.intel.seat && u.type==='scout' && charted.has(u.tile)).map(u=>{
    const distance=hexDistance(u.tile,target);
    const route=distance?getRouteDetail(campaign,u.id,target):null;
    const cost=route?.path.every(id=>charted.has(id))?route.cost:null;
    return {id:u.id,tile:u.tile,distance,cost,arrived:distance===0};
  }).sort((a,b)=>Number(b.arrived)-Number(a.arrived) || Number(b.cost!==null)-Number(a.cost!==null) ||
    a.distance-b.distance || String(a.id).localeCompare(String(b.id)));
}
function approach(view,lang,campaign) {
  const place=catalogue.find(p=>p.id===view.plan);
  if(!place || !knownAnchor(place,campaign))return '<p>'+tr(['Chart the destination to plan a visit.','探索目的地后可规划到访。'],lang)+'</p>';
  const scouts=scoutApproaches(place,campaign);
  return '<h3>'+tr(['Scout visit','侦察兵到访'],lang)+' · '+esc(tr(place.name,lang))+'</h3>'+choice(entryAction(place),tr(['Open place profile','打开地点档案'],lang))+
    (scouts.length?'<p>'+tr(['Direct distance counts hexes. Movement cost is shown when the campaign allows a route this turn.','直线距离按地块计算。本回合有可行路线时会显示移动力消耗。'],lang)+'</p>'+
      scouts.map(s=>'<article class="gaz-place"><h4>'+tr(['Scout','侦察兵'],lang)+' '+esc(s.id)+'</h4><dl class="gaz-facts">'+
        fact(tr(['Direct distance (hexes)','直线距离（格）'],lang),s.distance)+
        fact(tr(['This turn','本回合'],lang),s.arrived?tr(['On site','已到达'],lang):s.cost!==null?number(s.cost,lang)+' '+tr(['movement','移动力'],lang):tr(['No route in current allowance','当前行动条件下无法到达'],lang))+
        '</dl>'+choice('scout-'+s.id,tr(['Show this scout on map','在地图上查看这名侦察兵'],lang))+'</article>').join(''):
      '<p>'+tr(['Your campaign has no charted scout to assign. Train a scout in a city to plan its visit.','当前没有可用的已探索位置上的侦察兵。在城市训练侦察兵后可规划到访。'],lang)+'</p>');
}
function survey(view,lang,campaign) {
  const progress=surveyProgress(campaign);
  if(!progress)return '<p>'+tr(['Open the field survey from a campaign to track which atlas districts your scouts have charted.','在战役中打开探索记录，追踪已经探明的地名志地区。'],lang)+'</p>';
  const {region,known,total}=progress;
  return '<h3>'+esc(tr(regions[region],lang))+'</h3><label class="gaz-label">'+tr(['Atlas districts charted','已探索的地名志地区'],lang)+' · '+known.length+' / '+total+
    '<progress max="'+total+'" value="'+known.length+'"></progress></label><p>'+tr(['Each distinct campaign district counts once, including districts that have several real-world profiles.','每个战役地区只计一次；同一地区可关联多个现实地点。'],lang)+'</p>'+
    known.map(area=>'<article class="gaz-place"><h4>'+esc(tr(area.places[0].name,lang))+'</h4>'+indexRows(area.places,lang)+mapControl(area.places[0],lang,campaign)+'</article>').join('');
}
function trip(view,lang,campaign) {
  const route=fieldTrips[view.region];
  const records=route.stops.map(([id,en,zh])=>({place:catalogue.find(p=>p.id===id),task:[en,zh]}));
  const onMap=campaign?.intel && view.region===(campaign.mapId||'la');
  const next=onMap?records.find(stop=>!knownAnchor(stop.place,campaign)):null;
  return '<div class="gaz-switch">'+Object.entries(regions).map(([id,r])=>choice('region-'+id,tr(r,lang),id===view.region)).join('')+'</div>'+
    '<h3>'+esc(tr(route.name,lang))+'</h3><p>'+tr(['Three suggested stops. Open each profile to examine its source and charted district.','三个建议停靠点。打开各处档案，查看来源与已探索地区。'],lang)+'</p>'+
    (onMap?'<p role="status">'+(next?tr(['Next uncharted stop','下一个待探索地点'],lang)+' · '+esc(tr(next.place.name,lang)):tr(['All stops charted','全部地点均已探索'],lang))+'</p>':'')+
    '<ol>'+records.map(({place,task})=>'<li>'+choice(entryAction(place),tr(place.name,lang))+'<p>'+
      esc(tr(task,lang))+'</p></li>').join('')+'</ol>'+
    choice('save-trip',tr(['Save these stops to notebook','将这些地点加入收藏'],lang),records.every(s=>view.pins.includes(s.place.id)));
}
function notebook(view,lang) {
  const records=view.pins.map(id=>catalogue.find(p=>p.id===id)).filter(Boolean);
  if(!records.length)return '<p>'+tr(['Save a city, county, field site or coastal project from its profile to build your own field notebook.','在城市、县、实地档案或海岸工程页面收藏地点，即可在这里建立自己的笔记本。'],lang)+'</p>';
  return '<p>'+tr(['Saved on this device','本设备已收藏'],lang)+' · '+records.length+'</p>'+indexRows(records,lang);
}
export function newGazetteer(region='la') {
  return {pins:readPins(),region:Object.hasOwn(regions,region)?region:'la',section:'profile',place:null,scale:'city',metric:'population',unit:'mi'};
}
function profile(view,lang,campaign) {
  const current=places.filter(p=>p.region===view.region);
  const place=current.find(p=>p.id===view.place) || current[0];
  const list=current.map(p=>choice('place-'+p.id,tr(p.name,lang),p===place)).join('');
  const tabs=Object.entries(regions).map(([key,names])=>choice('region-'+key,tr(names,lang),key===view.region)).join('');
  return '<div class="gaz-switch" role="group" aria-label="'+tr(['Region','地区'],lang)+'" >'+tabs+'</div><div class="gaz-places" role="group" aria-label="'+tr(['County or city','县或城市'],lang)+'">'+list+'</div>'+
    '<article class="gaz-place"><h3>'+esc(tr(place.name,lang))+'</h3><p>'+esc(tr(place.scope,lang))+'</p>'+
    '<dl class="gaz-facts">'+fact(tr(['Residents · 1 April 2020','常住人口 · 2020 年 4 月 1 日'],lang),number(place.pop,lang))+fact(tr(['Residents · 1 April 2010','常住人口 · 2010 年 4 月 1 日'],lang),number(census2010[place.id],lang))+fact(tr(['Change over the decade','十年净变化'],lang),number(place.pop-census2010[place.id],lang))+
    fact(tr(['Land area · 2020','土地面积 · 2020 年'],lang),number(area(place,view.unit),lang)+' '+areaUnit(view.unit,lang))+'</dl>'+
    '<div class="gaz-switch">'+unitControls(view,lang)+'</div>'+
    (Object.hasOwn(regionalEconomy.jobs.values,place.id)?'<h4>'+tr(['County economy','县域经济'],lang)+'</h4><dl class="gaz-facts">'+
      Object.values(regionalEconomy).map(m=>fact(tr(m.label,lang),number(m.values[place.id],lang))).join('')+'</dl>':'')+
    link(sourceOf(place),tr(['US Census Bureau · QuickFacts','美国人口普查局 · QuickFacts'],lang))+pinControl(view,place,lang)+mapControl(place,lang,campaign)+'</article>';
}
const area=(p,unit)=>landArea[p.id]*(unit==='km'?2.589988110336:1);
const areaUnit=(unit,lang)=>tr(unit==='km'?['km²','平方公里']:['mi²','平方英里'],lang);
const unitControls=(v,lang)=>['mi','km'].map(unit=>choice('unit-'+unit,areaUnit(unit,lang),v.unit===unit)).join('');
const metrics={
  density:{label:['Residents per land area · 2020','人口密度 · 2020 年'],value:(p,unit)=>p.pop/area(p,unit)},
  population:{label:['Residents in 2020','2020 年人口'],value:p=>p.pop},
  growth:{label:['Population change, 2010–20 (%)','2010–20 人口变化（%）'],value:p=>100*(p.pop-census2010[p.id])/census2010[p.id]}
};
function comparison(view,lang) {
  const records=view.scale==='county'?counties:cities;
  const available=view.scale==='county'?{...metrics,...Object.fromEntries(Object.entries(regionalEconomy).map(([id,m])=>
    [id,{label:m.label,value:p=>m.values[p.id]}]))}:metrics;
  const metric=available[view.metric] || metrics.population;
  const sorted=[...records].sort((a,b)=>metric.value(b,view.unit)-metric.value(a,view.unit));
  const controls=Object.entries(available).map(([id,m])=>choice('metric-'+id,tr(m.label,lang),m===metric)).join('');
  return '<div class="gaz-switch">'+choice('cities',tr(['Cities','城市'],lang),view.scale==='city')+
    choice('counties',tr(['Counties','县'],lang),view.scale==='county')+'</div><div class="gaz-switch">'+controls+'</div>'+
    (view.metric==='density'?'<div class="gaz-switch">'+unitControls(view,lang)+'</div><p>'+tr(['Residents divided by reported land area in ','人口除以普查公布的土地面积，单位为'],lang)+areaUnit(view.unit,lang)+'</p>':'')+
    '<table class="gaz-table"><caption>'+tr(['US Census Bureau · highest first','美国人口普查局 · 由高到低'],lang)+'</caption><thead><tr><th scope="col">'+
    tr(['Place','地点'],lang)+'</th><th scope="col">'+tr(metric.label,lang)+'</th></tr></thead><tbody>'+
    sorted.map(p=>'<tr><th scope="row">'+choice('place-'+p.id,tr(p.name,lang))+'</th><td>'+number(metric.value(p,view.unit),lang)+'</td></tr>').join('')+'</tbody></table>';
}
const normalize=value=>String(value||'').normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').trim();
export function searchPlaces(query) {
  const words=normalize(query).split(/\s+/).filter(Boolean);
  return catalogue.filter(p=>{
    const text=normalize([...p.name,...regions[p.region],p.anchor].filter(Boolean).join(' '));
    return words.every(word=>text.includes(word));
  });
}
function indexRows(records,lang) {
  return '<ul class="gaz-index">'+records.map(p=>'<li>'+choice(entryAction(p),tr(p.name,lang))+' <span>'+
    esc(tr(regions[p.region],lang))+'</span></li>').join('')+'</ul>';
}
function searchResults(query,lang) {
  const matches=searchPlaces(query);
  return '<p role="status">'+tr(['Matching places','匹配地点'],lang)+' · '+matches.length+'</p>'+indexRows(matches,lang);
}
function search(view,lang) {
  return '<label class="gaz-label">'+tr(['Search a place or region in English or Chinese','用中文或英文搜索地点或地区'],lang)+
    '<input type="search" data-gaz-query maxlength="80" value="'+esc(view.query||'')+'"></label><div data-gaz-results>'+searchResults(view.query,lang)+'</div>';
}
export function bindGazetteer(dialog,view,lang) {
  const input=dialog.querySelector('[data-gaz-query]');
  if(!input)return;
  input.addEventListener('input',()=>{
    view.query=input.value.slice(0,80);
    dialog.querySelector('[data-gaz-results]').innerHTML=searchResults(view.query,lang);
  });
}
function coast(view,lang,campaign) {
  const index=Math.max(0,coastalWorks.findIndex(p=>p.id===view.work || !view.work && p.region===view.region));
  const p=coastalWorks[index],previous=coastalWorks[index-1];
  return '<ol class="gaz-timeline">'+coastalWorks.map((x,i)=>'<li>'+choice('work-'+x.id,x.year+' · '+tr(x.name,lang),i===index)+'</li>').join('')+'</ol>'+
    '<article class="gaz-place"><h3>'+esc(tr(p.name,lang))+'</h3><p>'+p.year+' · '+tr(regions[p.region],lang)+'</p><p>'+esc(tr(p.context,lang))+'</p>'+
    (previous?'<p>'+tr(['Years after the preceding project','距上一个工程的年数'],lang)+' · '+(p.year-previous.year)+'</p>':'')+
    link(p.url,tr(p.publisher,lang))+pinControl(view,p,lang)+mapControl(p,lang,campaign)+'</article>';
}
function sites(view,lang,campaign) {
  const selected=landmarks.find(p=>p.id===view.site) || landmarks.find(p=>p.region===view.region);
  const list=landmarks.map(p=>choice('site-'+p.id,tr(p.name,lang),p===selected)).join('');
  return '<div class="gaz-places">'+list+'</div><article class="gaz-place"><h3>'+esc(tr(selected.name,lang))+
    '</h3><p>'+esc(tr(regions[selected.region],lang))+'</p><dl class="gaz-facts">'+
    fact(tr(selected.date,lang),tr(selected.measure,lang))+'</dl><p>'+esc(tr(selected.context,lang))+'</p>'+
    link(selected.url,tr(selected.publisher,lang))+pinControl(view,selected,lang)+mapControl(selected,lang,campaign)+'</article>';
}
export function gazetteerContent(view,lang,campaign) {
  const primary=['profile','compare','search'];
  const sectionButton=id=>choice('section-'+id,tr(labels[id],lang),id===view.section);
  const more=Object.keys(labels).filter(id=>!primary.includes(id));
  const modes=primary.map(sectionButton).join('')+'<details class="gaz-more"'+(more.includes(view.section)?' open':'')+
    '><summary>'+tr(['Field tools','实地工具'],lang)+'</summary><div class="gaz-switch">'+more.map(sectionButton).join('')+'</div></details>';
  let body=view.section==='district'?districtNotes(view,lang,campaign):view.section==='approach'?approach(view,lang,campaign):view.section==='trips'?trip(view,lang,campaign):view.section==='survey'?survey(view,lang,campaign):view.section==='saved'?notebook(view,lang):view.section==='search'?search(view,lang):view.section==='coast'?coast(view,lang,campaign):view.section==='sites'?sites(view,lang,campaign):view.section==='compare'?comparison(view,lang):profile(view,lang,campaign);
  return {kicker:tr(['Field guide','游戏指南'],lang),title:tr(['California gazetteer','加州地名志'],lang),body:'<section class="gaz" translate="no"><p class="gaz-intro">'+
    tr(['Real places and public measurements. Campaign hexes represent approximate locations and have their own game yields.','查阅现实地点与公开数据。战役地块是近似位置，产出按游戏规则计算。'],lang)+'</p>'+
    (Object.keys(labels).length>1?'<nav class="gaz-nav" aria-label="'+tr(['Gazetteer sections','地名志栏目'],lang)+'">'+modes+'</nav>':'')+body+'</section>'};
}
export function gazetteerAction(view,action,campaign) {
  if(action.startsWith('plan-')){
    const place=catalogue.find(p=>p.id===action.slice(5));
    if(knownAnchor(place,campaign)){view.plan=place.id;view.section='approach';}
    return;
  }
  if(action.startsWith('scout-')){
    const place=catalogue.find(p=>p.id===view.plan);
    return scoutApproaches(place,campaign).find(s=>String(s.id)===action.slice(6))?.tile || null;
  }
  if(action==='save-trip'){
    view.pins=[...new Set([...view.pins,...fieldTrips[view.region].stops.map(([id])=>id)])];
    try {globalThis.localStorage?.setItem(bookmarksKey,JSON.stringify(view.pins));} catch {}
    return;
  }
  if(action.startsWith('pin-')){
    const id=action.slice(4);
    if(!catalogue.some(p=>p.id===id))return;
    view.pins=view.pins.includes(id)?view.pins.filter(p=>p!==id):[...view.pins,id];
    try {globalThis.localStorage?.setItem(bookmarksKey,JSON.stringify(view.pins));} catch {}
    return;
  }
  if(action.startsWith('locate-'))return knownAnchor(catalogue.find(p=>p.id===action.slice(7)),campaign);
  if(['unit-mi','unit-km'].includes(action))view.unit=action.slice(5);
  if(action.startsWith('metric-') && (Object.hasOwn(metrics,action.slice(7)) || view.scale==='county' && Object.hasOwn(regionalEconomy,action.slice(7))))view.metric=action.slice(7);
  if(action==='cities' || action==='counties'){
    view.scale=action==='cities'?'city':'county';
    if(view.scale==='city' && Object.hasOwn(regionalEconomy,view.metric))view.metric='population';
  }
  if(action.startsWith('place-')){
    const place=places.find(p=>p.id===action.slice(6));
    if(place){view.region=place.region;view.place=place.id;view.section='profile';}
  }
  if(action.startsWith('work-')){
    const p=coastalWorks.find(p=>p.id===action.slice(5));
    if(p){view.work=p.id;view.region=p.region;view.section='coast';}
  }
  if(action.startsWith('site-')){
    const site=landmarks.find(p=>p.id===action.slice(5));
    if(site){view.site=site.id;view.region=site.region;view.section='sites';}
  }
  if(action.startsWith('section-') && Object.hasOwn(labels,action.slice(8)))view.section=action.slice(8);
  if(action.startsWith('region-') && Object.hasOwn(regions,action.slice(7)))view.region=action.slice(7);
}
