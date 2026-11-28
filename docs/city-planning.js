import {NATURAL_WONDERS} from './natural-wonders.js';
import {illustration} from './illustrations.js';
import {getCitizenWorkforce,getCityYield,getStats,getPopulationReport} from './rules.js';
import {CITY_FOCUS} from './workforce.js';
import {housingCapacity} from './population.js';

function line(label, value) {
  return '<div><span>'+label+'</span><b>'+value+'</b></div>';
}
function signed(value) { return (value > 0 ? '+' : '') + value; }
export function populationSummary(p) {
  const notice = p.starvationTurns ? 'Population loss' : p.housingLimited ? 'Housing full' : p.growthTurns ? 'Next citizen' : 'Population stable';
  const time = p.starvationTurns || p.growthTurns;
  return '<div class="city-food-report">'+line('Residents / housing',p.population+' / '+p.housing)+line('Stored food',p.food+' / '+p.threshold)+
    '<progress max="'+p.threshold+'" value="'+p.food+'" aria-label="Stored food"></progress>'+
    line('Harvest',p.harvest)+line('Consumption',p.consumption)+line('Food balance',signed(p.surplus))+
    line(notice,time ? time+' '+(time===1?'turn':'turns') : '—')+'</div>';
}

const escape = value => String(value).replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
// Run the same harvest and council calculations used by a committed focus order.
export function focusPlan(state,seat,cityId,focus) {
  const city=state.cities.find(c=>c.id===cityId && c.seat===seat);
  if (!city || (state.intel && state.intel.seat!==seat) || !Object.hasOwn(CITY_FOCUS,focus)) return null;
  const simulation=focus===(city.focus || 'balanced') ? state :
    {...state,cities:state.cities.map(c=>c.id===cityId ? {...c,focus} : c)};
  return {
    workforce:getCitizenWorkforce(simulation,cityId), population:getPopulationReport(simulation,cityId),
    production:getCityYield(simulation,cityId).production, science:getStats(simulation,seat).scienceIncome
  };
}
function focusComparison(current,plan) {
  const pair=(label,from,to)=>line(label,from+' → '+to);
  const food=plan.population;
  const outlook=food.starvationTurns ? 'Population loss' : food.housingLimited ? 'Housing full' : food.growthTurns ? 'Next citizen' : 'Population stable';
  const turns=food.starvationTurns || food.growthTurns;
  return '<div class="city-food-report" aria-live="polite"><strong>Current → proposed</strong>'+
    pair('Food balance',signed(current.population.surplus),signed(food.surplus))+
    pair('City production per turn',current.production,plan.production)+
    pair('Civilization science per turn',current.science,plan.science)+
    line(outlook,turns ? '<span>'+turns+' '+(turns===1?'turn':'turns')+'</span>' : '—')+'</div>';
}

let ledger,openedCity,orderFocus,orderHousing,returnFocus,selectedFocus,latest;
export function openCitizenLedger(cityId, onFocus, onHousing) {
  if(!ledger) {
    ledger=document.createElement('dialog');
    ledger.className='modal-terminal population-dialog';
    ledger.setAttribute('aria-labelledby','population-dialog-title');
    document.body.appendChild(ledger);
    ledger.onclick=event=>{
      if(event.target===ledger || event.target.closest('[data-citizens-close]')){ledger.close();return;}
      const project=event.target.closest('[data-housing-project]');
      if(project && !project.disabled){
        const cityId=openedCity;
        returnFocus=null;
        ledger.close();
        orderHousing(cityId,project.dataset.housingProject);
        return;
      }
      const apply=event.target.closest('[data-apply-focus]');
      if(apply && !apply.disabled && selectedFocus){
        const focus=selectedFocus;
        selectedFocus=null;
        orderFocus(openedCity,focus);
        return;
      }
      const button=event.target.closest('[data-city-focus]');
      if(button && !button.disabled && latest){
        selectedFocus=button.dataset.cityFocus;
        paintCitizenLedger(...latest);
      }
    };
    ledger.addEventListener('close',()=>{
      openedCity=null;selectedFocus=null;latest=null;
      if(returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
      else if(returnFocus) document.querySelector('[data-order="citizens"]')?.focus({preventScroll:true});
    });
  }
  openedCity=cityId;orderFocus=onFocus;orderHousing=onHousing;selectedFocus=null;
  returnFocus=document.activeElement;
  ledger.showModal();
}
export function paintCitizenLedger(state,seat,canAct,readProjects) {
  if(!ledger?.open)return;
  const city=state.cities.find(c=>c.id===openedCity&&c.seat===seat);
  if(!city){ledger.close();return;}
  latest=[state,seat,canAct,readProjects];
  const current=focusPlan(state,seat,city.id,city.focus || 'balanced');
  if(!current){ledger.close();return;}
  const draft=selectedFocus && selectedFocus!==current.workforce.focus ? focusPlan(state,seat,city.id,selectedFocus) : null;
  const {workforce}=draft || current;
  const projects=readProjects(city);
  const housingList=projects.filter(p=>['granary','neighborhood'].includes(p.item)).map(p=>{
    const built=city.buildings.includes(p.item);
    const selected=city.queue?.item===p.item;
    const capacity=current.population.housing;
    const after=built ? capacity : capacity+housingCapacity({...city,buildings:[...city.buildings,p.item]})-housingCapacity(city);
    const detail=built?'Completed':selected?'Under construction':!p.enabled?p.reason:p.turns+' '+(p.turns===1?'turn':'turns');
    return '<button type="button" class="housing-project" data-housing-project="'+p.item+'" '+(!p.enabled||!canAct?'disabled':'')+'>'+
      illustration(p.item)+'<b>'+escape(p.label)+'</b><span>'+escape(detail)+'</span>'+
      (!built ? '<small><span>Housing capacity</span> · '+capacity+' → '+after+'</small>' : '')+
      (p.enabled && canAct ? '<span>Choose site on map</span>' : '')+'</button>';
  }).join('');
  const activeChoice=ledger.contains(document.activeElement) && document.activeElement.dataset.cityFocus;
  const focus=Object.entries(CITY_FOCUS).map(([id,name])=>'<button type="button" class="modal-tab" data-city-focus="'+id+
    '" aria-pressed="'+(id===workforce.focus)+'">'+name+'</button>').join('');
  const comparison=draft ? focusComparison(current,draft)+'<button class="modal-primary" type="button" data-apply-focus '+(!canAct?'disabled':'')+
    '><span>Apply focus</span> · <span>'+CITY_FOCUS[draft.workforce.focus]+'</span></button>' : '';
  const jobs=workforce.workedTiles.map(job=>'<li><strong>'+escape(job.name)+'</strong>'+(job.naturalWonders||[]).map(id=>'<small> · <span>'+escape(NATURAL_WONDERS[id].name)+'</span></small>').join('')+'<small> × '+job.workers+'</small>'+
    '<span>'+job.output[0]+' / '+job.output[1]+' / '+job.output[2]+'</span></li>').join('');
  const html='<div class="modal-shell"><div class="modal-head"><div><small class="modal-kicker">City planning</small>'+
    '<h2 class="modal-title" id="population-dialog-title">'+escape(city.name)+'</h2></div><button type="button" class="modal-close" data-citizens-close aria-label="Close dialog">×</button></div>'+
    '<div class="modal-body">'+populationSummary(current.population)+'<h3>Citizen focus</h3><p><span>Current focus</span> · <strong>'+CITY_FOCUS[current.workforce.focus]+
    '</strong></p><div class="focus-options">'+focus+'</div>'+comparison+
    '<h3>Housing investments</h3><div class="housing-projects">'+housingList+'</div><h3>'+(draft?'Proposed work assignments':'Worked districts')+'</h3><p class="modal-muted">Food / production / science per worker</p><ul class="work-tiles">'+jobs+'</ul></div></div>';
  if(ledger._lastHtml!==html){
    ledger._lastHtml=html;ledger.innerHTML=html;
    if(activeChoice)ledger.querySelector('[data-city-focus="'+activeChoice+'"]')?.focus();
    else if(!ledger.contains(document.activeElement))ledger.querySelector('[data-citizens-close]')?.focus();
  }
}
