import {TERRAIN_LABELS} from './maps.js';
import {getCitizenWorkforce,getPopulationReport,getMap,getWorkingCity,getCityExpansion,getBorderCharter} from './rules.js';
import {canSeeDeposits,connectedDeposit,RESOURCES} from './resources.js';
import {NATURAL_WONDERS} from './natural-wonders.js';
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
  return frontierPage(state,city)+supplyPage(state,city)+landmarkPage(current)+outlook+section(local('Unworked district survey','未工作的地块'),vacant.length?table(
    [local('District','地块'),local('Food','粮食'),local('Production','生产力'),local('Science','科研')],
    vacant.map(j=>[label(j.name),...j.output]))+'<div class="city-study-actions">'+vacant.map(j=>
      action('tile',local('Locate ','定位')+label(j.name),j.id)).join('')+'</div>':
    '<p>'+local('All eligible land is worked. Additional residents can take city-center jobs.','可用地块已全部有人工作。新增居民可以在市中心任职。')+'</p>');
}

export function cityDeposits(state,city){
  if(!canSeeDeposits(state,city.seat))return [];
  const map=getMap(state);
  return Object.entries(state.board).filter(([id,h])=>h.owner===city.seat && RESOURCES[h.resource] &&
    getWorkingCity(state,id)?.id===city.id).map(([id,h])=>({id,name:map.byId[id].name,resource:RESOURCES[h.resource],
      connected:connectedDeposit(h),repair:Boolean(h.pillaged && h.improvement===RESOURCES[h.resource].improvement)}));
}

function supplyPage(state,city){
  const jobs=cityDeposits(state,city);
  const improvements={farm:local('Farm','农场'),mine:local('Mine','矿山'),fishery:local('Fishery','渔场'),
    orchard:local('Orchard','果园'),lumberCamp:local('Lumber camp','伐木场'),quarry:local('Quarry','采石场')};
  return section(local('Supply catchment','本城物资来源'),jobs.length?table(
    [local('Commodity','物资'),local('Site','地点'),local('Units per harvest','每次收获产量'),local('Facility','设施')],
    jobs.map(j=>[label(j.resource.name),label(j.name),j.connected?1:0,
      (j.repair?local('Repair ','修复'):local('',''))+improvements[j.resource.improvement]]))+
    '<div class="city-study-actions">'+jobs.map(j=>action('tile',local('Locate ','定位')+label(j.name),j.id)).join('')+'</div>':
    '<p>'+local('No surveyed commodity site currently supplies this city.','本城供应范围内目前没有已勘探的物资点。')+'</p>',
    local('Each connected facility adds one unit to the shared stockpile per harvest. A damaged facility resumes deliveries after repair.',
      '每个连通设施每次收获向文明库存添加一单位物资。受损设施修复后恢复供应。'))+
    action('supplies',local('Review goods and shipments','查看库存与货运'));
}

export function landmarkJobs(workforce){
  const worked=new Set(workforce.workedTiles.map(job=>job.id));
  return workforce.eligibleTiles.filter(job=>job.naturalWonders?.length).map(job=>{
    const features=job.naturalWonders.map(key=>NATURAL_WONDERS[key]);
    const premium=[0,1,2].map(k=>features.reduce((total,f)=>total+f.bonus[k],0));
    return {job,worked:worked.has(job.id),features,premium};
  });
}

function landmarkPage(workforce){
  const jobs=landmarkJobs(workforce);
  return section(local('Landmark employment','自然奇观周边就业'),jobs.length?table(
    [local('District','地块'),local('Neighboring landmark','相邻奇观'),local('Employment','劳动力'),
      local('Extra food','额外粮食'),local('Extra production','额外生产力'),local('Extra science','额外科研')],
    jobs.map(j=>[label(j.job.name),j.features.map(f=>label(f.name)).join(' / '),
      j.worked?local('Working','已工作'):local('Vacant','闲置'),...j.premium]))+
    '<div class="city-study-actions">'+jobs.map(j=>action('tile',local('Locate ','定位')+label(j.job.name),j.job.id)).join('')+
    action('citizens',local('Compare labor assignments','比较劳动力分配'))+'</div>':
    '<p>'+local('No eligible district currently borders an identified natural wonder.','当前没有可工作地块与已发现的自然奇观相邻。')+'</p>',
    local('Each worked district collects every adjacent identified landmark bonus. Vacant districts yield this premium only while employed.',
      '已工作的地块会收集所有已发现相邻奇观的加成。闲置地块需分配劳动力才能获得加成。'));
}

function frontierPage(state,city){
  const budget=getCityExpansion(state,city.id),quote=getBorderCharter(state,city.seat,city.id);
  if(!budget?.tile)return section(local('Next border decision','下次扩界决策'),
    '<p>'+local('No visible neutral parcel is eligible on this frontier.','本城边境目前没有符合条件的可见中立地块。')+'</p>');
  const map=getMap(state),tile=map.byId[budget.tile],influence=state.players[city.seat].influence;
  const choice=state.intel?.borderCharters!==false;
  const lines=[[local('Natural growth','自然扩张'),budget.turns,influence,budget.progress+' / '+budget.required]];
  if(choice)lines.push([local('Border charter','边境特许'),quote.enabled?local('Now','立即'):label(quote.reason),
    influence>=quote.cost?influence-quote.cost:'—',local('Reset to 0','重置为 0')]);
  return section(local('Next border decision','下次扩界决策'),'<p>'+label(tile.name)+' · '+label(TERRAIN_LABELS[tile.terrain])+'</p>'+
    table([local('Acquisition','取得方式'),local('Harvests at current population','按当前人口所需收获次数'),
      local('Influence after fee','扣费后影响力'),local('Border progress','边境进度')],lines)+
    '<div class="city-study-actions">'+action('tile',local('Locate next parcel','定位下一块领土'),tile.id)+
    (choice?action('border',local('Review border charter','查看边境特许')):'')+'</div>',
    local('Natural growth earns '+budget.rate+' border points per harvest. The charter costs '+quote.cost+' influence and resets accumulated progress.',
      '自然扩张每次收获获得 '+budget.rate+' 边境点数。特许消耗 '+quote.cost+' 影响力，并重置已积累的扩张进度。'));
}
