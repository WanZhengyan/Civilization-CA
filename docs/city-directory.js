import {getCityYield, getMap, getPopulationReport, BUILDINGS, UNIT_TYPES} from './rules.js';
import {SCIENCE_PROJECT} from './victory-rules.js';
import {getLanguage, translate} from './i18n.js';

const L=(en,zh)=>getLanguage()==='zh-CN'?zh:en;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const signed=value=>(value>0?'+':'')+value;
const nameOf=id=>translate((BUILDINGS[id]||UNIT_TYPES[id]|| (id===SCIENCE_PROJECT.id && SCIENCE_PROJECT))?.name || id);
export function cityReports(state,seat) {
  if(!state || (state.intel && state.intel.seat!==seat))return [];
  const map=getMap(state);
  return state.cities.filter(c=>c.seat===seat).map(city=>{
    const food=getPopulationReport(state,city.id), production=getCityYield(state,city.id).production;
    const idle=!city.queue, deficit=food.surplus<0, full=food.housingLimited;
    const turns=idle?null:Math.ceil(Math.max(0,city.queue.required-city.queue.progress)/Math.max(1,production));
    return {id:city.id,name:city.name,custom:city.name!==map.byId[city.tile]?.name,capital:city.originalSeat!=null,
      food,production,queue:city.queue,turns,idle,deficit,full,blocked:!idle && turns===0 && Boolean(UNIT_TYPES[city.queue.item])};
  });
}

export function compareCities(rows,filter,sort) {
  const selected=rows.filter(row=>filter==='all' || row[filter]===true);
  const needs=row=>Number(row.deficit)*8+Number(row.blocked)*4+Number(row.idle)*2+Number(row.full);
  return selected.sort((a,b)=>{
    const difference=sort==='production'?b.production-a.production:sort==='slow'?a.production-b.production:
      sort==='food'?a.food.surplus-b.food.surplus:needs(b)-needs(a);
    return difference || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
  });
}

export function directoryButton() {
  return '<button type="button" class="cities-compare" data-cities-compare translate="no">'+L('Compare cities','比较城市')+'</button>';
}

function rowMarkup(row) {
  const name=esc(row.custom?row.name:translate(row.name)), time=n=>L(n+(n===1?' turn':' turns'),n+' 回合');
  const tags=[row.deficit && L('Food deficit','粮食短缺'),row.full && L('Housing full','住房已满'),
    row.blocked && L('Deployment blocked','部署受阻'),row.idle && L('Idle production','生产空闲')].filter(Boolean);
  const queue=row.idle?L('No project','尚无项目'):esc(nameOf(row.queue.item))+' · '+row.queue.progress+'/'+row.queue.required+
    (row.blocked?'':' · '+time(row.turns));
  const stat=(label,value)=>'<div><dt>'+label+'</dt><dd>'+value+'</dd></div>';
  const food=row.food;
  const outlook=food.starvationTurns? L('Population loss in ','预计人口减少：')+time(food.starvationTurns):
    food.growthTurns ? L('Next citizen in ','下一位市民：')+time(food.growthTurns) : '';
  return '<article class="city-report"><header><h3>'+name+'</h3>'+
    (row.capital?'<span>'+L('Original capital','原始首都')+'</span>':'')+'</header>'+
    (tags.length?'<p class="report-flags">'+tags.map(tag=>'<span>'+tag+'</span>').join('')+'</p>':'')+
    '<dl>'+stat(L('Production / turn','每回合生产力'),row.production)+stat(L('Food balance / turn','每回合粮食结余'),signed(food.surplus))+
    stat(L('Population / housing','人口／住房'),food.population+' / '+food.housing)+stat(L('Food reserve','粮食储备'),food.food+' / '+food.threshold)+'</dl>'+
    (outlook?'<p>'+outlook+'</p>':'')+'<p class="report-queue">'+queue+'</p><footer>'+
    '<button type="button" data-report-city="'+esc(row.id)+'" data-report-command="production">'+L('Review production','查看生产')+'</button>'+
    '<button type="button" data-report-city="'+esc(row.id)+'" data-report-command="citizens">'+L('Manage citizens','管理市民')+'</button></footer></article>';
}

export function mountCityDirectory(getView,inspect) {
  const dialog=document.createElement('dialog');
  dialog.className='order-dialog city-directory';
  dialog.setAttribute('aria-labelledby','city-directory-title');
  dialog.setAttribute('translate','no');
  document.body.append(dialog);
  let filter='all',sort='needs',previous='';
  function paint(){
    if(!dialog.open)return;
    const {state,seat}=getView();
    const all=cityReports(state,seat), rows=compareCities(all,filter,sort);
    const option=(id,label,selected)=>'<option value="'+id+'"'+(selected===id?' selected':'')+'>'+label+'</option>';
    const filters=[['all',L('All cities','所有城市')],['idle',L('Idle production','生产空闲')],['full',L('Housing full','住房已满')],['deficit',L('Food deficit','粮食短缺')],['blocked',L('Deployment blocked','部署受阻')]];
    const sorts=[['needs',L('Needs attention','需要处理')],['slow',L('Lowest production','生产力最低')],['production',L('Highest production','生产力最高')],['food',L('Lowest food balance','粮食结余最低')]];
    const html='<div class="modal-shell"><header class="modal-head"><h2 id="city-directory-title" class="modal-title">'+L('City overview','城市总览')+'</h2>'+
      '<button type="button" class="modal-close" data-report-close aria-label="'+L('Close','关闭')+'">×</button></header>'+
      '<div class="modal-body"><div class="report-filters"><label>'+L('Show','显示')+'<select data-report-filter>'+
      filters.map(([id,label])=>option(id,label,filter)).join('')+'</select></label><label>'+L('Sort by','排序')+'<select data-report-sort>'+
      sorts.map(([id,label])=>option(id,label,sort)).join('')+'</select></label></div><p class="report-count" role="status">'+
      L(rows.length+' of '+all.length+' cities', '共 '+all.length+' 座城市，显示 '+rows.length+' 座')+'</p>'+
      (rows.length?'<div class="city-reports">'+rows.map(rowMarkup).join('')+'</div>':'<p>'+L('No cities match this filter.','没有符合条件的城市。')+'</p>')+'</div></div>';
    if(html!==previous){
      const focus=document.activeElement,oldScroll=dialog.querySelector('.modal-body')?.scrollTop || 0;
      const key=focus?.hasAttribute('data-report-filter')?'[data-report-filter]':focus?.hasAttribute('data-report-sort')?'[data-report-sort]':null;
      const focusedCity=focus?.dataset.reportCity,command=focus?.dataset.reportCommand;
      dialog.innerHTML=html;previous=html;
      const restore=key?dialog.querySelector(key):focusedCity?[...dialog.querySelectorAll('[data-report-city]')].find(b=>b.dataset.reportCity===focusedCity && b.dataset.reportCommand===command):null;
      restore?.focus({preventScroll:true});dialog.querySelector('.modal-body').scrollTop=oldScroll;
    }
  }
  dialog.onchange=e=>{
    if(e.target.hasAttribute('data-report-filter'))filter=e.target.value;
    if(e.target.hasAttribute('data-report-sort'))sort=e.target.value;
    paint();
  };
  dialog.onclick=e=>{
    if(e.target===dialog || e.target.closest('[data-report-close]')){dialog.close();return;}
    const b=e.target.closest('[data-report-city]');
    if(!b)return;
    const {state,seat}=getView();
    const city=state.cities.find(c=>c.id===b.dataset.reportCity && c.seat===seat);
    if(city){dialog.close();inspect(city,b.dataset.reportCommand);}
  };
  document.addEventListener('civitas-language',paint);
  return {paint,open(){filter='all';sort='needs';if(!dialog.open)dialog.showModal();paint();dialog.querySelector('[data-report-close]').focus();}};
}
