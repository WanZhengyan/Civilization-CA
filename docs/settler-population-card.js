import {SETTLER_MIN_POPULATION,settlerPopulationReason} from './population.js';
import {getMap} from './rules.js';
import {getLanguage,translate} from './i18n.js';
import {safe} from './city-profile-format.js';

export function settlerPopulationCard(state,city,item,language=getLanguage()){
  if(!settlerPopulationReason(city,item))return '';
  const canonical=getMap(state).byId[city.tile]?.name;
  const name=city.name===canonical?translate(city.name,language):city.name;
  const needed=SETTLER_MIN_POPULATION-city.population,zh=language==='zh-CN';
  const detail=zh?name+'当前人口 '+city.population+'／'+SETTLER_MIN_POPULATION+'。再增加 '+needed+' 名居民后，本城才能训练或购买开拓者。':
    name+' has '+city.population+' of '+SETTLER_MIN_POPULATION+' residents. Grow by '+needed+(needed===1?' resident':' residents')+
    ' to train or buy a settler here.';
  return '<div class="settler-population-lock" translate="no"><strong>'+ (zh?'已锁定 · 人口不足':'Locked · population requirement')+
    '</strong><p>'+safe(detail)+'</p><button type="button" data-work-population>'+ (zh?'查看本城人口计划':'View this city’s growth plan')+'</button></div>';
}

export function productionCard({item,icon,name,description,race='',timing,controls,lock=''}){
  return '<article class="production-item work-card" data-project="'+safe(item)+'"'+(lock?' data-population-locked':'')+'>'+
    icon+'<span><strong>'+safe(name)+'</strong>'+lock+'<small>'+safe(description)+'</small>'+race+'<small>'+timing+'</small>'+
    controls+'</span></article>';
}
