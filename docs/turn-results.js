import {BUILDINGS,UNIT_TYPES,getMap} from './rules.js';
import {councilTree} from './progression.js';
import {SCIENCE_PROJECT} from './victory-rules.js';
import {roomSeatTurn} from './room-turn.js';
import {getLanguage,translate} from './i18n.js';
import {pendingTurnTasks} from './turn-button.js';

// The harvest is recorded before the seat's end marker. Reopening this same turn
// reads that marker again, without treating polling or a purchase as a new turn.
export function previousTurnResults(view,lang=getLanguage()){
  const {state,seat}=view;
  if(state.round<2 || view.room?.phase==='lobby' || state.players[seat]?.eliminated || roomSeatTurn(state,seat)!=='active')return [];
  const round=state.round-1;
  const lastEnd=state.log.findLastIndex(e=>e.round===round && e.seat===seat && e.type==='end');
  if(lastEnd<0)return [];
  const tasks=pendingTurnTasks(view);
  const rows=[];
  for(const e of state.log.slice(0,lastEnd)){
    if(e.seat!==seat || e.round!==round || !e.item)continue;
    const zh=lang==='zh-CN', t=s=>translate(s,lang);
    if(e.type==='discovery' || e.type==='adoption'){
      const tech=e.type==='discovery', project=councilTree(state,tech?'research':'civic')[e.item];
      if(!project)continue;
      rows.push({name:t(project.name),detail:tech?(zh?'科技已完成':'Technology completed'):(zh?'市政已通过':'Civic adopted'),
        next:tasks.find(task=>task.kind===(tech?'research':'civics'))});
    }
    if(e.type==='complete'){
      const unit=UNIT_TYPES[e.item], built=unit || BUILDINGS[e.item] || (e.item===SCIENCE_PROJECT.id?SCIENCE_PROJECT:null);
      if(!built)continue;
      const city=state.cities.find(c=>c.seat===seat && c.id===e.city);
      const district=getMap(state).byId[e.tile]?.name;
      // city names may have been customized. Only localize map-generated names.
      const place=city?.name && city.name!==district ? city.name : t(district || '');
      const kind=unit?(zh?'新单位已部署':'Unit deployed'):(zh?'城市项目已完成':'City project completed');
      rows.push({name:t(built.name),detail:[kind,place].filter(Boolean).join(' · '),next:tasks.find(task=>task.kind==='production' && task.id===e.city)});
    }
  }
  return rows;
}

export function mountTurnResults(anchor,onTask){
  const details=document.createElement('details');
  details.className='turn-results';
  details.setAttribute('translate','no');
  details.hidden=true;
  const summary=document.createElement('summary'), records=document.createElement('ul');
  details.append(summary,records);
  anchor.before(details);
  let current=[], last='', turnKey='';
  records.addEventListener('click',event=>{
    const button=event.target.closest('[data-completion-choice]');
    if(button && !button.disabled)onTask(current[Number(button.dataset.completionChoice)]?.next);
  });
  return function paint(view){
    if(!view)return;
    const lang=getLanguage(), zh=lang==='zh-CN';
    const key=JSON.stringify([view.mode,view.session,view.seat,view.state.round]);
    if(key!==turnKey){turnKey=key;details.open=false;}
    current=previousTurnResults(view,lang);
    details.hidden=!current.length;
    if(!current.length){last='';return;}
    const signature=JSON.stringify([key,lang,view.busy,current]);
    if(last===signature)return;
    last=signature;
    const extra=current.length-1;
    summary.textContent=(zh?'上回合完成 · ':'Last turn · ')+current[0].name+(extra?(zh?' 等 '+current.length+' 项':' +'+extra):'');
    const focusedIndex=records.contains(document.activeElement)?document.activeElement.dataset.completionChoice:null;
    const list=current.map((row,index)=>{
      const li=document.createElement('li'), detail=document.createElement('small'),name=document.createElement('strong');
      name.textContent=row.name;detail.textContent=row.detail;
      li.append(name,detail);
      if(row.next) {
        const button=document.createElement('button');button.type='button';button.dataset.completionChoice=String(index);button.disabled=!!view.busy;
        button.textContent=translate({research:'Choose research',civics:'Choose a civic',production:'Choose production'}[row.next.kind],lang);
        li.append(button);
      }
      return li;
    });
    records.replaceChildren(...list);
    if(focusedIndex!=null){
      const next=records.querySelector('[data-completion-choice="'+focusedIndex+'"]:enabled');
      (next || summary).focus({preventScroll:true});
    }
  };
}
