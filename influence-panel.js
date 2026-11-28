import {BORDER_CHARTER_COST, getActions, getBorderCharter, getCityExpansions, getInfluenceIncomeSources, getMap} from './rules.js';
import {CIVICS, ERAS} from './progression.js';
import {CIVILIZATIONS} from './civilizations.js';
import {policyOptions} from './policy.js';
import {roomSeatTurn} from './room-turn.js';
import {getLanguage, translate} from './i18n.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const signed = value => value > 0 ? '+' + value : String(value);
const local = lang => (en, zh) => lang === 'zh-CN' ? zh : en;
const availableFirst = (a,b) => Number(Boolean(a.reason)) - Number(Boolean(b.reason));

function influenceOrders(view,lang) {
  const {state,seat} = view;
  const map = getMap(state), L = local(lang), t = value => translate(value,lang);
  const p = state.players[seat];
  function parcelName(id) {
    const tile=map.byId[id];
    return t(tile.name)+' ('+[tile.q,tile.r].map(n=>String(n).padStart(2,'0')).join(' / ')+')';
  }
  const cities = state.cities.filter(city => city.seat === seat);
  const expansions = getCityExpansions(state,seat);
  const borders = cities.map(city => {
    const q = getBorderCharter(state,seat,city.id,expansions);
    const cityName = city.name === map.byId[city.tile]?.name ? t(city.name) : city.name;
    const parcel = q.tile ? parcelName(q.tile) : '';
    const detail = q.tile ? L(`Annex ${parcel} now. Natural growth is due in ${q.turns} turns. Border progress resets from ${q.progress}/${q.required} to 0.`,`立即将「${parcel}」纳入领土。自然扩张还需 ${q.turns} 回合，扩张进度将从 ${q.progress}/${q.required} 归零。`) : '';
    return {key:String(city.id),target:cityName,result:parcel,tile:q.tile,detail,reason:t(q.reason),cost:q.cost,action:{type:'charterBorder',city:city.id,tile:q.tile}};
  });
  const missions = (state.intel?.diplomacy || []).filter(row => row.relation === 'rival' && row.delegationOrder).map(row => {
    const civ = CIVILIZATIONS[row.faction];
    const report = row.delegation;
    const detail = report ? L(`Report through round ${report.throughRound} · ${t(ERAS[report.era]?.name)} · ${report.cityCount} cities.`,`报告有效至第 ${report.throughRound} 轮：${t(ERAS[report.era]?.name)}，共 ${report.cityCount} 座城市。`) : '';
    return {key:String(row.seat),target:L(civ.name,civ.nameZh),detail,reason:t(row.delegationOrder.reason),cost:row.delegationOrder.cost,action:{type:'delegation',target:row.seat}};
  });
  const policies = policyOptions(state,seat).filter(o => !o.current).map(o => ({
    key:o.id,target:t(o.name),detail:t(o.description),reason:o.reason === 'Civic required'
      ? L('Requires '+t(CIVICS[o.civic].name)+'.','需要先完成「'+t(CIVICS[o.civic].name)+'」。') : t(o.reason),
    cost:o.fee,action:{type:'policy',item:o.id}
  }));
  const contests = [];
  for (const id of state.intel?.visible || []) {
    const parcel = state.board[id];
    if (parcel?.owner == null || parcel.owner === seat || !map.neighbors(id).some(tile => state.board[tile]?.owner === seat)) continue;
    const [order] = getActions(state,seat,id);
    if (order?.type !== 'contest') continue;
    contests.push({key:id,target:parcelName(id),tile:id,cost:order.cost.influence,gold:order.cost.capital,reason:t(order.reason),
      detail:L('Take ownership of this district. Uses one district order.','夺取该地块的控制权，消耗一次地区指令。'),action:{type:'contest',tile:id}});
  }
  const soloOnly = state.practice || state.players.length === 1;
  return [
    {id:'border',title:L('Expand borders now','提前扩张'),description:L('Annex the next neutral district once per city each round.','每座城市每轮可提前收下下一块中立地。'),button:L('Expand now','立即扩张'),cost:BORDER_CHARTER_COST,
      empty:L('Found your first city to see the district it can annex.','先建立首都，即可看到可以纳入领土的地块。'),options:borders},
    {id:'mission',title:L('Send a delegation','派遣使团'),description:L('See a rival’s era and total city count for three rounds.','在三轮内查看对方所处的时代和城市总数。'),button:L('Send delegation','派遣使团'),cost:6,
      empty:soloOnly?L('This practice campaign has no rival.','本场单人练习没有对手。'):L('Explore until you meet a rival civilization.','先探索地图，接触另一个文明。'),options:missions},
    {id:'policy',title:L('Change policy','调整政策'),description:L('Your first vote is free. Later changes cost 3 influence, once per round.','第一次颁布政策免费，此后更换需 3 点影响力，每轮限一次。'),button:L('Enact policy','颁布政策'),cost:p.policyRound == null ? 0 : 3,options:policies},
    {id:'contest',title:L('Contest a border district','争夺边境地块'),description:L('Take an unguarded rival district beside your land using one district order.','花费一次地区指令，夺取紧邻己方领土且无人守卫的对方地块。'),button:L('Contest district','争夺地块'),cost:5,gold:4,
      empty:soloOnly?L('This practice campaign has no rival territory.','本场单人练习没有敌方领土。'):L('No eligible rival district is visible along your border.','当前边境视野内没有可以争夺的敌方地块。'),options:contests}
  ];
}

const sources = {
  settlement:['Settled civilization','文明定居'],territory:['Territory size','领土规模'],development:['Settled land','已定居土地'],
  monuments:['Monuments','纪念碑'],civics:['Civics research','市政学研究'],festivals:['Festivals','节庆'],charters:['City charters','城市特许状'],
  atlases:['Published atlases','已出版的地图集'],exposition:['Exposition campuses','博览会大学园区'],portDues:['Port concessions','港口特许经营']
};

export function influencePanelModel(view,lang,selections={}) {
  const {state,seat} = view, p = state.players[seat], L = local(lang);
  const income = getInfluenceIncomeSources(state,seat);
  const wait = state.phase !== 'playing' ? L('The campaign has ended.','战役已结束。') :
    view.busy ? L('Updating orders…','正在同步指令…') :
    view.room?.phase === 'lobby' || roomSeatTurn(state,seat) !== 'active' ? L('Wait for your turn.','请等待你的回合。') : '';
  const cards = influenceOrders(view,lang);
  for (const card of cards) {
    card.options.sort(availableFirst);
    card.selected = card.options.find(o => o.key === selections[card.id]) || card.options[0];
    card.reason = wait || card.selected?.reason || (!card.selected && card.empty) || '';
  }
  return {balance:p.influence,rate:Object.values(income).reduce((sum,n)=>sum+n,0),income,cards};
}

function cardHtml(card,lang,balance) {
  const L = local(lang), selected = card.selected;
  const cost = selected?.cost ?? card.cost, gold = selected?.gold ?? card.gold;
  const price = cost ? L(cost+' influence',cost+' 影响力') : L('Free','免费');
  const amount = price+(gold ? L(' + '+gold+' gold',' + '+gold+' 金币') : '');
  const target = !selected ? '' : card.options.length > 1 ?
    '<select data-pick="'+card.id+'" aria-label="'+escape(card.title)+'">'+card.options.map(o=>'<option value="'+escape(o.key)+'"'+(o.key===selected.key?' selected':'')+'>'+escape(o.target)+'</option>').join('')+'</select>' :
    '<strong class="influence-target">'+escape(selected.target)+'</strong>';
  const remaining = selected && !card.reason && cost>0 ? '<small class="influence-remaining">'+L((balance-cost)+' influence left after spending','使用后剩余 '+(balance-cost)+' 点影响力')+'</small>' : '';
  const preview = selected?.tile ? '<button type="button" class="influence-map" data-map="'+card.id+'">'+L('Show on map','地图定位')+'</button>' : '';
  return '<section class="influence-card"><div class="influence-row"><h3>'+card.title+'</h3><span class="influence-price">'+amount+'</span></div><p>'+card.description+'</p>'+
    (target?'<div class="influence-row influence-selection">'+target+preview+'</div>':'')+
    (selected?.detail?'<p class="influence-detail">'+escape(selected.detail)+'</p>':'')+
    (card.reason?'<p class="influence-reason">'+escape(card.reason)+'</p>':'')+
    (selected?'<button type="button" class="influence-issue" data-issue="'+card.id+'"'+(card.reason?' disabled':'')+'>'+card.button+' · '+amount+'</button>':'')+remaining+'</section>';
}

export function influencePanelHtml(model,lang,receipt='',incomeOpen=false) {
  const L = local(lang);
  const rows = Object.entries(model.income).filter(([,n])=>n!==0).map(([id,n])=>'<div><dt>'+L(...sources[id])+'</dt><dd>'+signed(n)+'</dd></div>').join('');
  const income = rows ? '<dl>'+rows+'</dl>' : '<p>'+L('Found a city to begin earning influence.','建立首都后开始获得影响力。')+'</p>';
  return '<header class="influence-head"><div><h2 id="influence-heading">'+L('Spend influence','使用影响力')+'</h2><div class="influence-balance"><span>'+L('Available','可用')+' <b>'+model.balance+'</b></span><span>'+L('Per turn','每回合')+' <b>'+signed(model.rate)+'</b></span></div></div>'+
    '<button type="button" data-influence-close aria-label="'+L('Close','关闭')+'">×</button></header>'+
    '<div class="influence-scroll"><details class="influence-income"'+(incomeOpen?' open':'')+'><summary>'+L('Where your influence comes from','查看影响力收入来源')+'</summary>'+income+'</details>'+
    '<p class="influence-receipt" role="status"'+(receipt?'':' hidden')+'>'+escape(receipt)+'</p>'+
    '<div class="influence-cards">'+model.cards.map(card=>cardHtml(card,lang,model.balance)).join('')+'</div></div>';
}

function applied(state,seat,action) {
  if (action.type === 'delegation') return state.intel?.diplomacy?.some(row=>row.seat===action.target && row.delegation);
  if (action.type === 'policy') return state.players[seat].policy === action.item;
  return state.board[action.tile]?.owner === seat;
}

export function mountInfluencePanel({getView,issue,showTile,closeLedger}) {
  const dialog=document.createElement('dialog');
  dialog.id='influence-panel';
  dialog.setAttribute('aria-labelledby','influence-heading');
  dialog.setAttribute('translate','no');
  document.body.append(dialog);
  const opener=document.getElementById('influence-open');
  let picks={}, model, markup='', receipt='', pending=null, session='', triggerButton=null, focusedMap=false;
  function paint() {
    const view=getView(), lang=getLanguage(), L=local(lang);
    const title=L('Spend influence','使用影响力');
    opener.title=title;
    opener.setAttribute('aria-label',title);
    if (!dialog.open || !view) return;
    if (session!==JSON.stringify([view.mode,view.session,view.seat])) {dialog.close();return;}
    if (pending && applied(view.state,view.seat,pending.option.action)) {
      const {card,option,before}=pending;
      const target=option.result || option.target;
      const newTotal=view.state.players[view.seat].influence;
      receipt=L(card.button+' · '+target+'. Influence '+before+' → '+newTotal+'.',card.button+' · '+target+'。影响力 '+before+' → '+newTotal+'。');
      pending=null;
    } else if(pending?.settled && !view.busy){
      pending=null;
      receipt=L('Order not confirmed. Review the current choices.','指令未确认，请查看当前可用选项。');
    }
    model=influencePanelModel(view,lang,picks);
    const body=dialog.querySelector('.influence-scroll');
    const incomeOpen=Boolean(dialog.querySelector('details')?.open);
    const next=influencePanelHtml(model,lang,receipt,incomeOpen);
    if (next===markup) return;
    const scroll=body?.scrollTop || 0;
    const focus=document.activeElement;
    const attrs=['data-issue','data-map','data-pick','data-influence-close'];
    const attr=attrs.find(key=>dialog.contains(focus) && focus.hasAttribute(key));
    const selector=attr?'['+attr+'="'+focus.getAttribute(attr)+'"]':null;
    const onSummary=dialog.contains(focus) && focus.tagName==='SUMMARY';
    markup=next;
    dialog.innerHTML=markup;
    dialog.querySelector('.influence-scroll').scrollTop=scroll;
    const nextFocus=onSummary?dialog.querySelector('summary'):selector?dialog.querySelector(selector):null;
    if(nextFocus && !nextFocus.disabled) nextFocus.focus({preventScroll:true});
    else if(attr) dialog.querySelector('[data-influence-close]').focus({preventScroll:true});
  }
  document.addEventListener('click',event=>{
    const trigger=event.target.closest('[data-influence-open]');
    if(!trigger) return;
    const view=getView();
    if(!view || document.body.classList.contains('on-title')) return;
    closeLedger();
    triggerButton=trigger;
    focusedMap=false;
    session=JSON.stringify([view.mode,view.session,view.seat]);
    picks=trigger.dataset.influenceCity ? {border:trigger.dataset.influenceCity} : {};
    pending=null;receipt='';markup='';
    dialog.innerHTML='';
    dialog.showModal();
    paint();
    dialog.querySelector('[data-influence-close]').focus({preventScroll:true});
  });
  dialog.addEventListener('change',event=>{
    const select=event.target.closest('[data-pick]');
    if(select){picks[select.dataset.pick]=select.value;paint();}
  });
  dialog.addEventListener('click',async event=>{
    const button=event.target.closest('button');
    if(button?.hasAttribute('data-influence-close')) {dialog.close();return;}
    if(!button || button.disabled || pending) return;
    const group=button.dataset.issue || button.dataset.map;
    const shown=model?.cards.find(row=>row.id===group)?.selected;
    if(!shown) return;
    const view=getView(), lang=getLanguage();
    const card=influencePanelModel(view,lang,picks).cards.find(row=>row.id===group);
    const option=card?.selected;
    if(!option || JSON.stringify(option.action)!==JSON.stringify(shown.action) || option.cost!==shown.cost) {paint();return;}
    if(button.dataset.map && option.tile) {focusedMap=true;dialog.close();showTile(option.tile);return;}
    if(!button.dataset.issue || card.reason) return;
    const request={card,option,before:view.state.players[view.seat].influence};
    pending=request;
    receipt='';
    try {await issue(option.action);}
    finally {
      request.settled=true;
      paint();
    }
  });
  dialog.addEventListener('close',()=>{
    pending=null;
    receipt='';
    if(!focusedMap && !document.body.classList.contains('on-title')){
      const origin=triggerButton?.isConnected && triggerButton.getClientRects().length ? triggerButton : opener;
      origin.focus({preventScroll:true});
    }
  });
  document.addEventListener('civitas-language',paint);
  document.addEventListener('civitas-screen',()=>{if(dialog.open && document.body.classList.contains('on-title')) dialog.close();});
  return {paint};
}
