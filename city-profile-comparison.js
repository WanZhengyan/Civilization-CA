import {getMap,getCityYield,getPopulationReport} from './rules.js';
import {local,cityLabel,signed,section,table,action} from './city-profile-format.js';

export function cityComparison(state,city){
  const map=getMap(state);
  const owned=state.cities.filter(c=>c.seat===city.seat);
  const base=getCityYield(state,city.id),baseFood=getPopulationReport(state,city.id);
  return owned.map(c=>{
    const yieldNow=getCityYield(state,c.id),food=getPopulationReport(state,c.id);
    return {city:c,name:cityLabel(c,map),food:food.surplus,foodDelta:food.surplus-baseFood.surplus,
      production:yieldNow.production,productionDelta:yieldNow.production-base.production,
      gold:yieldNow.capital,goldDelta:yieldNow.capital-base.capital,housing:food.housing};
  }).sort((a,b)=>Number(b.city.id===city.id)-Number(a.city.id===city.id)||a.name.localeCompare(b.name));
}

export function comparisonPage(state,city){
  const rows=cityComparison(state,city),format=(n,d)=>d?n+' ('+signed(d)+')':n;
  return section(local('Compare your cities','比较你的城市'),table(
    [local('City','城市'),local('Residents / housing','人口／住房'),local('Food surplus','粮食结余'),
      local('Production','生产力'),local('City gold','城市金币')],
    rows.map(r=>[r.name+(r.city.id===city.id?local(' (selected)','（当前）'):''),
      r.city.population+' / '+r.housing,format(r.food,r.foodDelta),format(r.production,r.productionDelta),format(r.gold,r.goldDelta)]))+
    '<div class="city-study-actions">'+rows.filter(r=>r.city.id!==city.id).map(r=>action('compare-city',local('Use ','以')+
      r.name+local(' as baseline','为比较基准'),r.city.id)).join('')+'</div>',
    rows.length>1?local('Parentheses show the difference from the selected city per harvest. Switch the baseline to inspect another city.',
      '括号中为每次收获相对当前城市的差值。切换基准可直接查看其他城市。'):
      local('Your first city is the baseline. A second city will add a direct comparison here.','首座城市作为基准。建立第二座城市后，即可在此比较。'));
}
