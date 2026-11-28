import {getCitizenWorkforce,getPopulationReport} from './rules.js';
import {local,label,section,table,action,signed} from './city-profile-format.js';

export function nextHire(state,city){
  const current=getCitizenWorkforce(state,city.id);
  const trial={...state,cities:state.cities.map(c=>c.id===city.id?{...c,population:c.population+1}:c)};
  const next=getCitizenWorkforce(trial,city.id);
  const job=next.workedTiles.find(j=>j.workers>(current.workedTiles.find(c=>c.id===j.id)?.workers||0));
  return {job,current,next,housingLimited:getPopulationReport(state,city.id).housingLimited};
}

export function landPage(state,city){
  const {job,current,next,housingLimited}=nextHire(state,city);
  const assigned=new Set(current.workedTiles.map(j=>j.id));
  const vacant=current.eligibleTiles.filter(j=>!assigned.has(j.id));
  const gain=(key)=>next.yields[key]-current.yields[key];
  const outlook=section(local('Next resident’s job','下一名居民的岗位'),table(
    [local('Assignment','预计岗位'),local('Net food change','粮食净变化'),local('Worker production','劳动生产力'),local('Worker science','劳动科研')],
    [[label(job.name),signed(gain('food')-2),signed(gain('production')),signed(gain('science'))]]),
    housingLimited?local('Housing is full. The job becomes available after housing and population increase.','住房已满。增加住房和人口后，居民可在此工作。'):
      local('Uses the current focus and border. Net food includes the new resident’s two-food consumption.','按当前分配方针和边界推算。粮食净变化已扣除新居民消耗的 2 粮食。'));
  return outlook+section(local('Unworked district survey','未工作的地块'),vacant.length?table(
    [local('District','地块'),local('Food','粮食'),local('Production','生产力'),local('Science','科研')],
    vacant.map(j=>[label(j.name),...j.output]))+'<div class="city-study-actions">'+vacant.map(j=>
      action('tile',local('Locate ','定位')+label(j.name),j.id)).join('')+'</div>':
    '<p>'+local('All eligible land is worked. Additional residents can take city-center jobs.','可用地块已全部有人工作。新增居民可以在市中心任职。')+'</p>');
}
