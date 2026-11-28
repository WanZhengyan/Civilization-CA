import {getCitizenWorkforce} from './rules.js';
import {local,label,section,table,action} from './city-profile-format.js';

export function workforcePage(state,city){
  const workforce=getCitizenWorkforce(state,city.id);
  const jobs=workforce.workedTiles;
  const rows=jobs.map(job=>[label(job.name),job.workers,...job.output.map(value=>value*job.workers)]);
  const plots=jobs.filter(job=>!job.specialist);
  const workers=plots.reduce((n,job)=>n+job.workers,0);
  return section(local('Where residents work','居民工作地点'),table([
    local('Assignment','工作岗位'),local('Workers','人数'),local('Food','粮食'),local('Production','生产力'),local('Science','科研')
  ],rows)+'<div class="city-study-actions">'+plots.map(job=>action('tile',local('Locate ','定位')+label(job.name),job.id)).join('')+'</div>',
    local(workers+' district workers and '+(city.population-workers)+' city-center specialists.',
      workers+' 人在城外地块工作，'+(city.population-workers)+' 人在市中心任职。'));
}
