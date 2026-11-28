import {getMap,UNIT_TYPES,BUILDINGS} from './rules.js';
import {SCIENCE_PROJECT} from './victory-rules.js';
import {FESTIVALS} from './city-festivals.js';
import {CHARTERS} from './city-charters.js';
import {local,label,section,table,action} from './city-profile-format.js';

export function municipalHistory(state,city){
  const types=new Set(['found','population','produce','purchase','complete','border','charterBorder','cityCharter','cityFestival']);
  return (state.log||[]).filter(entry=>entry.seat===city.seat && types.has(entry.type) &&
    (entry.city===city.id || entry.city==null && entry.tile===city.tile)).slice(-20).reverse();
}

export function historyPage(state,city){
  const entries=municipalHistory(state,city),map=getMap(state);
  if(!entries.length)return section(local('City chronicle','城市编年史'),'<p>'+
    local('The retained campaign journal contains no municipal decisions for this city yet.','保留的战局日志中尚无本城的市政记录。')+'</p>');
  const types={found:local('Foundation','建城'),population:local('Population','人口'),produce:local('Order','开工'),
    purchase:local('Purchase','购买'),complete:local('Completion','完工'),border:local('Expansion','扩界'),
    charterBorder:local('Incorporation','特许扩界'),cityCharter:local('Charter','市政特许'),cityFestival:local('Festival','节庆')};
  const sites=new Set();
  const rows=entries.map(entry=>{
    const definition=UNIT_TYPES[entry.item]||BUILDINGS[entry.item]||(entry.item===SCIENCE_PROJECT.id && SCIENCE_PROJECT)||FESTIVALS[entry.item]||CHARTERS[entry.item];
    const facts=[];
    if(definition)facts.push(label(definition.name));
    if(entry.gold!=null)facts.push(local(entry.gold+' gold spent','花费 '+entry.gold+' 金币'));
    if(entry.type==='charterBorder')facts.push(local('6 influence','6 影响力'));
    if(entry.tile && entry.tile!==city.tile && (!state.intel || state.intel.explored.includes(entry.tile))){
      sites.add(entry.tile);facts.push(label(map.byId[entry.tile].name));
    }
    return [entry.round,types[entry.type],label(entry.text),facts.join(' · ')||'—'];
  });
  return section(local('City chronicle','城市编年史'),table([local('Round','回合'),local('Event','事件'),local('Record','记录'),local('Details','详情')],rows)+
    '<div class="city-study-actions">'+[...sites].map(id=>action('tile',local('Locate ','定位')+label(map.byId[id].name),id)).join('')+'</div>',
    local('Shows up to 20 municipal events attributed to your seat in the retained campaign journal, newest first.',
      '按从新到旧的顺序显示战局日志中归属于你的最多 20 条本城市政事件。'));
}
