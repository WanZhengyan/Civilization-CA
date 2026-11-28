import {getPopulationReport} from './rules.js';
import {feedCity} from './population.js';
import {local,section,table,signed} from './city-profile-format.js';

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
  return section(local('Five-harvest outlook','未来五次收获'),table([
    local('Harvest','第几次收获'),local('Food balance','粮食结余'),local('Stored after harvest','收获后存粮'),local('Residents / housing','人口／住房')
  ],rows.map(r=>[r.turn,signed(r.surplus),r.food,r.population+' / '+r.housing])),
    local('Keeps today’s land, focus, policies and buildings. Workers are reassigned as new residents arrive. Projects and shipments are excluded.',
      '按当前领地、劳动力分配方针、政策和建筑推算。人口变化时会重新分配工作。未计入新项目和运粮。'));
}
