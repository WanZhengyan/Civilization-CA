import {SETTLER_RESIDENT_COST} from './population.js';
import {illustration} from './illustrations.js';
import {WONDERS} from './wonders.js';
import {revisionOf} from './works.js';

function escape(value) { return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
export function draftOrder(city,option,buy) {
  return {type:buy?'buyProduction':city.queue?'switchProduction':'produce',city:city.id,item:option.item,
    expected:revisionOf(city),...(buy ? {gold:option.gold} : {})};
}
export function orderButtons(option,allowed) {
  const make=(key,label,n,blocked)=>{
    const reason=blocked || (!allowed ? 'Wait for your turn.' : '');
    return '<button type="button" data-'+key+'="'+escape(option.item)+'" '+(reason?'disabled':'')+'><span>'+label+'</span>'+n+'</button>'+
      (reason?'<small class="works-reason">'+escape(reason)+'</small>':'');
  };
  if(option.kind==='project' || Object.hasOwn(WONDERS,option.item)) return '<div class="work-choices"><div>'+make('produce','City production','',option.reason)+'</div></div>';
  return '<div class="work-choices"><div>'+make('produce','City production','',option.reason)+'</div><div>'+
    make('buy','Buy with gold',' <b>'+option.gold+'</b>',option.buyReason)+'</div></div>';
}
function workQuote(draft,city,option) {
  const purchase=draft.type==='buyProduction';
  const invested=city.queue?.item===option.item ? city.queue.progress : option.saved || 0;
  const row=(name,value,unit='')=>'<div><dt>'+name+'</dt><dd>'+escape(value)+
    (unit?' <span>'+unit+'</span>':'')+'</dd></div>';
  const timing=purchase ? 'Immediately' : option.turns===0 && option.kind==='unit' ? 'Awaiting deployment' :
    option.turns+' '+(option.turns===1?'turn':'turns');
  let rows=row('Estimated completion',timing);
  if (option.item==='settler') rows+=row('Current residents',city.population)+row('Residents leaving on deployment',SETTLER_RESIDENT_COST);
  if (purchase) rows+=row('Gold cost',draft.gold);
  else {
    rows+=row('Production remaining',Math.max(0,option.required-invested));
    if (WONDERS[option.item]) rows+=row('Charter fee',WONDERS[option.item].grant,'gold');
  }
  if(invested)rows+=row('Stored production',invested+' / '+option.required);
  return '<dl class="work-quote">'+rows+'</dl>';
}

export function orderReview(draft,city,option,sites,label,description='') {
  const q=city.queue, purchase=draft.type==='buyProduction';
  const other=q && q.item!==draft.item;
  const bank=other?'<p><span>Work saved if you switch</span> · <b>'+escape(label(q.item))+'</b> · '+q.progress+' / '+q.required+'</p>':'';
  const options=sites.length?'<label><span>Construction tile</span><select data-work-site>'+sites.map(s=>
      '<option value="'+escape(s.id)+'" '+(draft.site===s.id?'selected':'')+'>'+escape(s.name)+' · '+escape(s.id)+'</option>').join('')+'</select></label>':'';
  const title=purchase?'Confirm purchase':other?'Confirm project change':'Confirm production';
  return '<div class="work-review"><button type="button" data-work-back>Back to production</button>'+
    '<div class="work-subject">'+illustration(option.item)+'<div><h3>'+escape(option.label)+'</h3>'+
    (description?'<p>'+escape(description)+'</p>':'')+'</div></div>'+workQuote(draft,city,option)+bank+options+
    '<button class="modal-primary" type="button" data-work-confirm>'+title+'</button></div>';
}

export function siteOrderAllowed(draft,city,option,sites,canOrder) {
  if (!draft || !city || !option || !canOrder || city.id!==draft.city || revisionOf(city)!==draft.expected) return false;
  if (draft.type==='buyProduction' ? !option.buyEnabled || option.gold!==draft.gold : !option.enabled) return false;
  return sites.some(s=>s.id===draft.site);
}

export function paintSiteBar(bar,draft,city,option,sites,canOrder) {
  bar.hidden=!draft;
  if (!draft) {bar.replaceChildren();return;}
  const selected=sites.find(s=>s.id===draft.site);
  const html='<div class="work-bar-title">'+illustration(option.item)+'<div><strong>'+escape(option.label)+'</strong><small>'+escape(city.name)+'</small></div></div>'+
    workQuote(draft,city,option)+
    '<p><span>Choose a highlighted tile on the map.</span></p>'+
    '<label class="site-choice"><span>Construction tile</span><select data-site-list><option value="">Select a tile</option>'+
    sites.map(t=>'<option value="'+escape(t.id)+'" '+(selected?.id===t.id?'selected':'')+'>'+escape(t.name)+' · '+escape(t.id)+'</option>').join('')+'</select></label>'+
    (selected && Object.hasOwn(selected,'favored') && option.item && draft.university ? '<small><span>'+(selected.favored?'Specialty terrain':'Standard campus yield')+'</span></small>' : '')+
    (draft.type==='switchProduction' || (draft.type==='buyProduction' && city.queue && city.queue.item!==draft.item) ?
      '<small><span>Work saved if you switch</span> · '+Number(city.queue?.progress||0)+' / '+Number(city.queue?.required||0)+'</small>' : '')+
    '<div class="work-bar-actions"><button data-site-cancel type="button">Cancel placement</button><button data-site-confirm type="button" '+
    (siteOrderAllowed(draft,city,option,sites,canOrder)?'':'disabled')+'><span>'+(draft.type==='buyProduction'?'Confirm purchase':'Confirm site')+'</span>'+
    '</button></div>';
  if(bar.dataset.rendered!==html){bar.innerHTML=html;bar.dataset.rendered=html;}
}
