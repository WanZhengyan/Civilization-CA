import {FESTIVALS,festivalOptions} from './city-festivals.js';
import {charterOptions} from './city-charters.js';
import {illustration} from './illustrations.js';

const esc=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let dialog,cityId,submit,review=null,previous;

function charterCards(state,seat,city,canAct) {
  const options=charterOptions(state,seat,city);
  const rows=options.filter(row=>!city.charter || city.charter===row.id).map(row=>{
    const disabled=!!row.reason || !canAct;
    return '<div class="city-hall-card">'+illustration(row.building)+'<div><strong>'+row.name+'</strong><p>'+row.description+'</p>'+
      (disabled?'<small>'+esc(row.reason || 'Wait for your turn.')+'</small>':
        '<button class="modal-tab" data-hall-choice="cityCharter" data-item="'+row.id+'">Review charter</button>')+'</div></div>';
  });
  return '<section><h3>Municipal charter</h3><p class="modal-muted">A city with two residents can spend 18 gold on one permanent charter. The charter stays with the city if it changes hands.</p>'+rows.join('')+'</section>';
}

function festivalCards(state,seat,city,canAct) {
  const options=festivalOptions(state,seat,city);
  if(!options.length) return '<section><h3>City festivals</h3><small>Adopt Municipal Charter to organize local festivals.</small></section>';
  let body='<p class="modal-muted">Hosting costs 8 gold and 4 stored city food. After three festival harvests the city needs three more harvests to prepare another event.</p>';
  body+='<p><span>Stored food</span> · '+city.food+'</p>';
  if(city.festival) {
    const current=FESTIVALS[city.festival];
    return '<section><h3>'+current.name+'</h3><p>'+current.description+'</p><p><span>Festival harvests remaining</span> · '+city.festivalHarvests+'</p></section>';
  }
  if(city.festivalRecovery) return '<section><h3>City festivals</h3><p><span>Harvests before the next festival</span> · '+city.festivalRecovery+'</p></section>';
  return '<section><h3>City festivals</h3>'+body+options.map(row=>'<div class="city-hall-card">'+illustration(row.art)+
    '<div><strong>'+row.name+'</strong><p>'+row.description+'</p>'+(row.reason || !canAct ? '<small>'+esc(row.reason||'Wait for your turn.')+'</small>':
    '<button class="modal-tab" data-hall-choice="cityFestival" data-item="'+row.id+'">Review festival</button>')+'</div></div>').join('')+'</section>';
}

export function openCityHall(id,onOrder) {
  if (!dialog) {
    dialog=document.createElement('dialog');
    dialog.className='modal-terminal population-dialog city-hall-dialog';
    dialog.setAttribute('aria-labelledby','city-hall-title');
    document.body.append(dialog);
    dialog.onclick=e=>{
      const btn=e.target.closest('button');
      if(e.target===dialog || btn?.hasAttribute('data-hall-close')) {dialog.close();return;}
      if(!btn || btn.disabled) return;
      if(btn.hasAttribute('data-hall-back')) review=null;
      else if(btn.hasAttribute('data-hall-confirm') && review) {
        const action=review;review=null;submit({city:cityId,...action});
      } else if(btn.dataset.hallChoice) review={type:btn.dataset.hallChoice,item:btn.dataset.item};
      if(previous) paintCityHall(...previous);
    };
    dialog.addEventListener('close',()=>{previous=null;review=null;document.querySelector('[data-order="city-hall"]')?.focus();});
  }
  cityId=id;submit=onOrder;review=null;dialog.showModal();
}

export function paintCityHall(state,seat,canAct) {
  if(!dialog?.open) return;
  const city=state.cities.find(c=>c.id===cityId && c.seat===seat);
  if(!city || state.campaignVariety!==1){dialog.close();return;}
  previous=[state,seat,canAct];
  let body=charterCards(state,seat,city,canAct)+festivalCards(state,seat,city,canAct);
  if(review) {
    const festival=review.type==='cityFestival';
    const row=(festival ? festivalOptions : charterOptions)(state,seat,city).find(option=>option.id===review.item);
    if(row && !row.reason){
      body='<h3>'+row.name+'</h3><p>'+row.description+'</p><p>'+(festival?'Spend 8 gold and 4 stored food to open this festival.':'Spend 18 gold to grant this city its permanent charter.')+'</p>'+
        '<div class="focus-options"><button class="modal-tab" data-hall-back>Back</button>'+
        '<button class="modal-tab" data-hall-confirm '+(canAct?'':'disabled')+ '>'+(festival?'Open festival':'Grant charter')+'</button></div>';
    } else review=null;
  }
  const html='<div class="modal-shell"><div class="modal-head"><div><small class="modal-kicker">City hall</small>'+
    '<h2 id="city-hall-title" class="modal-title">'+esc(city.name)+'</h2></div><button class="modal-close" data-hall-close aria-label="Close dialog">×</button></div>'+
    '<div class="modal-body"><small class="modal-muted"><span>Treasury</span> · '+state.players[seat].capital+'</small>'+body+'</div></div>';
  if (dialog._html!==html) {
    const target=dialog.contains(document.activeElement) && document.activeElement.dataset;
    dialog._html=html;dialog.innerHTML=html;
    const next=review?dialog.querySelector('[data-hall-confirm]'):target?.hallChoice?
      [...dialog.querySelectorAll('[data-hall-choice]')].find(b=>b.dataset.hallChoice===target.hallChoice && b.dataset.item===target.item):null;
    (next||dialog.querySelector('[data-hall-close]')).focus({preventScroll:true});
  }
}
