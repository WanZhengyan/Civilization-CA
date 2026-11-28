import {displayMapOnMobile} from './map-workspace.js';
import {CIVILIZATIONS} from './civilizations.js';
import {ERAS,getEra,getMap} from './rules.js';
import {getLanguage,translate} from './i18n.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const local=(lang,en,zh)=>lang==='zh-CN'?zh:en;
const civName=(row,lang)=>lang==='zh-CN'?CIVILIZATIONS[row.faction].nameZh:CIVILIZATIONS[row.faction].name;
const relation=(row,lang)=>({
  self:local(lang,'Your civilization','你的文明'),ally:local(lang,'Ally','盟友'),rival:local(lang,'Rival','对手')
})[row.relation];

export function publicContacts(view) {
  const {state,seat}=view;
  const source=state.intel?.diplomacy;
  if(Array.isArray(source)) return source.filter(row=>CIVILIZATIONS[row.faction]).slice().sort((a,b)=>
    ['self','ally','rival'].indexOf(a.relation)-['self','ally','rival'].indexOf(b.relation) || a.seat-b.seat);
  // Older room servers expose the local seat; only new servers confirm contacts.
  const own=state.players?.[seat];
  return own && CIVILIZATIONS[own.faction] ? [{seat,relation:'self',faction:own.faction,name:own.name,eliminated:own.eliminated}] : [];
}

export function ribbonMarkup(rows,lang,active=null,unmet=false) {
  const portraits=rows.map(row=>{
    const name=civName(row,lang),label=name+' · '+relation(row,lang);
    return '<button type="button" class="delegate-seal" data-relation="'+row.relation+'" data-contact="'+row.seat+'" title="'+esc(label)+'" aria-label="'+esc(label)+'" aria-haspopup="dialog" aria-expanded="'+(row.seat===active)+'" aria-controls="civilization-dossier"><i class="delegate-portrait delegate-'+CIVILIZATIONS[row.faction].id+'" aria-hidden="true"></i></button>';
  }).join('');
  const hint=local(lang,'Unmet civilization · explore to establish contact','未知文明 · 探索地图以建立接触');
  return portraits+(unmet?'<span class="delegate-unmet" role="img" aria-label="'+hint+'" title="'+hint+'">?</span>':'');
}

function stat(label,value,detail='') {
  return '<div class="delegate-stat"><dt>'+esc(label)+'</dt><dd>'+esc(value)+(detail?'<small>'+esc(detail)+'</small>':'')+'</dd></div>';
}
function group(title,body) {
  return '<section class="delegate-section"><h3>'+esc(title)+'</h3>'+body+'</section>';
}

export function dossierMarkup(view,row,stats,lang) {
  const L=(en,zh)=>local(lang,en,zh);
  const civ=CIVILIZATIONS[row.faction],own=row.relation==='self';
  const label=civName(row,lang),player=view.state.players[view.seat];
  const leader=row.name && !['You',civ.name,label].includes(row.name)?'<p class="delegate-player">'+esc(row.name)+'</p>':'';
  const close=L('Close civilization dossier','关闭文明档案');
  let html='<header class="delegate-identity"><div class="delegate-portrait delegate-hero delegate-'+civ.id+'" aria-hidden="true"></div><div><p class="delegate-relation">'+esc(relation(row,lang))+'</p><h2 id="delegate-name">'+esc(label)+'</h2>'+leader+'</div>'+
    '<button type="button" class="delegate-close" data-dossier-close aria-label="'+close+'" title="'+close+'">×</button></header>';
  if(own && stats){
    const income=n=>L('+'+n+' / turn','每回合 +'+n);
    const era=translate(getEra(view.state,view.seat).name,lang);
    html+=group(L('Civilization record','文明概况'),'<dl class="delegate-stats">'+
      stat(L('Era','时代'),era)+stat(L('Cities','城市'),stats.cities)+stat(L('Population','人口'),stats.population)+
      stat(L('Gold','金币'),player.capital,income(stats.capitalIncome))+stat(L('Influence','影响力'),player.influence,income(stats.influenceIncome))+
      stat(L('Units','单位'),stats.units)+'</dl>');
    html+=group(L('Spending influence','影响力用途'),
      '<p>'+L('Use 6 influence to add a city’s next eligible parcel to your territory now, or send a delegation to a contacted rival. Open Influence to see the cities, rivals and policies you can choose.',
        '花 6 点影响力，可以立即取得一座城市的下一格可扩张地块，也可以向已接触的对手派遣使团。点「使用影响力」查看当前可选的城市、对手和政策。')+'</p>'+
      '<button type="button" class="delegate-send" data-influence-open>'+L('Spend influence','使用影响力')+'</button>');
  }
  if(row.eliminated) html+=group(L('Campaign status','战局状态'),'<p>'+L('This civilization has been eliminated.','这个文明已被淘汰。')+'</p>');
  if(!own){
    const known=row.knownCities || [];
    const during=Number.isInteger(row.firstMetRound)?'<span class="delegate-contact-date">'+L('First contact · round '+row.firstMetRound,'初次接触 · 第 '+row.firstMetRound+' 轮')+'</span>':'';
    html+=group(L('Field intelligence','实地情报'),during+'<dl class="delegate-stats">'+
      stat(L('Known cities','已知城市'),known.length)+stat(L('Units in sight','视野内单位'),row.visibleUnits??0)+stat(L('Districts in sight','视野内地区'),row.visibleDistricts??0)+'</dl>');
    if(known.length){
      const map=getMap(view.state);
      html+=group(L('City sightings','城市目击记录'),'<ul class="delegate-sightings">'+known.map(city=>{
        const name=map.byId[city.tile]?.name===city.name?translate(city.name,lang):city.name;
        const seen=city.visible?L('In sight','当前可见'):
          L('Last seen · round '+city.lastSeenRound,'上次可见 · 第 '+city.lastSeenRound+' 轮');
        return '<li><span>'+esc(name)+'</span><small>'+esc(seen)+'</small></li>';
      }).join('')+'</ul>');
    }
  } else if(publicContacts(view).length<view.state.players.length){
    html+=group(L('First contact','初次接触'),'<p>'+L('Explore until your side sights another civilization’s unit, city or land. Its representative will appear here.','当己方首次发现其他文明的单位、城市或领土时，其使节便会出现在此处。')+'</p>');
  }
  if(row.relation==='rival' && (row.delegation || row.delegationOrder)){
    const report=row.delegation,opt=row.delegationOrder;
    let detail;
    if(report){
      detail='<p tabindex="-1" data-report-status class="delegate-contact-date">'+
        L('Mission active through round '+report.throughRound+'.','使团驻留至第 '+report.throughRound+' 轮结束。')+'</p><dl class="delegate-stats">'+
        stat(L('Reported era','报告时代'),translate(ERAS[report.era]?.name || report.era,lang))+stat(L('Total cities','城市总数'),report.cityCount)+'</dl>';
    }else{
      const disabled=view.busy||!opt.enabled;
      const reason=view.busy?L('Updating orders…','正在同步指令…'):translate(opt.reason || '',lang);
      detail='<p>'+L('For three rounds, the delegation reports this civilization’s era and total number of cities.','使团在三轮内报告该文明所处的时代和城市总数。')+'</p>'+
        '<button class="delegate-send" type="button" data-send-delegation'+(disabled?' disabled':'')+'><span>'+L('Send delegation','派遣使团')+'</span><b>'+
        esc(opt.cost)+' '+L('Influence','影响力')+'</b></button>'+(reason?'<small class="delegate-reason">'+esc(reason)+'</small>':'');
    }
    html+=group(L('Diplomatic mission','外交使团'),detail);
  }
  if(view.state.civilizationTraits===1) html+=group(L('Civilization trait','文明特性'),'<strong class="delegate-trait">'+esc(lang==='zh-CN'?civ.traitNameZh:civ.traitName)+'</strong><p>'+esc(lang==='zh-CN'?civ.descriptionZh:civ.description)+'</p>');
  return html;
}

let tray,strip,sheet,lastView,lastStats,active=null,ribbonKey='',sheetKey='';
function closeDossier(focus=false) {
  if(active===null) return;
  const former=active;
  active=null;
  paintDiplomacy(lastView,lastStats);
  if(focus) strip.querySelector('[data-contact="'+former+'"]')?.focus({preventScroll:true});
}
export function mountDiplomacy(issueOrder) {
  tray=document.getElementById('diplomatic-ribbon');strip=tray.querySelector('.delegate-strip');
  sheet=document.getElementById('civilization-dossier');
  strip.onclick=event=>{
    const button=event.target.closest('[data-contact]');
    if(!button || !lastView) return;
    if(active===Number(button.dataset.contact)){closeDossier(true);return;}
    displayMapOnMobile();
    active=Number(button.dataset.contact);paintDiplomacy(lastView,lastStats);
    sheet.scrollTop=0;sheet.querySelector('[data-dossier-close]')?.focus({preventScroll:true});
  };
  sheet.onclick=event=>{
    if(event.target.closest('[data-dossier-close]')) {closeDossier(true);return;}
    const send=event.target.closest('[data-send-delegation]');
    if(!send || send.disabled || lastView?.busy) return;
    const record=publicContacts(lastView).find(c=>c.seat===active && c.relation==='rival');
    if(record?.delegationOrder?.enabled && !record.delegation) issueOrder({type:'delegation',target:record.seat});
  };
  strip.addEventListener('keydown',event=>{
    const keys=['ArrowRight','ArrowLeft','Home','End'];
    if(!keys.includes(event.key)) return;
    const buttons=[...strip.querySelectorAll('[data-contact]')],index=buttons.indexOf(event.target);
    if(index<0)return;
    event.preventDefault();
    const next=event.key==='End'?buttons.length-1:event.key==='Home'?0:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
    buttons[next].focus();
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape' && active!==null && !document.querySelector('dialog[open]')){
      event.preventDefault();event.stopImmediatePropagation();closeDossier(true);
    }
  },true);
  document.addEventListener('pointerdown',e=>{
    if(active!==null && !tray.contains(e.target) && !sheet.contains(e.target)) closeDossier();
  });
  document.addEventListener('focusin',e=>{
    if(active!==null && !tray.contains(e.target) && !sheet.contains(e.target)) closeDossier();
  });
  document.addEventListener('civitas-screen',()=>{
    if(document.body.classList.contains('on-title')) closeDossier();
  });
  document.addEventListener('civitas-language',()=>{if(lastView)paintDiplomacy(lastView,lastStats);});
}

export function paintDiplomacy(view,stats) {
  if(!tray || !view?.state) return;
  if(lastView && (lastView.session!==view.session || lastView.mode!==view.mode || lastView.seat!==view.seat)) active=null;
  lastView=view;lastStats=stats;
  const rows=publicContacts(view),lang=getLanguage();
  tray.hidden=!rows.length;
  tray.setAttribute('aria-label',local(lang,'Civilizations','文明'));
  tray.querySelector('.delegate-label').textContent=local(lang,'Diplomacy','外交');
  const current=rows.find(c=>c.seat===active);
  if(!current) active=null;
  const html=ribbonMarkup(rows,lang,active,rows.length<view.state.players.length);
  if(html!==ribbonKey){strip.innerHTML=html;ribbonKey=html;}
  sheet.hidden=!current;
  if(current) {
    sheet.setAttribute('aria-labelledby','delegate-name');
    const content=dossierMarkup(view,current,stats,lang);
    if(content!==sheetKey){
      const focusClose=sheet.querySelector('[data-dossier-close]')===document.activeElement;
      const focusSend=sheet.querySelector('[data-send-delegation]')===document.activeElement;
      sheet.innerHTML=content;sheetKey=content;
      if(focusSend) (sheet.querySelector('[data-report-status], [data-send-delegation]:enabled') || sheet.querySelector('[data-dossier-close]'))?.focus({preventScroll:true});
      if(focusClose)sheet.querySelector('[data-dossier-close]')?.focus({preventScroll:true});
    }
  }
}
