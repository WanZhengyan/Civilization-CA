import {FACTIONS, UNIT_TYPES} from './rules.js';
import {witnessedMode} from './attack-mode.js';
import {WILDS} from './barbarians.js';
import {closeMapPanel} from './map-workspace.js';
import {getLanguage, translate} from './i18n.js';

const storageKey='civitas.battle-summary';
const maxPlayback=6;
const exposure=2350;

const labels={
  all:['All battles','全部交战'], received:['Attacks on me','我方遇袭'], filter:['Filter battle reports','筛选战报'],
  noIncoming:['No attacks on your units or cities have been reported.','尚未记录针对我方部队或城市的攻击。'],
  attackerHp:['Attacker HP','攻方生命'], defenderHp:['Defender HP','守方生命'],
  earlier:['Earlier battle','上一场'], later:['Later battle','下一场'], back:['Return to map','返回地图'],
  list:['Report list','战报列表'],
  history:['Battle reports','战报'], incoming:['Under attack','我方遇袭'], outgoing:['Your attack','我方进攻'],
  witnessed:['Observed battle','目击交战'], unidentified:['Unidentified attacker','未辨明的攻击者'],
  replay:['Replay on map','在地图上回放'], dismiss:['Dismiss','收起'], close:['Close battle reports','关闭战报'],
  empty:['No battles have been reported.','目前没有战报。'], city:['City','城市'], unit:['Unit','部队'],
  destroyed:['Defender defeated','守方被击败'], captured:['City captured','城市被占领'], repelled:['Raid repelled','劫掠被击退'],
  raided:['City raided','城市遭劫掠'], lost:['Attacker defeated','攻方被击败'], held:['No damage','未受伤害']
};
const words=(id,locale)=>labels[id][locale==='zh-CN'?1:0];
const incoming=(r,seat)=>r.target.seat===seat && r.attacker.seat!==seat;
const turn=(n,zh)=>zh?'第 '+n+' 回合':'Turn '+n;

function combatant(part,players,locale) {
  if(part.kind==='unknown')return words('unidentified',locale);
  if(part.kind==='wild')return translate(WILDS[part.type]?.name || WILDS.raider.name,locale);
  const owner=FACTIONS[players[part.seat]?.faction];
  const name=part.kind==='city' ? (part.name || words('city',locale)) : (UNIT_TYPES[part.type]?.name || words('unit',locale));
  return [owner && translate(owner.name,locale),translate(name,locale)].filter(Boolean).join(' · ');
}

export function describeBattle(report,players,region,seat,locale=getLanguage()) {
  const zh=locale==='zh-CN';
  const source=combatant(report.attacker,players,locale), target=combatant(report.target,players,locale);
  const disposition=incoming(report,seat)?'incoming':report.attacker.seat===seat?'outgoing':'witnessed';
  const district=region.byId[report.target.tile]?.name;
  const location=[district && translate(district,locale),'('+report.target.tile.split(',').join(', ')+')'].filter(Boolean).join(' ');
  const details=[];
  if(report.damage>0)details.push(zh?'守方损失 '+report.damage+' 生命':report.damage+' damage to defender');
  const mode=witnessedMode(report,UNIT_TYPES);
  if(mode)details.push(translate(mode==='ranged'?'Ranged strike':'Melee strike',locale));
  if(report.retaliation>0 || (mode==='ranged' && report.retaliation===0))
    details.push(zh?'反击造成 '+report.retaliation+' 伤害':report.retaliation+' counterdamage');
  const outcome=({destroyed:'destroyed',captured:'captured',repelled:'repelled',looted:'raided'})[report.outcome] || (report.targetLost?'destroyed':null);
  if(outcome)details.push(words(outcome,locale));
  if(report.attackerLost)details.push(words('lost',locale));
  if(report.loot>0)details.push(zh?'被掠走 '+report.loot+' 资金':report.loot+' capital looted');
  if(report.garrison)details.push(zh?translate(report.garrison,locale)+'驻军':'Garrison of '+translate(report.garrison,locale));
  if(!details.length)details.push(words('held',locale));
  return {category:words(disposition,locale),turn:turn(report.round,zh),source,target,location,
    action:zh?source+' 攻击了 '+target:source+' attacked '+target,details:details.join(' · ')};
}

// Older reports may only have damage. A unit appearing after a capture may
// also lack a witnessed starting position and health.
export function witnessedHealth(report,locale=getLanguage()) {
  const readings=[];
  for(const [part,label] of [[report.target,'defenderHp'],[report.attacker,'attackerHp']]) {
    if(part.kind==='unknown' || !Number.isFinite(part.hpBefore) || !Number.isFinite(part.hpAfter))continue;
    readings.push({label:words(label,locale),before:part.hpBefore,after:part.hpAfter});
  }
  return readings;
}

export function recentIncomingReport(reports,seat,dismissed,round) {
  return reports.findLast(r=>incoming(r,seat) && r.id>dismissed && r.round>=round-1) || null;
}

export function pendingIncoming(reports,seat,played,dismissed,round) {
  return reports.filter(r=>incoming(r,seat) && r.id>Math.max(played,dismissed) && (played>0 || r.round>=round-1)).slice(-maxPlayback);
}

function readHistory() {
  try {return JSON.parse(localStorage.getItem(storageKey)) || {};} catch {return {};}
}
function make(tag,cls,content) {
  const element=document.createElement(tag);
  if(cls)element.className=cls;
  if(content)element.textContent=content;
  return element;
}
function button(cls) {
  const b=make('button',cls);b.type='button';return b;
}

export function mountBattleReports(atlas) {
  let view,region,key,records=[],recent=[],notice,playing,review=null,timer,lastQueued=0,lastRound=0;
  let played=0,dismissed=0,listVersion='',incomingOnly=false;
  const frame=document.getElementById('map-frame');
  const strip=make('aside','battle-dispatch');strip.id='battle-dispatch';strip.hidden=true;
  strip.setAttribute('translate','no');
  const copy=make('div','battle-dispatch-copy');copy.setAttribute('role','status');copy.setAttribute('aria-atomic','true');
  const heading=make('span','battle-meta'), line=make('strong'), detail=make('span','battle-detail');
  const reading=make('span','battle-review-health');
  copy.append(heading,line,detail,reading);
  const actions=make('div','battle-dispatch-actions'), locate=button('battle-link'), history=button('battle-link'), dismiss=button('battle-dismiss');
  const earlier=button('battle-link'),later=button('battle-link');
  actions.append(locate,earlier,later,history,dismiss);strip.append(copy,actions);frame.before(strip);
  const entry=button('text-btn battle-entry');entry.id='battle-reports-button';entry.setAttribute('translate','no');
  document.querySelector('.chronicle-head [data-open="log"]').before(entry);

  const dialog=make('dialog','order-dialog battle-history');dialog.id='battle-history';dialog.setAttribute('aria-labelledby','battle-history-title');dialog.setAttribute('translate','no');
  const shell=make('div','modal-shell'),head=make('header','modal-head'),title=make('h2','modal-title'),close=button('modal-close');
  title.id='battle-history-title';close.textContent='×';
  const filters=make('div','battle-filters'),all=button('battle-filter'),received=button('battle-filter');
  filters.setAttribute('role','group');filters.append(all,received);
  const body=make('div','modal-body');head.append(title,close);shell.append(head,filters,body);dialog.append(shell);document.body.append(dialog);

  function persist() {
    const old=readHistory();
    delete old[key];
    old[key]={played,dismissed};
    try{localStorage.setItem(storageKey,JSON.stringify(Object.fromEntries(Object.entries(old).slice(-24))));}catch{}
  }
  function describe(r){return describeBattle(r,view.state.players,region,view.seat);}
  function renderNotice() {
    const locale=getLanguage(), text=id=>words(id,locale);
    const count=records.length?' ('+records.length+')':'';
    entry.textContent=text('history')+count;
    title.textContent=text('history');close.setAttribute('aria-label',text('close'));
    strip.classList.toggle('reviewing',Boolean(review));
    history.textContent=review?text('list'):text('history')+count;
    locate.textContent=text('replay');locate.hidden=Boolean(review);
    earlier.hidden=later.hidden=reading.hidden=!review;
    earlier.textContent=text('earlier');later.textContent=text('later');
    dismiss.textContent=review?text('back'):'×';
    dismiss.setAttribute('aria-label',text(review?'back':'dismiss'));dismiss.title=dismiss.getAttribute('aria-label');
    if(!notice){strip.hidden=true;return;}
    const d=describe(notice);
    heading.textContent=d.category+'  ·  '+d.turn;line.textContent=d.action;
    detail.textContent=d.details+'  ·  '+d.location;strip.hidden=false;
    if(review){
      earlier.disabled=review.index===0;later.disabled=review.index===review.reports.length-1;
      const position=(review.index+1)+' / '+review.reports.length;
      heading.textContent=position+'  ·  '+heading.textContent;
      reading.textContent=witnessedHealth(notice,locale).map(h=>h.label+' '+h.before+' → '+h.after).join('  ·  ');
      reading.hidden=!reading.textContent;
    }
  }
  function drawHistory() {
    const locale=getLanguage();
    const version=[key,locale,records.at(-1)?.id,records[0]?.id,incomingOnly].join('|');
    if(listVersion===version)return;
    listVersion=version;
    const fragment=document.createDocumentFragment();
    const attacks=records.filter(r=>incoming(r,view.seat));
    filters.setAttribute('aria-label',words('filter',locale));
    all.textContent=words('all',locale)+' ('+records.length+')';
    received.textContent=words('received',locale)+' ('+attacks.length+')';
    all.setAttribute('aria-pressed',String(!incomingOnly));
    received.setAttribute('aria-pressed',String(incomingOnly));
    const matching=incomingOnly ? attacks : records;
    if(!matching.length)fragment.append(make('p','battle-empty',words(incomingOnly?'noIncoming':'empty',locale)));
    for(const r of [...matching].reverse()) {
      const d=describe(r),row=make('article','battle-record');
      row.append(make('span','battle-meta',d.category+'  ·  '+d.turn),make('h3','',d.action),make('p','',d.details));
      const readings=witnessedHealth(r,locale);
      if(readings.length){
        const health=make('dl','battle-health');
        for(const {label,before,after} of readings){
          const pair=make('div','');
          pair.append(make('dt','',label),make('dd','',before+' → '+after));
          health.append(pair);
        }
        row.append(health);
      }
      const foot=make('div','battle-record-foot'),loc=make('span','',d.location),b=button('battle-link');
      b.textContent=words('replay',getLanguage());b.dataset.report=String(r.id);
      b.setAttribute('aria-label',b.textContent+' · '+d.location+' · '+d.action);foot.append(loc,b);row.append(foot);fragment.append(row);
    }
    const scroll=body.scrollTop,active=document.activeElement?.dataset.report;
    body.replaceChildren(fragment);
    if(active)body.querySelector('[data-report="'+active+'"]')?.focus({preventScroll:true});
    body.scrollTop=scroll;
  }
  function visible(){return !document.hidden && !document.body.classList.contains('on-title') && !document.querySelector('dialog[open]');}
  function halt() {
    clearTimeout(timer);timer=null;playing=null;review=null;atlas.stopBattle();
  }
  function next() {
    if(playing || !visible() || !view)return;
    const r=recent.shift();
    if(!r){atlas.stopBattle();return;}
    playing=notice=r;
    played=Math.max(played,r.id);persist();
    renderNotice();atlas.playBattle(r,false,exposure);
    timer=setTimeout(()=>{playing=null;next();},exposure);
  }
  function showReviewed(index) {
    if(!review || index<0 || index>=review.reports.length)return;
    review.index=index;
    playing=notice=review.reports[index];
    recent=recent.filter(report=>report.id!==notice.id);
    renderNotice();atlas.playBattle(notice,true,exposure);
    if(document.activeElement===earlier && earlier.disabled)later.focus({preventScroll:true});
    if(document.activeElement===later && later.disabled)earlier.focus({preventScroll:true});
  }
  function replay(r,attacks) {
    if(!r)return;
    const reports=attacks?records.filter(report=>incoming(report,view.seat)):[...records];
    const index=reports.findIndex(report=>report.id===r.id);
    if(index<0)return;
    if(playing && !review && playing.id!==r.id)recent.unshift(playing);
    halt();
    review={reports,index,attacks};
    closeMapPanel();
    frame.scrollIntoView({block:'nearest',behavior:'instant'});
    showReviewed(index);
    (later.disabled?(earlier.disabled?dismiss:earlier):later).focus({preventScroll:true});
  }
  function stopReview(toList) {
    const id=notice.id,attacks=review.attacks;
    halt();
    notice=recentIncomingReport(records,view.seat,dismissed,lastRound);
    renderNotice();
    if(toList){
      openHistory(attacks);
      const rowButton=body.querySelector('[data-report="'+id+'"]');
      rowButton?.focus({preventScroll:true});rowButton?.scrollIntoView({block:'nearest'});
    }else{
      document.querySelector('#atlas canvas')?.focus({preventScroll:true});next();
    }
  }
  function visibilityChanged(){
    if(review && !document.body.classList.contains('on-title') && !document.querySelector('dialog[open]'))return;
    if(!visible()){
      if(playing && !review)recent.unshift(playing);
      halt();
      if(view){notice=recentIncomingReport(records,view.seat,dismissed,lastRound);renderNotice();}
    }else next();
  }
  function setFilter(value) {
    incomingOnly=value;
    body.scrollTop=0;
    drawHistory();
  }
  function openHistory(attacks=false){
    if(!view)return;
    setFilter(attacks);dialog.showModal();visibilityChanged();
  }
  all.onclick=()=>setFilter(false);
  received.onclick=()=>setFilter(true);
  entry.onclick=()=>openHistory();
  history.onclick=()=>review?stopReview(true):openHistory(Boolean(notice && incoming(notice,view.seat)));
  locate.onclick=()=>replay(notice,incoming(notice,view.seat));
  earlier.onclick=()=>showReviewed(review.index-1);later.onclick=()=>showReviewed(review.index+1);
  dismiss.onclick=()=>{
    if(review){stopReview(false);return;}
    const latest=records.findLast(r=>incoming(r,view.seat));
    dismissed=Math.max(dismissed,latest?.id||0);persist();recent=[];halt();notice=null;renderNotice();entry.focus({preventScroll:true});
  };
  body.onclick=e=>{
    const id=e.target.closest('[data-report]')?.dataset.report;
    if(!id)return;
    const r=records.find(x=>String(x.id)===id);
    dialog.close();replay(r,incomingOnly);
  };
  close.onclick=()=>dialog.close();
  dialog.onclick=e=>{if(e.target===dialog)dialog.close();};
  document.addEventListener('civitas-battle-history',()=>openHistory());
  document.addEventListener('visibilitychange',visibilityChanged);
  document.addEventListener('civitas-screen',visibilityChanged);
  // Dialogs block the battlefield. Keep pending reports until the map is available.
  new MutationObserver(visibilityChanged).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
  document.addEventListener('civitas-language',()=>{if(view){renderNotice();if(dialog.open)drawHistory();}});
  return {update(nextView,nextKey,nextRegion){
    const changed=key!==nextKey;
    view=nextView;region=nextRegion;
    if(changed){
      halt();if(dialog.open)dialog.close();
      key=nextKey;const saved=readHistory()[key]||{};
      played=Number(saved.played)||0;dismissed=Number(saved.dismissed)||0;
      lastQueued=0;recent=[];notice=null;
    }
    records=view.state.intel?.battles || [];
    const newest=records.at(-1)?.id || 0;
    if(!changed && newest===lastQueued && lastRound===view.state.round)return;
    lastRound=view.state.round;
    const delta=pendingIncoming(records,view.seat,played,dismissed,view.state.round).filter(r=>r.id>lastQueued);
    recent=recent.concat(delta).slice(-maxPlayback);lastQueued=newest;
    if(!playing && !recent.length)notice=recentIncomingReport(records,view.seat,dismissed,lastRound);
    renderNotice();if(dialog.open)drawHistory();next();
  }};
}
