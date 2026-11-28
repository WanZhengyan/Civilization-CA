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
  return parts.join(' + ') || L('Return-mail ticket','回程邮票');
}
function rewardText(offer) {
  const c=CARGO[offer.item],parts=[];
  if(c.culture)parts.push('+'+c.culture+L(' culture',' 文化'));
  if(c.science)parts.push('+'+c.science+L(' science',' 科研'));
  if(c.production)parts.push('+'+c.production+L(' yard production (up to 3 per harvest)',' 库存产能（每次收获最多用 3）'));
  if(c.deliverFood)parts.push('+'+c.deliverFood+L(' food',' 储粮'));
  if(offer.gold)parts.push('+'+offer.gold+L(' gold',' 金币'));
  return parts.join(' · ');
}
const reasons={booked:['Already reserved for this fair.','本期集市订单已被承接。'],fare:['Not enough treasury gold for the fare.','国库金币不足以支付旅费。'],stock:['Insufficient goods in the stockpile.','库存物资不足。'],departure:['A wagon has left this turn.','本回合已发车。'],crew:['Crew in transit.','商队正在途中。'],food:['Not enough stored food at the origin.','起点城市储粮不足。']};
function dispatchButton(offer,enabled,esc) {
  const reason=reasons[offer.reason];
  const window=offer.item==='returnMail'?' · '+L('ticket through round ','邮票有效至回合 ')+offer.mailThrough:offer.item==='fair'?' · '+L('book by round ','签约截止回合 ')+(offer.season+1)*3:'';
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
    const standing=player.foodLine?'':'<button type="button" class="cargo-order" data-caravan-order="scheduleFoodLine" data-origin="'+esc(route.origin)+'" data-destination="'+esc(route.destination)+'"'+(!enabled?' disabled':'')+'>'+L('Schedule relief · send 4 food when origin has 10+ and destination under 6','设立粮食救济线 · 起点至少存 10 粮且终点不足 6 粮时发运 4 粮')+'</button>';
    return '<li><details><summary><strong>'+cityText(state,route.destination,esc)+'</strong> · '+route.steps+L(' land hexes',' 格陆路')+' · '+route.turns+L(' harvests',' 次收获')+
      '</summary>'+upgrade+standing+offers.map(o=>dispatchButton(o,enabled,esc)).join('')+'</details></li>';
  }).join('');
  const active=(player.caravans || []).map(w=>'<p>'+cargoText(w.item)+' · '+cityText(state,w.destination,esc)+' · '+
    (w.returning?L('Returning cargo','原货返程')+' · ':'')+(w.remaining?w.remaining+L(' harvests left',' 次收获后抵达'):L('Awaiting a friendly destination','等待己方收货城市'))+
    (!w.returning && state.cities.some(c=>c.id===w.origin && c.seat===seat)?'<button type="button" class="cargo-order" data-caravan-order="recallWagon" data-wagon="'+esc(w.id)+'"'+(!enabled?' disabled':'')+'>'+L('Recall cargo','召回原货')+'</button>':'')+
    getTradeDiversions(state,seat,w.id).map(route=>'<button type="button" class="cargo-order" data-caravan-order="divertWagon" data-wagon="'+esc(w.id)+'" data-destination="'+esc(route.destination)+'"'+
      (!enabled || player.capital<2 || w.diverted===state.round?' disabled':'')+'>'+L('Divert to ','改送')+cityText(state,route.destination,esc)+(w.item==='fair'?L(' (5 gold resale)','（改售得 5 金币）'):'')+' · 2 '+L('gold','金币')+' · '+route.turns+L(' harvests',' 次收获')+'</button>').join('')+'</p>').join('');
  const capacity=tradeCapacity(state,seat);
  const depot=city.buildings?.includes('shop') && capacity===1 ? '<button class="cargo-order" type="button" data-caravan-order="establishDepot" data-origin="'+esc(city.id)+'"'+
    (!enabled || player.capital<18?' disabled':'')+'>'+L('Open wagon depot · 18 gold · second crew','设立商队货栈 · 18 金币 · 增加第二支商队')+'</button>' : '';
  const line=player.foodLine;
  const standing=line?'<p>'+L('Standing food relief','常设粮食救济')+' · '+cityText(state,line.origin,esc)+' → '+cityText(state,line.destination,esc)+' · '+
    L('After deliveries, dispatch 4 food when origin holds at least 10 and destination holds under 6. Manual dispatches have priority.','到货后，起点存粮至少 10 且终点不足 6 时，派车运送 4 粮。手动发运优先。')+
    '<button class="cargo-order" type="button" data-caravan-order="cancelFoodLine"'+(!enabled?' disabled':'')+'>'+L('Cancel standing order','取消常设安排')+'</button></p>':'';
  const receipt=player.tradeReceipt;
  return '<section class="commerce-ledger" translate="no"><h3>'+L('Overland trade','陆路贸易')+'</h3><p>'+
    L('Wagon routes from ','商队起点：')+cityText(state,city.id,esc)+' · '+L('Crews on the road ','在途商队 ')+(player.caravans?.length || 0)+' / '+capacity+'</p>'+(routes.length?'<button type="button" class="cargo-order" data-act="trade-market">'+L('Compare city markets','比较各城货运')+'</button>':'')+depot+(city.freightTimber?'<p>'+L('Lumber yard reserve','木料库存产能')+' · '+city.freightTimber+'</p>':'')+standing+active+
    (receipt?'<p>'+L('Last delivery','上次到货')+' · '+cargoText(receipt.item)+' · '+cityText(state,receipt.destination,esc)+' · '+(receipt.returning?L('Cargo returned; no freight paid','原货已退还，无运费收益'):rewardText(receipt))+'</p>':'')+
    (rows?'<ul>'+rows+'</ul>':'<p>'+L('Found a second city and explore a land corridor between them to open a wagon route.','建立第二座城市，并探明两城之间的陆路，便可开通商队路线。')+'</p>')+'</section>';
}

export function freightExchange(state,seat,busy,esc) {
  if(!state.players[seat] || state.intel && state.intel.seat!==seat)return '';
  const enabled=!busy && state.phase==='playing' && seatMayOrder(state,seat);
  const towns=state.cities.filter(c=>c.seat===seat),quotes=[];
  for(const town of towns){
    for(const route of getLandRoutes(state,seat,town.id)){
      for(const item of Object.keys(CARGO)){
        for(const service of ['standard','express']){
          const offer=freightOffer(state,seat,route,item,service);
          if(offer && !offer.reason)quotes.push(offer);
        }
      }
    }
  }
  const groups=[
    [L('Treasury income','国库收入'),o=>o.gold-o.fare],
    [L('Food for growing cities','为城市补粮'),o=>CARGO[o.item].deliverFood || 0],
    [L('Construction supplies','建造物资'),o=>CARGO[o.item].production || 0],
    [L('Research and culture','科研与文化'),o=>CARGO[o.item].science || CARGO[o.item].culture || 0]
  ];
  const boards=groups.map(([label,reward],index)=>{
    const ranked=quotes.filter(o=>reward(o)>0).sort((a,b)=>reward(b)/b.turns-reward(a)/a.turns || a.fare-b.fare || a.turns-b.turns);
    const unique=new Set(),rows=[];
    for(const o of ranked){
      const key=JSON.stringify([o.origin,o.destination,o.item]);
      if(unique.has(key))continue;
      unique.add(key);
      rows.push('<li><b>'+cityText(state,o.origin,esc)+' → '+cityText(state,o.destination,esc)+'</b>'+dispatchButton(o,enabled,esc)+'</li>');
      if(rows.length===3)break;
    }
    return rows.length?'<details'+(index===0?' open':'')+'><summary>'+label+'</summary><ul>'+rows.join('')+'</ul></details>':'';
  }).join('');
  return '<section class="commerce-ledger" translate="no"><p>'+L('Compare funded shipments across your cities. Each board ranks its three best offers by delivery per harvest. Treasury income deducts the fare.','比较各城市当前能负担的货运。每组按每次收获的交付量列出前三项，国库收入已扣除旅费。')+'</p>'+
    (boards || '<p>'+L('No funded shipments. Check available crews, goods and explored corridors in the supply ledger.','当前没有可发运货物。请在补给账本查看商队、物资和已探明路线。')+'</p>')+
    '<button type="button" class="cargo-order" data-act="supplies">'+L('Return to supply ledger','返回补给账本')+'</button></section>';
}
