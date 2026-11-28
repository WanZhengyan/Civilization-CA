import {getLandRoutes} from './rules.js';
import {CARGO,freightOffer} from './land-commerce.js';
import {seatMayOrder} from './team-turns.js';
import {getLanguage,translate} from './i18n.js';

const L=(en,zh)=>getLanguage()==='zh-CN'?zh:en;
const cargoText=item=>CARGO[item]?L(CARGO[item].en,CARGO[item].zh):'';
function cityText(state,id,esc) {
  const name=state.cities.find(c=>c.id===id)?.name;
  return esc(name?translate(name):L('Former city','原城市'));
}
function costText(item) {
  const c=CARGO[item];
  const parts=[];
  if(c.food)parts.push(c.food+L(' food',' 储粮'));
  return parts.join(' + ');
}
function rewardText(offer) {
  const c=CARGO[offer.item],parts=[];
  if(c.deliverFood)parts.push('+'+c.deliverFood+L(' food',' 储粮'));
  if(offer.gold)parts.push('+'+offer.gold+L(' gold',' 金币'));
  return parts.join(' · ');
}
const reasons={departure:['A wagon has left this turn.','本回合已发车。'],crew:['Crew in transit.','商队正在途中。'],food:['Not enough stored food at the origin.','起点城市储粮不足。']};
function dispatchButton(offer,enabled,esc) {
  const reason=reasons[offer.reason];
  return '<div class="commerce-offer"><strong>'+cargoText(offer.item)+'</strong><span>'+costText(offer.item)+' → '+rewardText(offer)+'</span>'+
    '<button type="button" class="cargo-order" data-caravan-order="dispatchCaravan" data-origin="'+esc(offer.origin)+'" data-destination="'+esc(offer.destination)+'" data-item="'+esc(offer.item)+'" data-service="'+esc(offer.service)+'"'+
    (!enabled || reason?' disabled':'')+'>'+L('Dispatch','发运')+'</button>'+(reason?'<small>'+L(...reason)+'</small>':'')+'</div>';
}
export function commerceLedger(state,seat,city,busy,esc) {
  if (!city || state.intel && state.intel.seat!==seat) return '';
  const player=state.players[seat],routes=getLandRoutes(state,seat,city.id);
  const enabled=!busy && state.phase==='playing' && seatMayOrder(state,seat);
  const rows=routes.map(route=>{
    const offers=Object.keys(CARGO).map(item=>freightOffer(state,seat,route,item)).filter(Boolean);
    return '<li><strong>'+cityText(state,route.destination,esc)+'</strong> · '+route.steps+L(' land hexes',' 格陆路')+' · '+route.turns+L(' harvests',' 次收获')+
      offers.map(o=>dispatchButton(o,enabled,esc)).join('')+'</li>';
  }).join('');
  const active=(player.caravans || []).map(w=>'<p>'+cargoText(w.item)+' · '+cityText(state,w.destination,esc)+' · '+
    (w.remaining?w.remaining+L(' harvests left',' 次收获后抵达'):L('Awaiting a friendly destination','等待己方收货城市'))+'</p>').join('');
  const receipt=player.tradeReceipt;
  return '<section class="commerce-ledger" translate="no"><h3>'+L('Overland trade','陆路贸易')+'</h3><p>'+
    L('Wagon routes from ','商队起点：')+cityText(state,city.id,esc)+'</p>'+active+
    (receipt?'<p>'+L('Last delivery','上次到货')+' · '+cargoText(receipt.item)+' · '+cityText(state,receipt.destination,esc)+' · '+rewardText(receipt)+'</p>':'')+
    (rows?'<ul>'+rows+'</ul>':'<p>'+L('Found a second city and explore a land corridor between them to open a wagon route.','建立第二座城市，并探明两城之间的陆路，便可开通商队路线。')+'</p>')+'</section>';
}
