import {getLandRoutes} from './rules.js';
import {getLanguage,translate} from './i18n.js';

const L=(en,zh)=>getLanguage()==='zh-CN'?zh:en;
function cityText(state,id,esc) {
  const name=state.cities.find(c=>c.id===id)?.name;
  return esc(name?translate(name):L('Former city','原城市'));
}
export function commerceLedger(state,seat,city,busy,esc) {
  if (!city || state.intel && state.intel.seat!==seat) return '';
  const routes=getLandRoutes(state,seat,city.id);
  const rows=routes.map(route=>'<li><strong>'+cityText(state,route.destination,esc)+'</strong> · '+
    route.steps+L(' land hexes',' 格陆路')+' · '+route.turns+L(' harvests',' 次收获')+'</li>').join('');
  return '<section class="commerce-ledger" translate="no"><h3>'+L('Overland trade','陆路贸易')+'</h3><p>'+
    L('Wagon routes from ','商队起点：')+cityText(state,city.id,esc)+'</p>'+
    (rows?'<ul>'+rows+'</ul>':'<p>'+L('Found a second city and explore a land corridor between them to open a wagon route.','建立第二座城市，并探明两城之间的陆路，便可开通商队路线。')+'</p>')+'</section>';
}
