import {RESOURCES} from './resources.js';
import {WONDERS} from './wonders.js';
import {getUnitOptions,getSettlementAssessment,IMPROVEMENTS,getMap,TERRAIN_NAMES} from './rules.js';
import {getLanguage,translate} from './i18n.js';

const L=(en,zh)=>getLanguage()==='zh-CN'?zh:en;
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tr=value=>translate(value,getLanguage());
const modes={
  places:['Charted places','已探明地点'],
  deposits:['Surveyed deposits','已勘测资源'],
  founding:['Settlement survey','建城选址'],
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
  return rows;
}

export function mountCampaignExplorer({button,getView,locate}){
  const dialog=document.createElement('dialog');
  dialog.id='campaign-explorer';dialog.className='order-dialog';dialog.setAttribute('aria-labelledby','explorer-title');
  document.body.append(dialog);
  let mode='places',rows=[],scope='',page=0,query='';
  const pageSize=24;
  function renderRows(){
    const input=query.trim().toLocaleLowerCase();
    const matches=rows.filter(row=>row.search.toLocaleLowerCase().includes(input));
    page=Math.min(page,Math.max(0,Math.ceil(matches.length/pageSize)-1));
    const start=page*pageSize, end=Math.min(start+pageSize,matches.length);
    dialog.querySelector('[data-count]').textContent=matches.length?(start+1)+'–'+end+' / '+matches.length:L('No known sites in this view.','当前没有符合条件的已知地块。');
    dialog.querySelector('[data-sites]').innerHTML=matches.slice(start,end).map(row=>
      '<li><button type="button" data-locate="'+escape(row.id)+'"><strong>'+escape(tr(row.name))+'</strong><span>'+escape(row.info)+'</span><small>'+escape(row.id)+'</small></button></li>').join('');
    dialog.querySelector('[data-prev]').disabled=page===0;
    dialog.querySelector('[data-next]').disabled=end>=matches.length;
  }
  function render(){
    const view=getView();
    if(!view?.state?.intel)return;
    rows=explorerRows(view,mode);
    dialog.innerHTML='<div class="modal-shell" translate="no"><header class="modal-head"><div><span class="modal-kicker">'+escape(tr(getMap(view.state).shortName))+'</span><h2 class="modal-title" id="explorer-title">'+L('Map explorer','地图探索器')+'</h2></div><button class="modal-close" data-close aria-label="'+L('Close','关闭')+'">×</button></header><div class="modal-body"><div class="explorer-filters"><label>'+L('Explore','浏览')+'<select data-mode>'+Object.entries(modes).map(([key,labels])=>'<option value="'+key+'"'+(key===mode?' selected':'')+'>'+L(...labels)+'</option>').join('')+'</select></label><label>'+L('Find a place or coordinate','搜索地名或坐标')+'<input type="search" data-query maxlength="100" value="'+escape(query)+'"></label></div><p data-count role="status"></p><ul data-sites></ul><footer><button data-prev>'+L('Previous','上一页')+'</button><button data-next>'+L('Next','下一页')+'</button></footer></div></div>';
    renderRows();
  }
  function open(){
    if(!getView()?.state?.intel || dialog.open)return;
    render();dialog.showModal();dialog.querySelector('[data-query]').focus();
  }
  dialog.oninput=e=>{if(e.target.hasAttribute('data-query')){query=e.target.value;page=0;renderRows();}};
  dialog.onchange=e=>{if(e.target.hasAttribute('data-mode')){mode=e.target.value;page=0;query='';render();dialog.querySelector('[data-mode]').focus();}};
  dialog.onclick=e=>{
    const target=e.target.closest('button');if(!target)return;
    if(target.hasAttribute('data-close'))dialog.close();
    if(target.dataset.locate){dialog.close();locate(target.dataset.locate);}
    if(target.hasAttribute('data-next')||target.hasAttribute('data-prev')){page+=target.hasAttribute('data-next')?1:-1;renderRows();}
  };
  button.onclick=open;
  document.addEventListener('keydown',e=>{
    if(e.key!=='/' || e.altKey || e.ctrlKey || e.metaKey || e.target.closest?.('input,select,textarea,[contenteditable="true"]') ||
      document.querySelector('dialog[open]') || document.body.classList.contains('on-title'))return;
    e.preventDefault();open();
  });
  return (key)=>{
    if(key!==scope){if(dialog.open)dialog.close();scope=key;mode='places';query='';page=0;}
    if(dialog.open){rows=explorerRows(getView(),mode);renderRows();}
  };
}
