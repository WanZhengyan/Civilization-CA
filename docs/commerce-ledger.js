import {getLandRoutes,getTradeDiversions} from './rules.js';
import {CARGO,freightOffer,tradeCapacity,roadCost} from './land-commerce.js';
import {RESOURCES} from './resources.js';
import {seatMayOrder} from './team-turns.js';
import {getLanguage,translate} from './i18n.js';

const L=(en,zh)=>getLanguage()==='zh-CN'?zh:en;
const cargoText=item=>CARGO[item]?L(CARGO[item].en,CARGO[item].zh):'';
function cityText(state,id,esc) {
  const name=state.cities.find(c=>c.id===id)?.name;
  return esc(name?translate(name):L('Former city','原城市'));
}
function costText(offer) {
  const c=CARGO[offer.item];
  const parts=[];
  if(offer.fare)parts.push(offer.fare+L(' gold',' 金币'));
  if(offer.resource)parts.push(c.stock+' '+translate(RESOURCES[offer.resource].name));
  if(c.food)parts.push(c.food+L(' food',' 储粮'));
  return parts.join(' + ');
}
function rewardText(offer) {
  const c=CARGO[offer.item],parts=[];
  if(c.science)parts.push('+'+c.science+L(' science',' 科研'));
  if(c.production)parts.push('+'+c.production+L(' yard production (up to 3 per harvest)',' 库存产能（每次收获最多用 3）'));
  if(c.deliverFood)parts.push('+'+c.deliverFood+L(' food',' 储粮'));
  if(offer.gold)parts.push('+'+offer.gold+L(' gold',' 金币'));
  return parts.join(' · ');
}
const reasons={booked:['Already reserved for this fair.','本期集市订单已被承接。'],fare:['Not enough treasury gold for the fare.','国库金币不足以支付旅费。'],stock:['Insufficient goods in the stockpile.','库存物资不足。'],departure:['A wagon has left this turn.','本回合已发车。'],crew:['Crew in transit.','商队正在途中。'],food:['Not enough stored food at the origin.','起点城市储粮不足。']};
function dispatchButton(offer,enabled,esc) {
  const reason=reasons[offer.reason];
  const window=offer.item==='fair'?' · '+L('book by round ','签约截止回合 ')+(offer.season+1)*3:'';
  return '<div class="commerce-offer"><strong>'+cargoText(offer.item)+'</strong><span>'+costText(offer)+' → '+rewardText(offer)+window+'</span>'+
    '<button type="button" class="cargo-order" data-caravan-order="dispatchCaravan" data-origin="'+esc(offer.origin)+'" data-destination="'+esc(offer.destination)+'" data-item="'+esc(offer.item)+'" data-season="'+(offer.season??'')+'" data-service="'+esc(offer.service)+'"'+
    (!enabled || reason?' disabled':'')+'>'+(offer.service==='express'?L('Express','加急'):L('Dispatch','发运'))+' · '+offer.turns+L(' harvests',' 次收获')+'</button>'+(reason?'<small>'+L(...reason)+'</small>':'')+'</div>';
}
export function commerceLedger(state,seat,city,busy,esc) {
  if (!city || state.intel && state.intel.seat!==seat) return '';
  const player=state.players[seat],routes=getLandRoutes(state,seat,city.id);
  const enabled=!busy && state.phase==='playing' && seatMayOrder(state,seat);
  const rows=routes.map(route=>{
    const offers=Object.keys(CARGO).flatMap(item=>['standard','express'].map(service=>freightOffer(state,seat,route,item,service))).filter(Boolean);
    const upgrade=route.graded?L('Graded road','已整修道路'):player.civics.includes('publicWorks')?
      '<button type="button" class="cargo-order" data-caravan-order="gradeRoad" data-origin="'+esc(route.origin)+'" data-destination="'+esc(route.destination)+'"'+(!enabled || player.capital<roadCost(route)?' disabled':'')+'>'+
      L('Grade road for both directions · ','双向整修道路 · ')+roadCost(route)+L(' gold · standard wagon travels 5 hexes per harvest',' 金币 · 普通商队每次收获可行 5 格')+'</button>':'';
    return '<li><strong>'+cityText(state,route.destination,esc)+'</strong> · '+route.steps+L(' land hexes',' 格陆路')+' · '+route.turns+L(' harvests',' 次收获')+
      upgrade+offers.map(o=>dispatchButton(o,enabled,esc)).join('')+'</li>';
  }).join('');
  const active=(player.caravans || []).map(w=>'<p>'+cargoText(w.item)+' · '+cityText(state,w.destination,esc)+' · '+
    (w.returning?L('Returning cargo','原货返程')+' · ':'')+(w.remaining?w.remaining+L(' harvests left',' 次收获后抵达'):L('Awaiting a friendly destination','等待己方收货城市'))+
    (!w.returning && state.cities.some(c=>c.id===w.origin && c.seat===seat)?'<button type="button" class="cargo-order" data-caravan-order="recallWagon" data-wagon="'+esc(w.id)+'"'+(!enabled?' disabled':'')+'>'+L('Recall cargo','召回原货')+'</button>':'')+
    getTradeDiversions(state,seat,w.id).map(route=>'<button type="button" class="cargo-order" data-caravan-order="divertWagon" data-wagon="'+esc(w.id)+'" data-destination="'+esc(route.destination)+'"'+
      (!enabled || player.capital<2 || w.diverted===state.round?' disabled':'')+'>'+L('Divert to ','改送')+cityText(state,route.destination,esc)+(w.item==='fair'?L(' (5 gold resale)','（改售得 5 金币）'):'')+' · 2 '+L('gold','金币')+' · '+route.turns+L(' harvests',' 次收获')+'</button>').join('')+'</p>').join('');
  const capacity=tradeCapacity(state,seat);
  const depot=city.buildings?.includes('shop') && capacity===1 ? '<button class="cargo-order" type="button" data-caravan-order="establishDepot" data-origin="'+esc(city.id)+'"'+
    (!enabled || player.capital<18?' disabled':'')+'>'+L('Open wagon depot · 18 gold · second crew','设立商队货栈 · 18 金币 · 增加第二支商队')+'</button>' : '';
  const receipt=player.tradeReceipt;
  return '<section class="commerce-ledger" translate="no"><h3>'+L('Overland trade','陆路贸易')+'</h3><p>'+
    L('Wagon routes from ','商队起点：')+cityText(state,city.id,esc)+' · '+L('Crews on the road ','在途商队 ')+(player.caravans?.length || 0)+' / '+capacity+'</p>'+depot+(city.freightTimber?'<p>'+L('Lumber yard reserve','木料库存产能')+' · '+city.freightTimber+'</p>':'')+active+
    (receipt?'<p>'+L('Last delivery','上次到货')+' · '+cargoText(receipt.item)+' · '+cityText(state,receipt.destination,esc)+' · '+(receipt.returning?L('Cargo returned; no freight paid','原货已退还，无运费收益'):rewardText(receipt))+'</p>':'')+
    (rows?'<ul>'+rows+'</ul>':'<p>'+L('Found a second city and explore a land corridor between them to open a wagon route.','建立第二座城市，并探明两城之间的陆路，便可开通商队路线。')+'</p>')+'</section>';
}
