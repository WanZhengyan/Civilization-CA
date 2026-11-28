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
  return '<div class="work-choices"><div>'+make('produce','City production','',option.reason)+'</div><div>'+
    make('buy','Buy with gold',' <b>'+option.gold+'</b>',option.buyReason)+'</div></div>';
}
export function orderReview(draft,city,option,sites,label) {
  const q=city.queue, purchase=draft.type==='buyProduction';
  const other=q && q.item!==draft.item;
  const cost=purchase?'<div><span>Gold cost</span><b>'+draft.gold+'</b></div>':'';
  const bank=other?'<p><span>Work saved if you switch</span> · <b>'+escape(label(q.item))+'</b> · '+q.progress+' / '+q.required+'</p>':'';
  const parked=option.saved?'<p><span>Stored production</span> · '+option.saved+'</p>':'';
  const options=sites.length?'<label><span>Construction tile</span><select data-work-site>'+sites.map(s=>
      '<option value="'+escape(s.id)+'" '+(draft.site===s.id?'selected':'')+'>'+escape(s.name)+' · '+escape(s.id)+'</option>').join('')+'</select></label>':'';
  const title=purchase?'Confirm purchase':other?'Confirm project change':'Confirm production';
  return '<div class="work-review"><button type="button" data-work-back>Back to production</button><h3>'+escape(option.label)+'</h3>'+cost+bank+parked+options+
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
  const html='<div class="work-bar-title"><strong>'+escape(option.label)+'</strong><small>'+escape(city.name)+'</small></div>'+
    '<p><span>Choose a highlighted tile on the map.</span></p>'+
    '<label class="site-choice"><span>Construction tile</span><select data-site-list><option value="">Select a tile</option>'+
    sites.map(t=>'<option value="'+escape(t.id)+'" '+(selected?.id===t.id?'selected':'')+'>'+escape(t.name)+' · '+escape(t.id)+'</option>').join('')+'</select></label>'+
    (selected && Object.hasOwn(selected,'favored') && option.item && draft.university ? '<small><span>'+(selected.favored?'Specialty terrain':'Standard campus yield')+'</span></small>' : '')+
    (draft.type==='switchProduction' || (draft.type==='buyProduction' && city.queue && city.queue.item!==draft.item) ?
      '<small><span>Work saved if you switch</span> · '+Number(city.queue?.progress||0)+' / '+Number(city.queue?.required||0)+'</small>' : '')+
    '<div class="work-bar-actions"><button data-site-cancel type="button">Cancel placement</button><button data-site-confirm type="button" '+
    (siteOrderAllowed(draft,city,option,sites,canOrder)?'':'disabled')+'><span>'+(draft.type==='buyProduction'?'Confirm purchase':'Confirm site')+'</span>'+
    (draft.gold!=null?' · '+draft.gold+' <span>gold</span>':'')+'</button></div>';
  if(bar.dataset.rendered!==html){bar.innerHTML=html;bar.dataset.rendered=html;}
}
