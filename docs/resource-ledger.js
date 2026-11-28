import {illustration} from './illustrations.js';
import {RESOURCES,isProduce} from './resources.js';

export function ledgerBody(state, seat, accounts, selectedCity, busy, esc, stats) {
  const budget=(label,amount,rate)=>'<h3><span>'+label+'</span>'+
    (Number.isFinite(amount) ? ' · '+amount : '')+'</h3>'+
    (Number.isFinite(rate) ? '<p class="modal-muted"><span>Income per turn</span> '+(rate>=0?'+':'')+rate+'</p>' : '');
  const player=state.players[seat];
  const cities=state.cities.filter(city=>city.seat===seat);
  const city=cities.find(c=>c.id===selectedCity) || cities[0];
  const waiting=busy || state.turn!==seat || state.phase!=='playing' || state.players[seat].lastShipment===state.round;
  const destination=cities.length
    ? '<label class="cargo-destination"><span>Destination city</span><select name="supply-city">'+cities.map(c=>
      '<option value="'+esc(c.id)+'"'+(c===city?' selected':'')+'>'+esc(c.name)+'</option>').join('')+'</select></label>'
    : '';
  const rows=Object.entries(RESOURCES).map(([key,resource])=>{
    const {stock,income}=accounts[key], food=isProduce(key);
    const blocked=waiting || stock<2;
    const projectReady=city?.queue && city.queue.required>city.queue.progress;
    const dispatch=(market,title,disabled)=>'<button type="button" class="cargo-order" data-act="cargo-'+key+'-'+market+'"'+(disabled?' disabled':'')+'>'+title+'</button>';
    return '<div class="cargo-row">'+illustration(key)+'<div class="cargo-balance"><strong>'+resource.name+'</strong><small><span>Stored</span> '+stock+' · <span>Harvest</span> +'+income+'</small></div><div class="cargo-actions">'+
      dispatch('sell','Sell for 5 capital',blocked)+dispatch('city',food?'Supply 4 food':'Supply 4 production',blocked||!city||(!food&&!projectReady))+'</div></div>';
  });
  return '<section class="budget-guide">'+budget('Treasury',player.capital,stats?.capitalIncome)+'<p>Spend gold to buy eligible city projects, upgrade units and develop owned land.</p>'+budget('Influence',player.influence,stats?.influenceIncome)+'<p>Changing an enacted policy costs 3 influence. The first policy is free.</p><p>Contest an eligible rival border district for 4 gold and 5 influence, plus 2 influence per district level.</p></section>'+
    '<p class="modal-desc">Each worked deposit adds one good at the end of your turn. Dispatch two of the same good once per turn.</p>'+destination+
    (state.players[seat].lastShipment===state.round?'<p class="modal-muted">Shipment dispatched this turn.</p>':'')+
    '<div class="cargo-ledger">'+rows.join('')+'</div>';
}
