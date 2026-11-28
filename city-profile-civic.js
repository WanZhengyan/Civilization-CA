import {charterOptions} from './city-charters.js';
import {BUILDINGS,getProductionOptions} from './rules.js';
import {festivalOptions,festivalBenefit} from './city-festivals.js';
import {local,label,section,table,action,signed} from './city-profile-format.js';

export function festivalBudget(state,city){
  const active=festivalBenefit(state,city);
  const options=active?[{...active,id:city.festival}]:festivalOptions(state,city.seat,city);
  const remaining=active?city.festivalHarvests:3;
  return options.map(option=>({option,remaining,active:Boolean(active),food:active?0:-4,
    production:(option.production||0)*remaining,gold:(option.capital||0)*remaining-(active?0:8),
    culture:(option.culture||0)*remaining,influence:(option.influence||0)*remaining}));
}

export function civicPage(state,city){
  return chartersPage(state,city)+festivalsPage(state,city);
}

function festivalsPage(state,city){
  const rows=festivalBudget(state,city);
  if(!rows.length)return section(local('Festival calendar','节庆日历'),'<p>'+
    (state.campaignVariety===1?local('Adopt the Charter civic to schedule a city festival.','解锁特许市政后可以举办城市节庆。'):
      local('Festival funding is unavailable under this campaign’s rules.','本战局的规则没有节庆经费。'))+'</p>');
  const choices=rows.filter(r=>!r.active && !r.option.reason);
  const html=table([local('Festival','节庆'),local('Harvests','收获次数'),local('Stored food','存粮变化'),local('Net gold','金币净额'),
    local('Production','生产力'),local('Culture','文化'),local('Influence','影响力')],rows.map(r=>[
    label(r.option.name),r.remaining,r.food,signed(r.gold),signed(r.production),signed(r.culture),signed(r.influence)]));
  const status=rows[0].active?local('The opening fee is already paid. The displayed returns are still due.',
    '开办费已支付。此处列出剩余收益。'):
    city.festivalRecovery?local('Preparations take another '+city.festivalRecovery+' harvests.','距离下次举办还需 '+city.festivalRecovery+' 次收获。'):
    rows[0].option.reason?label(rows[0].option.reason):local('Signing now leaves '+(state.players[city.seat].capital-8)+' gold and '+(city.food-4)+' stored food.',
      '现在举办后剩余 '+(state.players[city.seat].capital-8)+' 金币与 '+(city.food-4)+' 存粮。');
  return section(local('Festival calendar','节庆日历'),html+'<div class="city-study-actions">'+choices.map(r=>
    action('festival',local('Review ','审议')+label(r.option.name),r.option.id)).join('')+'</div>',status);
}

function chartersPage(state,city){
  const options=charterOptions(state,city.seat,city);
  if(!options.length)return '';
  const owned=options.find(row=>row.id===city.charter),rows=owned?[owned]:options;
  const orders=getProductionOptions(state,city.id,{replace:true}),commands=[];
  for(const row of rows){
    if(!row.reason)commands.push(action('charter',local('Review ','审议')+label(row.name),row.id));
    else if(!owned && !city.buildings.includes(row.building) && orders.some(o=>o.item===row.building && o.enabled)){
      commands.push(action('building',local('Plan ','规划')+label(BUILDINGS[row.building].name),row.building));
    }
  }
  return section(local('Permanent charter investment','永久特许投资'),table(
    [local('Charter','特许'),local('Required building','所需建筑'),local('Food','粮食'),local('Production','生产力'),
      local('Gold','金币'),local('Influence','影响力'),local('Standing','状态')],
    rows.map(row=>[label(row.name),label(BUILDINGS[row.building].name),signed(row.food||0),signed(row.production||0),
      signed(row.capital||0),signed(row.influence||0),owned?local('In force','已生效'):row.reason?label(row.reason):local('Available','可签署')]))+
    '<div class="city-study-actions">'+commands.join('')+'</div>',
    owned?local('This city earns the displayed bonus every harvest for the rest of the campaign.','本城在余下战局中每次收获都会获得表列加成。'):
      local('One charter per city. The fee is 18 gold. A merchants’ exchange earns back the fee in six harvests through its gold income.',
        '每座城市可签一份特许，费用为 18 金币。商人交易所的金币收入可在六次收获内收回费用。'));
}
