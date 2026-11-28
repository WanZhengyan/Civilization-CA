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
