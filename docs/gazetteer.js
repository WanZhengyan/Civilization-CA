import {counties,cities,places,regions,sourceOf,census2010,landArea,landmarks,coastalWorks,regionalEconomy} from './gazetteer-data.js';

import {getMap} from './rules.js';

export function knownAnchor(place,campaign) {
  if (!place?.anchor || !campaign?.intel || place.region!==(campaign.mapId||'la')) return null;
  const map=getMap(campaign);
  const surveyed=campaign.intel.explored.map(id=>map.byId[id]).filter(Boolean);
  return surveyed.find(tile=>tile.name===place.anchor || tile.locality===place.anchor)?.id ||
    surveyed.find(tile=>tile.district===place.anchor)?.id || null;
}
function mapControl(place,lang,campaign) {
  if(!place.anchor)return '';
  const anchor=knownAnchor(place,campaign);
  if(anchor)return '<div class="gaz-switch">'+choice('locate-'+place.id,tr(['Show charted district on map','在地图上查看已探索的地区'],lang))+'</div>';
  return '<p>'+tr(campaign && place.region===(campaign.mapId||'la')?
    ['Explore the corresponding district to view it on the map.','探索对应地区后，可以在地图上定位。']:
    ['Map navigation is available in the corresponding campaign.','进入对应战役后可以使用地图定位。'],lang)+'</p>';
}
const labels = {profile:['Places','地点档案'],compare:['Compare','横向对比'],sites:['Field sites','实地档案'],coast:['Coastal timeline','海岸建设年表']};
const esc = value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tr = (pair,lang)=>pair[lang==='zh-CN'?1:0];
const number = (value,lang)=>new Intl.NumberFormat(lang,{maximumFractionDigits:2}).format(value);
const choice = (action,label,selected=false)=>'<button type="button" class="gaz-choice" data-act="gaz-'+esc(action)+'" aria-pressed="'+selected+'">'+esc(label)+'</button>';
const fact = (label,value)=>'<div><dt>'+esc(label)+'</dt><dd>'+esc(value)+'</dd></div>';
const link = (url,label)=>'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+'</a>';

export function newGazetteer(region='la') {
  return {region:Object.hasOwn(regions,region)?region:'la',section:'profile',place:null,scale:'city',metric:'population',unit:'mi'};
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
    link(sourceOf(place),tr(['US Census Bureau · QuickFacts','美国人口普查局 · QuickFacts'],lang))+mapControl(place,lang,campaign)+'</article>';
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
function coast(view,lang,campaign) {
  const index=Math.max(0,coastalWorks.findIndex(p=>p.id===view.work || !view.work && p.region===view.region));
  const p=coastalWorks[index],previous=coastalWorks[index-1];
  return '<ol class="gaz-timeline">'+coastalWorks.map((x,i)=>'<li>'+choice('work-'+x.id,x.year+' · '+tr(x.name,lang),i===index)+'</li>').join('')+'</ol>'+
    '<article class="gaz-place"><h3>'+esc(tr(p.name,lang))+'</h3><p>'+p.year+' · '+tr(regions[p.region],lang)+'</p><p>'+esc(tr(p.context,lang))+'</p>'+
    (previous?'<p>'+tr(['Years after the preceding project','距上一个工程的年数'],lang)+' · '+(p.year-previous.year)+'</p>':'')+
    link(p.url,tr(p.publisher,lang))+mapControl(p,lang,campaign)+'</article>';
}
function sites(view,lang,campaign) {
  const selected=landmarks.find(p=>p.id===view.site) || landmarks.find(p=>p.region===view.region);
  const list=landmarks.map(p=>choice('site-'+p.id,tr(p.name,lang),p===selected)).join('');
  return '<div class="gaz-places">'+list+'</div><article class="gaz-place"><h3>'+esc(tr(selected.name,lang))+
    '</h3><p>'+esc(tr(regions[selected.region],lang))+'</p><dl class="gaz-facts">'+
    fact(tr(selected.date,lang),tr(selected.measure,lang))+'</dl><p>'+esc(tr(selected.context,lang))+'</p>'+
    link(selected.url,tr(selected.publisher,lang))+mapControl(selected,lang,campaign)+'</article>';
}
export function gazetteerContent(view,lang,campaign) {
  const modes=Object.entries(labels).map(([id,names])=>choice('section-'+id,tr(names,lang),id===view.section)).join('');
  let body=view.section==='coast'?coast(view,lang,campaign):view.section==='sites'?sites(view,lang,campaign):view.section==='compare'?comparison(view,lang):profile(view,lang,campaign);
  return {kicker:tr(['Field guide','游戏指南'],lang),title:tr(['California gazetteer','加州地名志'],lang),body:'<section class="gaz" translate="no"><p class="gaz-intro">'+
    tr(['Real places and public measurements. Campaign hexes represent approximate locations and have their own game yields.','查阅现实地点与公开数据。战役地块是近似位置，产出按游戏规则计算。'],lang)+'</p>'+
    (Object.keys(labels).length>1?'<nav class="gaz-nav" aria-label="'+tr(['Gazetteer sections','地名志栏目'],lang)+'">'+modes+'</nav>':'')+body+'</section>'};
}
export function gazetteerAction(view,action,campaign) {
  if(action.startsWith('locate-'))return knownAnchor([...places,...landmarks,...coastalWorks].find(p=>p.id===action.slice(7)),campaign);
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
