import {counties,regions,sourceOf} from './gazetteer-data.js';

const labels = {profile:['Places','地点档案']};
const esc = value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tr = (pair,lang)=>pair[lang==='zh-CN'?1:0];
const number = (value,lang)=>new Intl.NumberFormat(lang,{maximumFractionDigits:2}).format(value);
const choice = (action,label,selected=false)=>'<button type="button" class="gaz-choice" data-act="gaz-'+esc(action)+'" aria-pressed="'+selected+'">'+esc(label)+'</button>';
const fact = (label,value)=>'<div><dt>'+esc(label)+'</dt><dd>'+esc(value)+'</dd></div>';
const link = (url,label)=>'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+'</a>';

export function newGazetteer(region='la') {
  return {region:Object.hasOwn(regions,region)?region:'la',section:'profile'};
}
function profile(view,lang) {
  const place=counties.find(p=>p.region===view.region);
  const tabs=Object.entries(regions).map(([key,names])=>choice('region-'+key,tr(names,lang),key===view.region)).join('');
  return '<div class="gaz-switch" role="group" aria-label="'+tr(['Region','地区'],lang)+'">'+tabs+'</div>'+
    '<article class="gaz-place"><h3>'+esc(tr(place.name,lang))+'</h3><p>'+esc(tr(place.scope,lang))+'</p>'+
    '<dl class="gaz-facts">'+fact(tr(['Residents · 1 April 2020','常住人口 · 2020 年 4 月 1 日'],lang),number(place.pop,lang))+'</dl>'+
    link(sourceOf(place),tr(['US Census Bureau · QuickFacts','美国人口普查局 · QuickFacts'],lang))+'</article>';
}
export function gazetteerContent(view,lang,campaign) {
  const modes=Object.entries(labels).map(([id,names])=>choice('section-'+id,tr(names,lang),id===view.section)).join('');
  let body=profile(view,lang,campaign);
  return {kicker:tr(['Field guide','游戏指南'],lang),title:tr(['California gazetteer','加州地名志'],lang),body:'<section class="gaz" translate="no"><p class="gaz-intro">'+
    tr(['Real places and public measurements. Campaign hexes represent approximate locations and have their own game yields.','查阅现实地点与公开数据。战役地块是近似位置，产出按游戏规则计算。'],lang)+'</p>'+
    (Object.keys(labels).length>1?'<nav class="gaz-nav" aria-label="'+tr(['Gazetteer sections','地名志栏目'],lang)+'">'+modes+'</nav>':'')+body+'</section>'};
}
export function gazetteerAction(view,action) {
  if(action.startsWith('section-') && Object.hasOwn(labels,action.slice(8)))view.section=action.slice(8);
  if(action.startsWith('region-') && Object.hasOwn(regions,action.slice(7)))view.region=action.slice(7);
}
