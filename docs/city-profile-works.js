import {BUILDINGS,getCityYield,getPopulationReport,getProductionOptions,getStats} from './rules.js';
import {WONDERS} from './wonders.js';
import {local,label,section,table,action,signed} from './city-profile-format.js';

function rates(state,city){
  const yields=getCityYield(state,city.id),empire=getStats(state,city.seat);
  return {food:yields.food,production:yields.production,gold:empire.capitalIncome,
    science:empire.scienceIncome,culture:empire.cultureIncome,influence:empire.influenceIncome,
    housing:getPopulationReport(state,city.id).housing};
}
const rateNames=()=>({food:local('food','粮食'),production:local('production','生产力'),gold:local('gold','金币'),
  science:local('science','科研'),culture:local('culture','文化'),influence:local('influence','影响力'),housing:local('housing','住房')});
export function buildingReturns(state,city){
  const base=rates(state,city);
  const options=getProductionOptions(state,city.id,{replace:true}).filter(option=>option.kind==='building' && option.enabled && !WONDERS[option.item]);
  return options.map(option=>{
    const built={...city,buildings:[...city.buildings,option.item]};
    const projected={...state,cities:state.cities.map(c=>c.id===city.id?built:c)};
    const after=rates(projected,built);
    const changes=Object.fromEntries(Object.keys(base).map(key=>[key,after[key]-base[key]]));
    return {...option,changes};
  });
}

export function worksPage(state,city){
  const options=buildingReturns(state,city),names=rateNames();
  const rows=options.map(o=>{
    const gains=Object.entries(o.changes).filter(([,n])=>n).map(([k,n])=>signed(n)+' '+names[k]);
    return [label(BUILDINGS[o.item].name),o.turns,gains.join(' · ') || label(BUILDINGS[o.item].description || BUILDINGS[o.item].name)];
  });
  return section(local('Building investment returns','建筑投资回报'),rows.length?table(
    [local('Project','项目'),local('Build turns','建造回合'),local('Yield change / housing','每回合收益／住房变化')],rows)+
    '<div class="city-study-actions">'+options.map(o=>action('building',local('Survey ','选址')+label(o.label),o.item)).join('')+'</div>':
    '<p>'+local('No new municipal building can be commissioned by this city right now.','本城目前没有可以开工的新市政建筑。')+'</p>',
    local('Compares each available building at current population, policy and research. Housing is immediate capacity; other values are per harvest.',
      '按当前人口、政策和科技比较各个可建项目。住房是完工后新增的容量，其余数字是每次收获的变化。'));
}
