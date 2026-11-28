import {commerceLedger} from './commerce-ledger.js';
import {settlerPopulationReason} from './population.js';
import {illustration} from './illustrations.js';
import {RESOURCES,isProduce,materialShipmentGain,SHIPMENT} from './resources.js';
import {BUILDINGS,UNIT_TYPES,getCityYield} from './rules.js';
import {SCIENCE_PROJECT} from './victory-rules.js';
import {seatMayOrder} from './team-turns.js';
import {constructionTurns} from './harvest-forecast.js';
import {getLanguage,translate} from './i18n.js';

function cityQuote(state,city,available,L,esc) {
  if (!city) return '';
  const {queue}=city;
  const gain=materialShipmentGain(city);
  const line=(label,value)=>'<div><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></div>';
  const food=city.food || 0;
  let rows=line(L('Stored food','城市储粮'),available ? food+' → '+(food+SHIPMENT.yield) : food);
  if (queue) {
    const product=UNIT_TYPES[queue.item] || BUILDINGS[queue.item] || (queue.item===SCIENCE_PROJECT.id ? SCIENCE_PROJECT : null);
    const name=translate(product?.name || queue.item);
    rows+=line(name,queue.progress+(gain && available ? ' → '+(queue.progress+gain) : '')+' / '+queue.required);
    if (available && gain) {
      const left=queue.required-queue.progress,rate=getCityYield(state,city.id).production;
      const harvests=remaining=>Math.max(1,constructionTurns(state,city,remaining,rate));
      rows+=line(L('Earliest finish (harvests)','最早完工（收获回合）'),harvests(left)+' → '+harvests(left-gain));
      if (gain<SHIPMENT.yield) rows+='<p>'+L('Only '+gain+' of the '+SHIPMENT.yield+' production fits this project.',
        '该项目只需 '+gain+' 点，本批货物的 '+SHIPMENT.yield+' 点生产力只能用上 '+gain+' 点。')+'</p>';
    } else if (settlerPopulationReason(city)) rows+='<p>'+esc(translate(settlerPopulationReason(city)))+'</p>';
    else if (!gain) rows+='<p>'+L('Production is full. The city checks completion at harvest.','生产进度已满，城市将在收获时结算项目。')+'</p>';
  } else rows+='<p>'+L('Choose a production project before sending materials.','为这座城市选择生产项目后即可运送材料。')+'</p>';
  return '<section class="shipment-quote" aria-live="polite">'+rows+'</section>';
}

export function ledgerBody(state, seat, accounts, selectedCity, busy, esc, stats) {
  const L=(en,zh)=>getLanguage()==='zh-CN'?zh:en;
  const budget=(label,amount,rate)=>'<h3><span>'+label+'</span>'+
    (Number.isFinite(amount) ? ' · '+amount : '')+'</h3>'+
    (Number.isFinite(rate) ? '<p class="modal-muted"><span>Income per turn</span> '+(rate>=0?'+':'')+rate+'</p>' : '');
  const player=state.players[seat];
  const cities=state.cities.filter(city=>city.seat===seat);
  const city=cities.find(c=>c.id===selectedCity) || cities[0];
  const spent=player.lastShipment===state.round;
  const waiting=busy || !seatMayOrder(state,seat) || spent;
  const destination=cities.length
    ? '<label class="cargo-destination"><span>Destination city</span><select name="supply-city">'+cities.map(c=>
      '<option value="'+esc(c.id)+'"'+(c===city?' selected':'')+'>'+esc(c.name)+'</option>').join('')+'</select></label>'
    : '';
  const rows=Object.entries(RESOURCES).map(([key,resource])=>{
    const {stock,income}=accounts[key],food=isProduce(key);
    const blocked=waiting || stock<SHIPMENT.goods;
    const gain=food ? SHIPMENT.yield : materialShipmentGain(city);
    const dispatch=(market,title,disabled)=>'<button type="button" class="cargo-order" data-act="cargo-'+key+'-'+market+'"'+(disabled?' disabled':'')+'>'+title+'</button>';
    const delivery=food ? L('Send food +4','运送粮食 +4') : gain ? L('Send production +'+gain,'运送生产力 +'+gain) : L('Send materials','运送材料');
    return '<div class="cargo-row">'+illustration(key)+'<div class="cargo-balance"><strong>'+resource.name+'</strong><small><span>Stored</span> '+stock+' · <span>Harvest</span> +'+income+'</small></div><div class="cargo-actions">'+
      dispatch('sell',L('Sell for 5 gold','出售得 5 金币'),blocked)+dispatch('city',delivery,blocked||!city||!gain)+'</div></div>';
  });
  return '<section class="budget-guide">'+budget('Treasury',player.capital,stats?.capitalIncome)+'<p>Use gold to buy eligible city projects, upgrade units or claim a neutral border tile.</p>'+budget('Influence',player.influence,stats?.influenceIncome)+
    '<p>'+L('Spend 6 influence to expand a city into its next eligible parcel.','花 6 点影响力可让城市立即取得下一格可扩张地块。')+'</p>'+
    '<button type="button" class="modal-secondary" data-influence-open>'+L('Spend influence','使用影响力')+'</button></section>'+
    '<p class="modal-desc">Each worked deposit adds one good at the end of your turn. Dispatch two of the same good once per turn.</p>'+destination+
    cityQuote(state,city,!spent,L,esc)+(spent?'<p class="modal-muted">Shipment dispatched this turn.</p>':'')+
    '<div class="cargo-ledger">'+rows.join('')+'</div>'+commerceLedger(state,seat,city,busy,esc);
}
