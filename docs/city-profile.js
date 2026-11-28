import {worksPage} from './city-profile-works.js';
import {landPage} from './city-profile-land.js';
import {growthPage} from './city-profile-growth.js';
import {workforcePage} from './city-profile-people.js';
import {getCityYield,getMap,getPopulationReport} from './rules.js';
import {local,safe,label,cityLabel,section,table,action,signed} from './city-profile-format.js';

function overview(state,city){
  const yields=getCityYield(state,city.id),food=getPopulationReport(state,city.id);
  return section(local('City accounts','城市收支'),table([local('Account','项目'),local('Per harvest','每次收获')],[
    [local('Food grown','产粮'),yields.food],[local('Food consumed','居民消耗'),-food.consumption],
    [local('Food to reserves','入库粮食'),signed(food.surplus)],[local('Construction','生产力'),yields.production],
    [local('City gold','城市金币'),signed(yields.capital)],[local('City influence','城市影响力'),signed(yields.influence)]
  ]),local('Gold and influence show the city contribution. Territory also earns income for the civilization.',
    '金币与影响力列出本城的贡献。文明还可以从领土获得收入。'))+
    '<div class="city-study-actions">'+action('production',local('Review production','查看生产'))+
    action('citizens',local('Manage citizens','管理市民'))+'</div>';
}

const pages={overview:{name:()=>local('Overview','总览'),render:overview},
  people:{name:()=>local('Workforce','劳动力'),render:workforcePage},
  growth:{name:()=>local('Food and housing','粮食与住房'),render:growthPage},
  land:{name:()=>local('Hinterland','周边土地'),render:landPage},
  works:{name:()=>local('Construction','建设'),render:worksPage}};

export function cityProfilePage(state,seat,id,page='overview'){
  if(!state || state.intel && state.intel.seat!==seat)return '';
  const city=state.cities.find(entry=>entry.id===id && entry.seat===seat);
  if(!city || !Object.hasOwn(pages,page))return '';
  return pages[page].render(state,city);
}

export function mountCityProfile(getView,inspect){
  let dialog,selected,page='overview',last='';
  function paint(){
    if(!dialog?.open)return;
    const {state,seat}=getView();
    const body=cityProfilePage(state,seat,selected,page);
    if(!body){dialog.close();return;}
    const city=state.cities.find(c=>c.id===selected),map=getMap(state);
    const html='<div class="modal-shell"><header class="modal-head"><div><span class="modal-kicker">'+
      local('City view','城市档案')+'</span><h2 class="modal-title" id="city-profile-title">'+safe(cityLabel(city,map))+'</h2></div>'+
      '<button type="button" class="modal-close" data-study-close aria-label="'+local('Close','关闭')+'">×</button></header>'+
      '<div class="modal-body">'+(Object.keys(pages).length>1?'<label class="study-page">'+local('Explore city','查看城市资料')+
        '<select data-study-page>'+Object.entries(pages).map(([key,definition])=>'<option value="'+key+'"'+
        (key===page?' selected':'')+'>'+safe(definition.name())+'</option>').join('')+'</select></label>':'')+body+'</div></div>';
    if(html===last)return;
    const focus=document.activeElement,scroll=dialog.querySelector('.modal-body')?.scrollTop||0;
    const focused=dialog.contains(focus)?{...focus.dataset}:null;
    dialog.innerHTML=last=html;
    if(focused){
      const next=focused.studyCommand?[...dialog.querySelectorAll('[data-study-command]')].find(btn=>
        btn.dataset.studyCommand===focused.studyCommand && btn.dataset.studyValue===focused.studyValue):
        dialog.querySelector(Object.hasOwn(focused,'studyPage')?'[data-study-page]':'[data-study-close]');
      next?.focus({preventScroll:true});
    }
    dialog.querySelector('.modal-body').scrollTop=scroll;
  }
  function open(id){
    if(!dialog){
      dialog=document.createElement('dialog');dialog.className='order-dialog city-profile';
      dialog.setAttribute('translate','no');dialog.setAttribute('aria-labelledby','city-profile-title');
      document.body.append(dialog);
      dialog.onclick=e=>{
        if(e.target===dialog || e.target.closest('[data-study-close]')){dialog.close();return;}
        const button=e.target.closest('[data-study-command]');if(!button)return;
        const {state,seat}=getView(),city=state.cities.find(c=>c.id===selected && c.seat===seat);
        if(!city || state.intel && state.intel.seat!==seat)return;
        dialog.close();inspect(city,button.dataset.studyCommand,button.dataset.studyValue);
      };
      dialog.onchange=e=>{if(e.target.hasAttribute('data-study-page') && Object.hasOwn(pages,e.target.value)){
        page=e.target.value;paint();dialog.querySelector('.modal-body').scrollTop=0;
      }};
      document.addEventListener('civitas-language',paint);
    }
    selected=id;page='overview';last='';if(!dialog.open)dialog.showModal();paint();
    if(dialog.open)dialog.querySelector('[data-study-close]').focus();
  }
  return {open,paint};
}
