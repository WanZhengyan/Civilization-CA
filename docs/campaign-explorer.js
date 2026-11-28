import {createFieldItinerary,itineraryLegs} from './field-itinerary.js';
import {RESOURCES} from './resources.js';
import {WONDERS} from './wonders.js';
import {getUnitOptions,getSettlementAssessment,IMPROVEMENTS,getActions,getRouteDetail,getProductionOptions,getProjectSites,getWonderSites,getMap,TERRAIN_NAMES} from './rules.js';
import {getLanguage,translate} from './i18n.js';

const L=(en,zh)=>getLanguage()==='zh-CN'?zh:en;
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tr=value=>translate(value,getLanguage());
const modes={
  places:['Charted places','已探明地点'],
  itinerary:['Field itinerary','考察行程'],
  deposits:['Surveyed deposits','已勘测资源'],
  founding:['Settlement survey','建城选址'],
  borders:['Border proposals','边界提案'],
  crews:['Worker assignments','建设者工作地点'],
  ports:['Harbor siting','港口选址'],
  campuses:['University charters','大学奇观选址'],
};

function describe(row,info){return {...row,info,search:row.search+' '+info};}

export function explorerRows(view,mode='places'){
  if(!view?.state?.intel || view.seat!==view.state.intel.seat)return [];
  const {state,seat}=view,map=getMap(state),visible=new Set(state.intel.visible);
  const rows=state.intel.explored.filter(id=>map.byId[id]).map(id=>{
    const tile=map.byId[id];
    const observed=visible.has(id), city=observed?state.cities.find(c=>c.tile===id):null;
    const title=city?.name || tile.name;
    return {id,name:title,terrain:tile.terrain,visible:observed,
      search:[id,title,tr(title),tile.name,tr(tile.name),TERRAIN_NAMES[tile.terrain],tr(TERRAIN_NAMES[tile.terrain])].join(' '),
      info:tr(TERRAIN_NAMES[tile.terrain])+' · '+(observed?L('In sight','当前可见'):L('Last charted','已探明，当前不可见'))};
  });
  if(mode==='deposits')return rows.flatMap(row=>{
    const cell=state.board[row.id], deposit=RESOURCES[cell?.resource];
    if(!deposit)return [];
    const improvement=tr(IMPROVEMENTS[deposit.improvement].name);
    const condition=!row.visible?L('Last survey','上次勘测'):cell.pillaged?L('Damaged','已受损'):
      cell.improvement===deposit.improvement?L('Improved','已改良'):L('Needs','需要');
    return [describe(row,tr(deposit.name)+' · '+condition+(row.visible?' · '+improvement:''))];
  });
  if(mode==='founding'){
    const candidates=new Map();
    for(const unit of state.units.filter(u=>u.seat===seat && u.type==='settler')){
      for(const id of [unit.tile,...getUnitOptions(state,unit.id).moves]){
        const report=getSettlementAssessment(state,unit.id,id);
        if(!report.canFoundThisTurn && !report.canFoundNextTurn)continue;
        const old=candidates.get(id);
        if(!old || report.movesAfter>old.movesAfter)candidates.set(id,report);
      }
    }
    return rows.filter(row=>candidates.has(row.id)).map(row=>{
      const r=candidates.get(row.id);
      return describe(row,(r.canFoundThisTurn?L('Found this turn','本回合可建城'):L('Found next turn','下回合可建城'))+
        ' · '+L('Movement cost ','移动消耗 ')+r.moveCost+' · '+L('Remaining ','剩余移动力 ')+r.movesAfter);
    }).sort((a,b)=>Number(candidates.get(b.id).canFoundThisTurn)-Number(candidates.get(a.id).canFoundThisTurn)||
      candidates.get(a.id).moveCost-candidates.get(b.id).moveCost);
  }
  if(mode==='borders')return rows.flatMap(row=>{
    if(!row.visible || !map.neighbors(row.id).some(id=>state.board[id].owner===seat))return [];
    return getActions(state,seat,row.id).map(action=>describe(row,tr(action.label)+' · '+action.cost.capital+
      L(' gold',' 金币')+' · '+action.cost.influence+L(' influence',' 影响力')+' · '+
      (action.enabled?L('Ready to order','可下达指令'):tr(action.reason))));
  });
  if(mode==='crews'){
    const assignments=new Map();
    for(const unit of state.units.filter(u=>u.seat===seat && u.charges>0)){
      for(const [id,item] of Object.entries(state.intel.workSites?.[unit.id]||{})){
        if(!IMPROVEMENTS[item])continue;
        const trip=id===unit.tile?0:getRouteDetail(state,unit.id,id)?.cost;
        if(trip==null)continue;
        const notes=assignments.get(id)||[];
        notes.push(tr(IMPROVEMENTS[item].name)+' · '+tr(map.byId[unit.tile].name)+' · '+L('Movement ','移动 ')+trip+
          ' · '+unit.charges+L(' charges',' 次建造次数'));
        assignments.set(id,notes);
      }
    }
    return rows.filter(row=>assignments.has(row.id)).map(row=>describe(row,assignments.get(row.id).join(' / ')));
  }
  if(mode==='ports'){
    const sites=new Map();
    for(const city of state.cities.filter(c=>c.seat===seat)){
      const harbor=getProductionOptions(state,city.id,{replace:true}).find(o=>o.item==='harbor' && o.enabled);
      if(!harbor)continue;
      for(const site of getProjectSites(state,city.id,'harbor')){
        const offers=sites.get(site.id)||[];
        offers.push(tr(city.name)+' · '+harbor.required+L(' production',' 生产力')+' · '+harbor.turns+L(' turns',' 回合'));
        sites.set(site.id,offers);
      }
    }
    return rows.filter(row=>sites.has(row.id)).map(row=>describe(row,sites.get(row.id).join(' / ')));
  }
  if(mode==='campuses'){
    const offers=new Map();
    for(const city of state.cities.filter(c=>c.seat===seat)){
      for(const project of getProductionOptions(state,city.id,{replace:true})){
        const wonder=WONDERS[project.item];
        if(!wonder || !project.enabled)continue;
        for(const site of getWonderSites(state,city.id,project.item)){
          const items=offers.get(site.id)||[];
          const detail=tr(project.label)+' · '+tr(city.name)+' · '+wonder.grant+L(' gold',' 金币')+
            ' · '+project.turns+L(' turns',' 回合')+(site.favored?' · +1 '+tr(wonder.specialty):'');
          items.push(detail);offers.set(site.id,items);
        }
      }
    }
    return rows.filter(row=>offers.has(row.id)).map(row=>describe(row,offers.get(row.id).join(' / ')));
  }
  return rows;
}

export function mountCampaignExplorer({button,getView,getSelected=()=>null,locate,storage}){
  const dialog=document.createElement('dialog');
  dialog.id='campaign-explorer';dialog.className='order-dialog';dialog.setAttribute('aria-labelledby','explorer-title');
  document.body.append(dialog);
  let mode='places',rows=[],scope='',page=0,query='';
  const pageSize=24;
  if(storage===undefined){try{storage=window.localStorage;}catch{/* Current tab only. */}}
  const itinerary=createFieldItinerary(getView,storage);
  let previousMode='places';
  function collect(){
    if(mode!=='itinerary')return explorerRows(getView(),mode);
    return itineraryLegs(itinerary.stops(),explorerRows(getView(),'places')).map(row=>{
      const note=row.previous?L('Leg from '+row.previous+' · '+row.leg+' hexes','自 '+row.previous+' 出发 · 本段 '+row.leg+' 格'):L('Starting point','起点');
      return describe(row,L('Stop ','第 ')+row.number+(getLanguage()==='zh-CN'?' 站':'')+' · '+note+' · '+
        L('Total '+row.total+' hexes','累计 '+row.total+' 格'));
    });
  }
  function control(action,id,label,disabled=false){
    return '<button type="button" data-route-action="'+action+'" data-site="'+escape(id)+'"'+(disabled?' disabled':'')+'>'+escape(label)+'</button>';
  }
  function editControls(id,stops){
    const at=stops.indexOf(id);
    const move=mode==='itinerary'?control('up',id,L('Earlier','提前'),at<=0)+control('down',id,L('Later','延后'),at>=stops.length-1):'';
    const toggle=at<0?control('add',id,L('Add stop','加入行程')):control('remove',id,L('Remove stop','移出行程'));
    return '<div class="itinerary-edits">'+move+toggle+'</div>';
  }
  function switchMode(next){
    if(next!=='itinerary')previousMode=next;
    mode=next;page=0;query='';render();
  }
  function renderRows(){
    const input=query.trim().toLocaleLowerCase();
    const matches=rows.filter(row=>row.search.toLocaleLowerCase().includes(input));
    page=Math.min(page,Math.max(0,Math.ceil(matches.length/pageSize)-1));
    const start=page*pageSize, end=Math.min(start+pageSize,matches.length);
    dialog.querySelector('[data-count]').textContent=matches.length?(start+1)+'–'+end+' / '+matches.length:L('No known sites in this view.','当前没有符合条件的已知地块。');
    const summary=dialog.querySelector('[data-itinerary-summary]');
    const stops=itinerary.stops(),selected=getSelected(),view=getView();
    const known=view?.state?.intel?.seat===view.seat && view.state.intel.explored.includes(selected);
    if(summary)summary.innerHTML='<span>'+escape(mode==='itinerary'?
      (stops.length?L(stops.length+' stops · '+(rows.at(-1)?.total||0)+' hexes, measured directly between stops.',stops.length+' 站 · 累计 '+(rows.at(-1)?.total||0)+' 格，按站点间的直线六角距离计算。'):
        L('Add stops from the place search or your current map selection.','从地点搜索结果或地图上当前选中的地块添加站点。')):'')+'</span>'+
      (mode==='itinerary' && known?(stops.includes(selected)?control('remove',selected,L('Remove selected hex','移除当前地块')):control('add',selected,L('Add selected hex','添加当前地块'))):'');
    dialog.querySelector('[data-sites]').innerHTML=matches.slice(start,end).map(row=>
      '<li><button type="button" data-locate="'+escape(row.id)+'"><strong>'+escape(tr(row.name))+'</strong><span>'+escape(row.info)+'</span><small>'+escape(row.id)+'</small></button>'+editControls(row.id,stops)+'</li>').join('');
    dialog.querySelector('[data-prev]').disabled=page===0;
    dialog.querySelector('[data-next]').disabled=end>=matches.length;
  }
  function render(){
    const view=getView();
    if(!view?.state?.intel)return;
    rows=collect();
    dialog.innerHTML='<div class="modal-shell" translate="no"><header class="modal-head"><div><span class="modal-kicker">'+escape(tr(getMap(view.state).shortName))+'</span><h2 class="modal-title" id="explorer-title">'+L('Map explorer','地图探索器')+'</h2></div><button class="modal-close" data-close aria-label="'+L('Close','关闭')+'">×</button></header><div class="modal-body"><nav class="itinerary-tabs" aria-label="'+L('Map explorer views','地图探索视图')+'"><button type="button" data-browser aria-pressed="'+(mode!=='itinerary')+'">'+L('Browse sites','浏览地点')+'</button><button type="button" data-itinerary aria-pressed="'+(mode==='itinerary')+'">'+L('Field itinerary','考察行程')+'</button></nav><div class="explorer-filters"><label>'+L('Explore','浏览')+'<select data-mode>'+Object.entries(modes).map(([key,labels])=>'<option value="'+key+'"'+(key===mode?' selected':'')+'>'+L(...labels)+'</option>').join('')+'</select></label><label>'+L('Find a place or coordinate','搜索地名或坐标')+'<input type="search" data-query maxlength="100" value="'+escape(query)+'"></label></div><aside data-itinerary-summary '+(mode==='itinerary'?'':'hidden')+'></aside><p data-count role="status"></p><ul data-sites></ul><footer><button data-prev>'+L('Previous','上一页')+'</button><button data-next>'+L('Next','下一页')+'</button></footer></div></div>';
    renderRows();
  }
  function open(){
    if(!getView()?.state?.intel || dialog.open)return;
    render();dialog.showModal();dialog.querySelector('[data-query]').focus();
  }
  dialog.oninput=e=>{if(e.target.hasAttribute('data-query')){query=e.target.value;page=0;renderRows();}};
  dialog.onchange=e=>{if(e.target.hasAttribute('data-mode')){switchMode(e.target.value);dialog.querySelector('[data-mode]').focus();}};
  dialog.onclick=e=>{
    const target=e.target.closest('button');if(!target)return;
    if(target.hasAttribute('data-itinerary') || target.hasAttribute('data-browser')){
      switchMode(target.hasAttribute('data-itinerary')?'itinerary':previousMode);
      dialog.querySelector(mode==='itinerary'?'[data-itinerary]':'[data-browser]').focus();return;
    }
    if(target.dataset.routeAction){
      if(itinerary.edit(target.dataset.routeAction,target.dataset.site)){
        rows=collect();renderRows();
        const controls=[...dialog.querySelectorAll('button[data-site]')].filter(b=>!b.disabled);
        (controls.find(b=>b.dataset.site===target.dataset.site && b.dataset.routeAction===target.dataset.routeAction) ||
         controls.find(b=>b.dataset.site===target.dataset.site) || dialog.querySelector('[data-itinerary]')).focus();
      }return;
    }
    if(target.hasAttribute('data-close'))dialog.close();
    if(target.dataset.locate && getView()?.state.intel?.seat===getView().seat && getView().state.intel.explored.includes(target.dataset.locate)){dialog.close();locate(target.dataset.locate);}
    if(target.hasAttribute('data-next')||target.hasAttribute('data-prev')){page+=target.hasAttribute('data-next')?1:-1;renderRows();}
  };
  button.onclick=open;
  document.addEventListener('keydown',e=>{
    if(e.key!=='/' || e.altKey || e.ctrlKey || e.metaKey || e.target.closest?.('input,select,textarea,[contenteditable="true"]') ||
      document.querySelector('dialog[open]') || document.body.classList.contains('on-title'))return;
    e.preventDefault();open();
  });
  return (key)=>{
    itinerary.sync(key);
    if(key!==scope){if(dialog.open)dialog.close();scope=key;mode='places';previousMode='places';query='';page=0;}
    if(dialog.open){rows=collect();renderRows();}
  };
}
