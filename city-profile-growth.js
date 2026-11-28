import {getCitizenWorkforce,getCityYield,getProductionOptions,getPopulationReport} from './rules.js';
import {SETTLER_MIN_POPULATION,SETTLER_RESIDENT_COST,feedCity} from './population.js';
import {local,label,section,table,signed,action} from './city-profile-format.js';

export function harvestCalendar(state,city,turns=5){
  const forecast={...city},scenario={...state,cities:state.cities.map(c=>c.id===city.id?forecast:c)};
  const rows=[];
  for(let turn=1;turn<=turns;turn++){
    const report=getPopulationReport(scenario,city.id);
    feedCity(forecast,report);
    rows.push({turn,surplus:report.surplus,population:forecast.population,food:forecast.food,housing:report.housing});
  }
  return rows;
}

export function growthPage(state,city){
  const rows=harvestCalendar(state,city);
  return settlerPage(state,city)+section(local('Five-harvest outlook','未来五次收获'),table([
    local('Harvest','第几次收获'),local('Food balance','粮食结余'),local('Stored after harvest','收获后存粮'),local('Residents / housing','人口／住房')
  ],rows.map(r=>[r.turn,signed(r.surplus),r.food,r.population+' / '+r.housing])),
    local('Keeps today’s land, focus, policies and buildings. Workers are reassigned as new residents arrive. Projects and shipments are excluded.',
      '按当前领地、劳动力分配方针、政策和建筑推算。人口变化时会重新分配工作。未计入新项目和运粮。'));
}

function settlerPage(state,city){
  if(city.population<SETTLER_MIN_POPULATION){
    const opening=harvestCalendar(state,city,12).find(r=>r.population>=SETTLER_MIN_POPULATION);
    return section(local('Settler recruitment','开拓者招募'),'<p>'+local('This city has ','本城人口 ')+city.population+' / '+
      SETTLER_MIN_POPULATION+local(' residents. Training and purchase are locked.','。训练与购买均已锁定。')+'</p>'+
      action('citizens',local('Review food assignments','查看粮食岗位')),
      opening?local('At the current food focus, the city meets the threshold in '+opening.turn+' harvests.',
        '按当前劳动力分配，本城将在 '+opening.turn+' 次收获后达到人口门槛。'):
        local('Current conditions do not reach the threshold within twelve harvests.','在当前条件下，未来十二次收获内不会达到门槛。'));
  }
  const next={...city,population:city.population-SETTLER_RESIDENT_COST},trial={...state,cities:state.cities.map(c=>c.id===city.id?next:c)};
  const report=s=>[getPopulationReport(s,city.id).surplus,getCityYield(s,city.id).production,getCitizenWorkforce(s,city.id).yields.science];
  const option=getProductionOptions(state,city.id,{replace:true}).find(o=>o.item==='settler');
  const actions=(option?.enabled?action('work-quote',local('Review settler production','查看开拓者训练'),'settler'):'')+
    (option?.buyEnabled?action('rush-quote',local('Review settler purchase','查看开拓者购买'),'settler'):'');
  return section(local('Settler departure budget','开拓者迁出预算'),table([local('Workforce','劳动力'),local('Population','人口'),
    local('Food surplus','粮食结余'),local('Production','生产力'),local('Worker science','劳动科研')],
    [[local('Now','现在'),city.population,...report(state)],[local('After deployment','部署后'),next.population,...report(trial)]])+
    '<div class="city-study-actions">'+actions+'</div>',
    local('One resident departs when the unit deploys. The comparison holds current land and buildings constant.',
      '开拓者部署时带走一名居民。对比按当前领地和建筑计算。'));
}
