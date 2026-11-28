import {getPendingTurnTasks, getMap, UNIT_TYPES} from './rules.js';
import {roomSeatTurn,teamTurnLabels} from './room-turn.js';
import {getLanguage,translate} from './i18n.js';

const promptNames={
  research:['Choose research','选择科技'],
  civics:['Choose a civic','选择市政'],
  production:['Choose production','选择生产项目'],
  unit:['Unit needs orders','给单位下令']
};

function taskTarget(state,task,lang){
  if(task.kind==='unit'){
    const unit=state.units.find(u=>u.id===task.id);
    return translate(UNIT_TYPES[unit?.type]?.name || '',lang);
  }
  if(task.kind==='production'){
    const city=state.cities.find(c=>c.id===task.id);
    if(city) return city.name===getMap(state).byId[city.tile]?.name ? translate(city.name,lang) : city.name;
  }
  return '';
}

// Views are immutable snapshots. Hover, focus and language changes reuse their choices.
let lastState=null,lastSeat=null,lastTasks=[];
export function pendingTurnTasks({state,seat}){
  if(state!==lastState || seat!==lastSeat){
    lastTasks=getPendingTurnTasks(state,seat);
    lastState=state;
    lastSeat=seat;
  }
  return lastTasks;
}

export function turnButtonState(view,lang=getLanguage()){
  const {state,seat,mode,room}=view;
  const zh=lang==='zh-CN';
  const plain=(kind,text,disabled=false)=>({kind,label:translate(text,lang),disabled,count:0});
  if(mode==='online' && room?.phase==='lobby')return plain('lobby','Open room');
  if(state.phase==='finished')return plain('standings','Standings');
  if(view.roomStatus || view.busy)return plain('waiting',view.roomStatus || (mode==='solo'?'Rivals playing…':(zh?'正在同步指令…':'Updating orders…')),true);
  const team=teamTurnLabels(state,seat);
  if(roomSeatTurn(state,seat)!=='active'){
    const label=team?.button || (mode==='solo'?'Rivals playing…':state.players[state.turn]?.bot?'Computer playing…':'Waiting…');
    return plain('waiting',label,true);
  }
  // Mixed-version rooms retain their server's original turn and movement controls.
  const checked=mode!=='online' || state.intel?.turnReadiness===true;
  const tasks=checked ? pendingTurnTasks(view) : [];
  const task=tasks[0];
  if(!task)return {...plain('end',team?.button || 'End turn'),checked};
  const label=promptNames[task.kind][Number(zh)];
  const count=tasks.length, target=taskTarget(state,task,lang);
  const title=(zh?'待处理 '+count+' 项':count+(count===1?' decision left':' decisions left'))+' · '+label+(target?' · '+target:'');
  return {kind:task.kind,task,label,title,count,disabled:false};
}

export function paintTurnButton(button,view){
  const state=turnButtonState(view);
  const label=button.querySelector('#end-label'),count=button.querySelector('[data-turn-count]');
  if(label.textContent!==state.label)label.textContent=state.label;
  button.dataset.turnKind=state.kind;
  button.disabled=state.disabled;
  button.title=state.title || state.label;
  button.setAttribute('aria-label',button.title);
  count.hidden=!state.count;
  count.textContent=state.count ? String(state.count) : '';
}
