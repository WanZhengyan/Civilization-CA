import {CIVICS,ERAS,TECHS,UNIT_TYPES} from './rules.js';

function esc(value) {
  return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
const label=text=>'<span>'+esc(text)+'</span>';
const change=(before,after)=>before===after ? String(after) : before+' → '+after;
const metric=(name,value)=>'<span class="service-metric">'+label(name)+'<b>'+esc(value)+'</b></span>';
function prerequisite(name,ready) {
  return '<span class="service-gate '+(ready?'met':'missing')+'"><i aria-hidden="true">'+(ready?'✓':'○')+'</i>'+label(name)+'</span>';
}
export function advancementPanel(plans,open=false,disabled=false,unitId='') {
  if (!plans.length) return '';
  const ready=plans.filter(p=>p.enabled).length;
  const cards=plans.map(plan=>{
    const def=UNIT_TYPES[plan.to],out=plan.outcome;
    const gates=[prerequisite(ERAS[plan.era].name+' Era',plan.eraReady)];
    if (plan.tech) gates.push(prerequisite(TECHS[plan.tech].name,plan.techReady));
    if (plan.civic) gates.push(prerequisite(CIVICS[plan.civic].name,plan.civicReady));
    gates.push(prerequisite(plan.station==='shipyard'?'Own shipyard waters':'Own land',plan.legalSite));
    const old=plan.current;
    const stats=metric('Strength',change(old.strength,out.strength))+metric('Range',change(old.range,out.range))+
      metric('Movement',change(old.maxMoves,out.maxMoves))+metric('HP',change(old.hp+' / '+old.maxHp,out.hp+' / '+out.maxHp));
    const budget=metric('Price in capital',plan.cost)+metric('Treasury',plan.capital)+metric('Remaining movement',plan.moves);
    const future=plan.future.length ? '<p>'+label('Later upgrades')+' · '+plan.future.map(t=>label(UNIT_TYPES[t].name)).join(' / ')+'</p>' : '';
    return '<article><header><b>'+esc(def.name)+'</b>'+label(def.role||'Military unit')+'</header><div class="service-gates">'+gates.join('')+
      '</div><div class="service-metrics">'+stats+'</div><div class="service-metrics service-ledger">'+budget+'</div>'+label('Spends all remaining movement')+future+
      (!plan.enabled?'<p>'+esc(plan.reason)+'</p>':'')+'<button type="button" class="service-commit" data-order="upgrade:'+esc(plan.to)+'" '+
      (disabled||!plan.enabled?'disabled':'')+'>'+label('Upgrade to')+' '+label(def.name)+'</button></article>';
  }).join('');
  return '<details class="service-panel" data-service-plans data-unit="'+esc(unitId)+'" '+(open?'open':'')+'><summary>'+label('Upgrade paths')+'<small>'+ready+' / '+plans.length+'</small></summary>'+cards+'</details>';
}

const stations={city:'City infirmary',harbor:'Harbor repair',field:'Field Medicine',none:'No automatic care'};
export function recoveryPanel(unit,report,locked=false) {
  if (!report) return '';
  if (unit.hp>=unit.maxHp) return '<div class="recovery-healthy">'+label('Full health')+'</div>';
  const nearest=report.nearest;
  const care=label(stations[report.station])+(report.place?' · '+esc(report.place):'');
  const locate=nearest ? '<button type="button" class="service-location" data-order="locate-care">'+label('Locate care')+
    ' · <b>'+esc(nearest.name)+'</b> · '+label(nearest.hexes+' '+(nearest.hexes===1?'hex':'hexes'))+'</button>' : '';
  const rest=report.canRest ? '<button type="button" class="service-commit" data-order="recover" '+(locked?'disabled':'')+'>'+
    label('Rest this turn')+' · '+esc('+'+report.restGain)+' '+label('HP')+'</button>' : '';
  return '<section class="recovery-panel"><header>'+label('Next recovery')+'<b>+'+report.gain+' '+label('HP')+'</b></header>'+
    '<div>'+label('At the start of your next turn')+' · '+esc(report.hpAfter)+' / '+esc(unit.maxHp)+'</div><div>'+care+'</div>'+
    (report.resting?'<div>'+label('Rest order committed')+'</div>':'')+locate+rest+'</section>';
}
