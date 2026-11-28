// Advisors read only the seat's projected chart. They never issue orders.
import {getMap,getPopulationReport,getCitizenWorkforce} from './rules.js';
import {roomSeatTurn} from './room-turn.js';
import {translate} from './i18n.js';

function foodDesk(ctx) {
  const {state,cities,L,name,add}=ctx;
  for(const city of cities){
    const report=getPopulationReport(state,city.id);
    const present=getCitizenWorkforce(state,city.id).yields;
    const alternative=getCitizenWorkforce(state,city.id,'food').yields;
    const gain=alternative.food-present.food;
    if(!gain && (report.housingLimited || report.surplus>=0))continue;
    const title=L('Review the food supply at ','检查粮食供应 · ')+name(city);
    const detail=L('Food balance '+report.surplus+'/turn. Food focus changes the balance to '+(report.surplus+gain)+', with '+(alternative.production-present.production)+' production and '+(alternative.science-present.science)+' science per turn relative to today.',
      '粮食每回合结余 '+report.surplus+'。改为优先粮食后，结余为 '+(report.surplus+gain)+'，每回合生产力变化 '+(alternative.production-present.production)+'，科研变化 '+(alternative.science-present.science)+'。');
    add('food',title,detail,report.starvationTurns?99:49,{kind:'citizens',city:city.id});
  }
}

const desks=[foodDesk];
export function advisorReport(state,seat,language='en'){
  if(!state?.players?.[seat] || state.intel?.seat!==seat || state.phase!=='playing' || state.players[seat].eliminated)return [];
  const L=(en,zh)=>language==='zh-CN'?zh:en;
  const map=getMap(state),cities=state.cities.filter(c=>c.seat===seat),units=state.units.filter(u=>u.seat===seat);
  const t=value=>translate(value,language);
  const name=city=>city.name===map.byId[city.tile]?.name?t(city.name):city.name;
  const rows=[];
  const add=(desk,title,detail,priority,link)=>rows.push({desk,title,detail,priority,link});
  const ctx={state,seat,cities,units,map,L,t,name,add,active:roomSeatTurn(state,seat)==='active'};
  for(const advise of desks)advise(ctx);
  return rows.sort((a,b)=>b.priority-a.priority || a.desk.localeCompare(b.desk) || a.title.localeCompare(b.title));
}
