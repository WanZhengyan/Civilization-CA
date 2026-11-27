import {illustration} from './illustrations.js';

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
const focusNames={balanced:'Balanced',food:'Food supply',industry:'Industry focus',science:'Science focus'};
let ledger, openedCity, orderFocus, orderHousing, returnFocus;

export function openCitizenLedger(cityId, onFocus, onHousing) {
  if(!ledger) {
    ledger=document.createElement('dialog');
    ledger.className='modal-terminal population-dialog';
    ledger.setAttribute('aria-labelledby','population-dialog-title');
    document.body.appendChild(ledger);
    ledger.onclick=event=>{
      if(event.target===ledger || event.target.closest('[data-citizens-close]')){ledger.close();return;}
      const project=event.target.closest('[data-housing-project]');
      if(project && !project.disabled){orderHousing(openedCity,project.dataset.housingProject);return;}
      const button=event.target.closest('[data-city-focus]');
      if(button && !button.disabled) orderFocus(openedCity,button.dataset.cityFocus);
    };
    ledger.addEventListener('close',()=>{
      openedCity=null;
      if(returnFocus?.isConnected) returnFocus.focus();
      else document.querySelector('[data-order="citizens"]')?.focus();
    });
  }
  openedCity=cityId;orderFocus=onFocus;orderHousing=onHousing;
  returnFocus=document.activeElement;
  ledger.showModal();
}
export function paintCitizenLedger(state,seat,canAct,read) {
  if(!ledger?.open)return;
  const city=state.cities.find(c=>c.id===openedCity&&c.seat===seat);
  if(!city){ledger.close();return;}
  const {population,workforce,projects}=read(city);
  const housingList=projects.filter(p=>['granary','neighborhood'].includes(p.item)).map(p=>{
    const built=city.buildings.includes(p.item);
    const selected=city.queue?.item===p.item;
    const detail=built?'Completed':selected?'Under construction':!p.enabled?p.reason:p.turns+' '+(p.turns===1?'turn':'turns');
    return '<button type="button" class="housing-project" data-housing-project="'+p.item+'" '+(!p.enabled||!canAct?'disabled':'')+'>'+
      illustration(p.item)+'<b>'+escape(p.label)+'</b><span>'+escape(detail)+'</span></button>';
  }).join('');
  const activeChoice=ledger.contains(document.activeElement) && document.activeElement.dataset.cityFocus;
  const focus=Object.entries(focusNames).map(([id,name])=>'<button type="button" class="modal-tab" data-city-focus="'+id+
    '" aria-pressed="'+(id===workforce.focus)+'" '+(!canAct?'disabled':'')+'>'+name+'</button>').join('');
  const jobs=workforce.workedTiles.map(job=>'<li><strong>'+escape(job.name)+'</strong><small> × '+job.workers+'</small>'+
    '<span>'+job.output[0]+' / '+job.output[1]+' / '+job.output[2]+'</span></li>').join('');
  const html='<div class="modal-shell"><div class="modal-head"><div><small class="modal-kicker">City planning</small>'+
    '<h2 class="modal-title" id="population-dialog-title">'+escape(city.name)+'</h2></div><button type="button" class="modal-close" data-citizens-close aria-label="Close dialog">×</button></div>'+
    '<div class="modal-body">'+populationSummary(population)+'<h3>Citizen focus</h3><div class="focus-options">'+focus+'</div>'+
    '<h3>Housing investments</h3><div class="housing-projects">'+housingList+'</div><h3>Worked districts</h3><p class="modal-muted">Food / production / science per worker</p><ul class="work-tiles">'+jobs+'</ul></div></div>';
  if(ledger._lastHtml!==html){
    ledger._lastHtml=html;ledger.innerHTML=html;
    if(activeChoice)ledger.querySelector('[data-city-focus="'+activeChoice+'"]')?.focus();
    else if(!ledger.contains(document.activeElement))ledger.querySelector('[data-citizens-close]')?.focus();
  }
}
