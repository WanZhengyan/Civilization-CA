import {counties,cities,places,regions,sourceOf} from './gazetteer-data.js';

const labels = {profile:['Places','地点档案'],compare:['Compare','横向对比']};
const esc = value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tr = (pair,lang)=>pair[lang==='zh-CN'?1:0];
const number = (value,lang)=>new Intl.NumberFormat(lang,{maximumFractionDigits:2}).format(value);
const choice = (action,label,selected=false)=>'<button type="button" class="gaz-choice" data-act="gaz-'+esc(action)+'" aria-pressed="'+selected+'">'+esc(label)+'</button>';
const fact = (label,value)=>'<div><dt>'+esc(label)+'</dt><dd>'+esc(value)+'</dd></div>';
const link = (url,label)=>'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+'</a>';

export function newGazetteer(region='la') {
  return {region:Object.hasOwn(regions,region)?region:'la',section:'profile',place:null,scale:'city'};
}
function profile(view,lang) {
  const current=places.filter(p=>p.region===view.region);
  const place=current.find(p=>p.id===view.place) || current[0];
  const list=current.map(p=>choice('place-'+p.id,tr(p.name,lang),p===place)).join('');
  const tabs=Object.entries(regions).map(([key,names])=>choice('region-'+key,tr(names,lang),key===view.region)).join('');
  return '<div class="gaz-switch" role="group" aria-label="'+tr(['Region','地区'],lang)+'" >'+tabs+'</div><div class="gaz-places" role="group" aria-label="'+tr(['County or city','县或城市'],lang)+'">'+list+'</div>'+
    '<article class="gaz-place"><h3>'+esc(tr(place.name,lang))+'</h3><p>'+esc(tr(place.scope,lang))+'</p>'+
    '<dl class="gaz-facts">'+fact(tr(['Residents · 1 April 2020','常住人口 · 2020 年 4 月 1 日'],lang),number(place.pop,lang))+'</dl>'+
    link(sourceOf(place),tr(['US Census Bureau · QuickFacts','美国人口普查局 · QuickFacts'],lang))+'</article>';
}
function comparison(view,lang) {
  const records=view.scale==='county'?counties:cities;
  const sorted=[...records].sort((a,b)=>b.pop-a.pop);
  return '<div class="gaz-switch">'+choice('cities',tr(['Cities','城市'],lang),view.scale==='city')+
    choice('counties',tr(['Counties','县'],lang),view.scale==='county')+'</div><table class="gaz-table"><caption>'+
    tr(['2020 Census · residents, largest first','2020 年人口普查 · 按人口从多到少排列'],lang)+'</caption><thead><tr><th scope="col">'+
    tr(['Place','地点'],lang)+'</th><th scope="col">'+tr(['Residents','人口'],lang)+'</th></tr></thead><tbody>'+
    sorted.map(p=>'<tr><th scope="row">'+choice('place-'+p.id,tr(p.name,lang))+'</th><td>'+number(p.pop,lang)+'</td></tr>').join('')+'</tbody></table>';
}
export function gazetteerContent(view,lang,campaign) {
  const modes=Object.entries(labels).map(([id,names])=>choice('section-'+id,tr(names,lang),id===view.section)).join('');
  let body=view.section==='compare'?comparison(view,lang):profile(view,lang,campaign);
  return {kicker:tr(['Field guide','游戏指南'],lang),title:tr(['California gazetteer','加州地名志'],lang),body:'<section class="gaz" translate="no"><p class="gaz-intro">'+
    tr(['Real places and public measurements. Campaign hexes represent approximate locations and have their own game yields.','查阅现实地点与公开数据。战役地块是近似位置，产出按游戏规则计算。'],lang)+'</p>'+
    (Object.keys(labels).length>1?'<nav class="gaz-nav" aria-label="'+tr(['Gazetteer sections','地名志栏目'],lang)+'">'+modes+'</nav>':'')+body+'</section>'};
}
export function gazetteerAction(view,action) {
  if(action==='cities' || action==='counties')view.scale=action==='cities'?'city':'county';
  if(action.startsWith('place-')){
    const place=places.find(p=>p.id===action.slice(6));
    if(place){view.region=place.region;view.place=place.id;view.section='profile';}
  }
  if(action.startsWith('section-') && Object.hasOwn(labels,action.slice(8)))view.section=action.slice(8);
  if(action.startsWith('region-') && Object.hasOwn(regions,action.slice(7)))view.region=action.slice(7);
}
