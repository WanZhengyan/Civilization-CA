import {getLanguage} from './i18n.js';
import {advisorReport} from './advisors.js';
import {roomSeatTurn} from './room-turn.js';

const departments=[
  {id:'cities',names:['Cities','城市'],desks:['food','housing','industry','settle']},
  {id:'economy',names:['Economy','经济'],desks:['supplies','treasury','borders','coast']},
  {id:'knowledge',names:['Councils','议会'],desks:['science','civic','launch']},
  {id:'field',names:['Field orders','野外行动'],desks:['improve','explore','recovery']}
];
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const identity=card=>[card.desk,card.link.kind,card.link.city,card.link.unit,card.link.tile,card.link.item,card.link.resource].join('|');

export function advisorAgenda(cards,selected='brief'){
  const groups=departments.map(group=>({...group,count:cards.filter(c=>group.desks.includes(c.desk)).length})).filter(g=>g.count);
  const department=groups.find(g=>g.id===selected);
  const topic=department?.id || (selected==='all'?'all':'brief');
  return {groups,topic,visible:department?cards.filter(c=>department.desks.includes(c.desk)):topic==='all'?cards:cards.slice(0,3)};
}

export function mountAdvisors(getView,review){
  const dialog=document.createElement('dialog');
  dialog.className='order-dialog advisor-council';
  dialog.setAttribute('aria-labelledby','advisor-heading');
  dialog.setAttribute('translate','no');
  document.body.append(dialog);
  let cards=[],last='',source,locale,seat,topic='brief';
  function paint(){
    if(!dialog.open)return;
    const view=getView();
    if(!view || view.state.phase!=='playing' || document.body.classList.contains('on-title')){dialog.close();return;}
    const lang=getLanguage(),L=(en,zh)=>lang==='zh-CN'?zh:en;
    if(source!==view.state || locale!==lang || seat!==view.seat){
      cards=advisorReport(view.state,view.seat,lang);
      source=view.state;locale=lang;seat=view.seat;
    }
    const agenda=advisorAgenda(cards,topic);
    topic=agenda.topic;
    const nav=(id,label)=>'<button type="button" data-topic="'+id+'" aria-pressed="'+(topic===id)+'">'+esc(label)+'</button>';
    const filters=cards.length?'<nav aria-label="'+L('Council topics','顾问议题')+'">'+nav('brief',L('Priorities','优先事项'))+
      agenda.groups.map(g=>nav(g.id,L(...g.names)+' ('+g.count+')')).join('')+nav('all',L('All','全部')+' ('+cards.length+')')+'</nav>':'';
    const waiting=roomSeatTurn(source,seat)!=='active' || view.busy;
    const committed=source.cities.filter(c=>c.seat===seat && c.queue).length;
    const quiet=L('No recommendation this turn. '+committed+' city projects are in progress.','本回合暂无顾问建议。进行中的城市项目有 '+committed+' 项。');
    const body=agenda.visible.map(card=>{
      const key=identity(card);
      return '<li><h3>'+esc(card.title)+'</h3><p>'+esc(card.detail)+'</p><button type="button" data-brief="'+esc(key)+'" aria-label="'+esc(L('Review ','查看方案 · ')+card.title)+'">'+L('Review','查看')+'</button></li>';
    }).join('');
    const html='<div class="modal-shell"><header class="modal-head"><div><p class="modal-kicker">'+L('Round ','第 ')+source.round+L('',' 轮')+'</p><h2 class="modal-title" id="advisor-heading">'+L('Advisors','顾问团')+'</h2></div>'+
      '<button type="button" class="modal-close" data-dismiss aria-label="'+L('Close','关闭')+'">×</button></header><div class="modal-body">'+filters+
      (waiting?'<p>'+L('Review your chart while waiting for orders to reopen.','等待指令开放期间可查看当前战局。')+'</p>':'')+
      (body?'<ol>'+body+'</ol>':'<p>'+quiet+'</p>')+'</div></div>';
    if(html===last)return;
    const focused=dialog.querySelector(':focus'),topicFocus=focused?.dataset.topic,briefFocus=focused?.dataset.brief;
    const scroll=dialog.querySelector('.modal-body')?.scrollTop||0;
    dialog.innerHTML=html;last=html;
    dialog.querySelector('.modal-body').scrollTop=scroll;
    if(focused){
      const replacement=Array.from(dialog.querySelectorAll('button')).find(b=>
        (topicFocus!==undefined && b.dataset.topic===topicFocus) || (briefFocus!==undefined && b.dataset.brief===briefFocus));
      (replacement || dialog.querySelector('[aria-pressed="true"]') || dialog.querySelector('[data-dismiss]')).focus({preventScroll:true});
    }
  }
  dialog.onclick=event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.hasAttribute('data-dismiss')){dialog.close();return;}
    if(button.dataset.topic){topic=button.dataset.topic;paint();return;}
    if(button.dataset.brief){
      paint();
      const card=cards.find(c=>identity(c)===button.dataset.brief);
      if(card){dialog.close();review(card.link);}
    }
  };
  document.addEventListener('civitas-language',paint);
  document.addEventListener('civitas-screen',paint);
  document.addEventListener('civitas-advisors',()=>{
    if(!dialog.open){topic='brief';dialog.showModal();paint();dialog.querySelector('[data-dismiss]')?.focus();}
  });
  return paint;
}
