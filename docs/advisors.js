import {scoutingRoutes} from "./scout-routes.js";
// Advisors read only the seat's projected chart. They never issue orders.
import {getMap,getPopulationReport,getCitizenWorkforce,getSettlementAssessment,getUnitOptions} from './rules.js';
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

function settlementDesk({state,units,map,L,t,add,active}){
  if(!active)return;
  const chart=new Set(state.intel.explored);
  for(const unit of units.filter(u=>u.type==='settler' && u.moves>0 && u.skippedRound!==state.round)){
    const sites=[];
    for(const tile of [unit.tile,...getUnitOptions(state,unit.id).moves]){
      if(!chart.has(tile))continue;
      const report=getSettlementAssessment(state,unit.id,tile);
      if(!report.canFoundThisTurn && !report.canFoundNextTurn)continue;
      const ground=map.neighbors(tile).filter(id=>chart.has(id));
      const food=ground.filter(id=>['plains','coast'].includes(map.byId[id].terrain)).length;
      const hills=ground.filter(id=>['hills','forest'].includes(map.byId[id].terrain)).length;
      sites.push({tile,report,food,hills,score:Number(report.canFoundThisTurn)*5+Math.min(food,2)*2+Math.min(hills,2)-report.moveCost});
    }
    sites.sort((a,b)=>b.score-a.score || a.tile.localeCompare(b.tile));
    for(const [i,s] of sites.slice(0,2).entries()){
      const site=t(map.byId[s.tile].name)+' ('+s.tile+')';
      add('settle',L('Survey a town site · ','查看建城点 · ')+site,
        L((s.report.canFoundThisTurn?'Can found this turn. ':'Can found next turn. ')+s.report.moveCost+' movement. Charted neighboring hexes include '+s.food+' lowland/coast and '+s.hills+' foothill/woodland.',
          (s.report.canFoundThisTurn?'本回合可建城。':'下回合可建城。')+'移动消耗 '+s.report.moveCost+'。相邻已探索地块包括 '+s.food+' 格低地或海岸、'+s.hills+' 格丘陵或林地。'),
        86-i,{kind:s.tile===unit.tile?'unit':'move',unit:unit.id,tile:s.tile});
    }
  }
}

function explorationDesk({state,units,map,L,t,add,active}){
  if(!active)return;
  for(const unit of units.filter(u=>u.type==='scout' && u.moves>0 && u.skippedRound!==state.round)){
    const targets=getUnitOptions(state,unit.id).moves.filter(id=>state.intel.explored.includes(id));
    const routes=scoutingRoutes(state,unit,targets);
    if(!routes[0]?.newHexes)continue;
    const best=routes[0],nimble=routes.find(r=>r.left>best.left && r.newHexes);
    for(const [i,r] of [best,nimble].filter(Boolean).entries()){
      add('explore',L(i?'Keep a scout move · ':'Reveal the frontier · ',i?'保留侦察兵移动力 · ':'勘探边界 · ')+t(map.byId[r.tile].name),
        L('At '+r.tile+', chart '+r.newHexes+' new hexes for '+r.cost+' movement. '+r.left+' movement remains.',
          '到达 '+r.tile+' 可探索 '+r.newHexes+' 格，消耗 '+r.cost+' 移动力，剩余 '+r.left+'。'),65-i,{kind:'move',unit:unit.id,tile:r.tile});
    }
  }
}

const desks=[explorationDesk,settlementDesk,foodDesk];
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
