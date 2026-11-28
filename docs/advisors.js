import {housingCapacity} from "./population.js";
import {scoutingRoutes} from "./scout-routes.js";
// Advisors read only the seat's projected chart. They never issue orders.
import {getMap,getPopulationReport,getCitizenWorkforce,getProductionOptions,getSettlementAssessment,getUnitOptions,getRouteDetail,RESOURCES,IMPROVEMENTS} from './rules.js';
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

function improvementsDesk({state,units,map,L,t,add,active}){
  if(!active)return;
  for(const unit of units.filter(u=>u.charges && u.moves>0 && u.skippedRound!==state.round)){
    const sites=Object.entries(state.intel.workSites?.[unit.id]||{}).flatMap(([tile,work])=>{
      const resource=RESOURCES[state.board[tile]?.resource];
      if(!resource || resource.improvement!==work || !state.intel.visible.includes(tile))return [];
      const cost=tile===unit.tile?0:getRouteDetail(state,unit.id,tile)?.cost;
      return cost==null?[]:[{tile,work,resource,cost}];
    }).sort((a,b)=>a.cost-b.cost || a.tile.localeCompare(b.tile));
    const s=sites[0];if(!s)continue;
    add('improve',L('Connect ','接入资源 · ')+t(s.resource.name),
      L(t(IMPROVEMENTS[s.work].name)+' at '+t(map.byId[s.tile].name)+' ('+s.tile+') costs one of '+unit.charges+' charges and adds one stock unit per harvest while connected. Travel costs '+s.cost+' movement.',
        '在'+t(map.byId[s.tile].name)+'（'+s.tile+'）修建'+t(IMPROVEMENTS[s.work].name)+'，消耗剩余 '+unit.charges+' 次建造次数中的一次。接入后每次收获增加 1 份库存。前往需 '+s.cost+' 移动力。'),
      69,{kind:s.cost?'move':'unit',unit:unit.id,tile:s.tile});
  }
}

function housingDesk({state,cities,L,t,name,add,options}){
  for(const city of cities){
    const food=getPopulationReport(state,city.id);
    if(!food.housingLimited || food.surplus<=0)continue;
    for(const project of options(city).filter(p=>p.enabled && ['granary','neighborhood'].includes(p.item))){
      const capacity=food.housing+housingCapacity({...city,buildings:[...city.buildings,project.item]})-housingCapacity(city);
      add('housing',L('Open housing in ','增加住房 · ')+name(city),
        L(t(project.label)+' raises capacity from '+food.housing+' to '+capacity+'. This city banks '+food.food+' food and has a '+food.surplus+' surplus each harvest. Build in '+project.turns+' turns.',
          t(project.label)+'使住房从 '+food.housing+' 增至 '+capacity+'。本城储粮 '+food.food+'，每回合结余 '+food.surplus+'，预计建造 '+project.turns+' 回合。'),
        67-Math.min(7,project.turns),{kind:'production',city:city.id,item:project.item});
    }
  }
}

const desks=[housingDesk,improvementsDesk,explorationDesk,settlementDesk,foodDesk];
export function advisorReport(state,seat,language='en'){
  if(!state?.players?.[seat] || state.intel?.seat!==seat || state.phase!=='playing' || state.players[seat].eliminated)return [];
  const L=(en,zh)=>language==='zh-CN'?zh:en;
  const map=getMap(state),cities=state.cities.filter(c=>c.seat===seat),units=state.units.filter(u=>u.seat===seat);
  const t=value=>translate(value,language);
  const name=city=>city.name===map.byId[city.tile]?.name?t(city.name):city.name;
  const rows=[];
  const add=(desk,title,detail,priority,link)=>rows.push({desk,title,detail,priority,link});
  const byCity=new Map();
  function options(city){
    if(!byCity.has(city.id))byCity.set(city.id,getProductionOptions(state,city.id,{replace:true}));
    return byCity.get(city.id);
  }
  const ctx={options,state,seat,cities,units,map,L,t,name,add,active:roomSeatTurn(state,seat)==='active'};
  for(const advise of desks)advise(ctx);
  return rows.sort((a,b)=>b.priority-a.priority || a.desk.localeCompare(b.desk) || a.title.localeCompare(b.title));
}
