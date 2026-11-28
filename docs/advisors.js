import {SCIENCE_PROJECT,allowsScience} from "./victory-rules.js";
import {freightCourse} from "./freight-course.js";
import {isProduce,materialShipmentGain,SHIPMENT} from "./resources.js";
import {councilCourse} from "./council-path.js";
import {housingCapacity} from "./population.js";
import {scoutingRoutes} from "./scout-routes.js";
import {
  BUILDINGS, IMPROVEMENTS, RESOURCES, UNIT_TYPES, getBorderCharter, getCitizenWorkforce,
  getCityExpansions, getCityYield, getCivicOptions, getFreightManifest, getMap, getPopulationReport,
  getProductionOptions, getRecoveryForecast, getResearchOptions, getResourceLedger, getRouteDetail,
  getSettlementAssessment, getUnitOptions
} from './rules.js';

// Advisors read only the seat's projected chart. They never issue orders.
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

function industryDesk({state,cities,L,t,name,options,add}){
  for(const city of cities.filter(c=>!c.queue)){
    const initial=getCityYield(state,city.id).production;
    const candidates=[];
    for(const p of options(city).filter(p=>p.enabled && ['workshop','foundry','grainMill'].includes(p.item))){
      const completed={...city,buildings:[...city.buildings,p.item]};
      const projected={...state,cities:state.cities.map(c=>c.id===city.id?completed:c)};
      const gain=getCityYield(projected,city.id).production-initial;
      if(gain<=0)continue;
      const after=Math.ceil((p.required-(p.saved||0))/gain);
      candidates.push({p,gain,after});
    }
    candidates.sort((a,b)=>a.p.turns+a.after-b.p.turns-b.after || b.gain-a.gain);
    const best=candidates[0];if(!best)continue;
    const {p,gain,after}=best;
    add('industry',L('Reinvest production at ','投资生产力 · ')+name(city),
      L(t(p.label)+' opens in '+p.turns+' turns. Holding other output fixed, local production rises from '+initial+' to '+(initial+gain)+'/turn. The extra output repays remaining construction work after '+after+' producing turns.',
        t(p.label)+'预计 '+p.turns+' 回合建成。保持其他产出不变，城市生产力由每回合 '+initial+' 升至 '+(initial+gain)+'。投产后约 '+after+' 回合可用新增产出收回剩余建造投入。'),
      58,{kind:'production',city:city.id,item:p.item});
  }
}

function treasuryDesk({state,seat,cities,L,t,name,options,add}){
  const balance=state.players[seat].capital;
  for(const city of cities.filter(c=>c.queue)){
    const offer=options(city).find(p=>p.item===city.queue.item && p.buyEnabled && p.turns>0);
    if(!offer)continue;
    const efficiency=offer.gold/offer.turns;
    add('treasury',L('Price an early delivery at ','评估提前交付 · ')+name(city),
      L('Finish '+t(offer.label)+' now for '+offer.gold+' gold or wait '+offer.turns+' production turns. That is '+efficiency.toFixed(1)+' gold per turn saved and leaves '+(balance-offer.gold)+' in the treasury.',
        '立即完成'+t(offer.label)+'需 '+offer.gold+' 金币，正常生产还需 '+offer.turns+' 回合。每提前一回合约花 '+efficiency.toFixed(1)+' 金币，支付后余额 '+(balance-offer.gold)+'。'),
      40+Math.min(10,offer.turns),{kind:'production',city:city.id,item:offer.item,buy:true});
  }
}

function scienceDesk({state,seat,cities,L,t,add}){
  if(!cities.length || state.players[seat].research)return;
  const player=state.players[seat],choices=getResearchOptions(state,seat);
  const projects=['workshop','shop','academy'].map(item=>{
    const plan=councilCourse(choices,BUILDINGS[item].tech,player.science||0);
    const next=plan?.steps.find(s=>!s.completed);
    if(!next?.enabled)return null;
    const missing=cities.filter(c=>!c.buildings.includes(item)).length;
    return missing?{item,plan,next,missing}:null;
  }).filter(Boolean).sort((a,b)=>a.plan.remaining/a.missing-b.plan.remaining/b.missing);
  const best=projects[0];if(!best)return;
  const {item,plan,next,missing}=best,building=t(BUILDINGS[item].name),project=t(next.label);
  add('science',L('Research a route to ','研究设施前置 · ')+building,
    L('Begin with '+project+' ('+next.cost+' science). This route needs '+plan.remaining+' more science after savings. It opens '+building+' for '+missing+' cities, each costing '+BUILDINGS[item].required+' production to construct.',
      '从'+project+'开始（'+next.cost+' 科研点）。扣除已储备点数，整条路线还需 '+plan.remaining+' 科研点。完成后有 '+missing+' 座城市可建造'+building+'，每座需 '+BUILDINGS[item].required+' 生产力。'),
    79,{kind:'research',item:BUILDINGS[item].tech});
}

function civicDesk({state,seat,cities,L,t,name,add}){
  if(!cities.length || state.players[seat].civic)return;
  const choices=getCivicOptions(state,seat),balance=state.players[seat].culture||0;
  const offers=[
    {goal:'normalSchools',eligible:cities.filter(c=>c.population>=3),gain:2,unit:L('science','科研')},
    {goal:'harborCommission',eligible:cities.filter(c=>c.buildings.includes('harbor')),gain:3,unit:L('gold','金币')},
    {goal:'publicWorks',eligible:cities,gain:1,unit:L('production','生产力')}
  ].flatMap(o=>{
    const route=councilCourse(choices,o.goal,balance);
    const first=route?.steps.find(s=>!s.completed);
    if(!first?.enabled || !o.eligible.length)return [];
    const total=o.gain*o.eligible.length;
    return [{...o,route,first,total,ratio:total/Math.max(1,route.remaining)}];
  }).sort((a,b)=>b.ratio-a.ratio || b.total-a.total);
  const choice=offers[0];if(!choice)return;
  const {goal,eligible,route,first,total,unit}=choice;
  const list=eligible.map(name).join(L(', ','、'));
  add('civic',L('Debate ','议定市政 · ')+t(choices.find(o=>o.item===goal).label),
    L('First project: '+t(first.label)+'. After completing the route, '+list+' together gain '+total+' '+unit+' per turn at current city sizes and facilities. The route still needs '+route.remaining+' culture.',
      '首项议题为'+t(first.label)+'。按当前城市规模和设施，完成路线后，'+list+'合计每回合新增 '+total+' '+unit+'。路线还需 '+route.remaining+' 文化点。'),
    78,{kind:'civics',item:goal});
}

function influenceDesk({state,seat,cities,map,L,t,name,add,active}){
  if(!active || !state.intel.borderCharters)return;
  const expansions=getCityExpansions(state,seat);
  for(const city of cities){
    const q=getBorderCharter(state,seat,city.id,expansions);
    if(!q.enabled || !q.tile || q.turns==null)continue;
    const site=t(map.byId[q.tile].name)+' ('+q.tile+')',remaining=state.players[seat].influence-q.cost;
    const deposit=RESOURCES[state.board[q.tile]?.resource];
    const benefit=deposit?L(' The visible deposit is '+t(deposit.name)+'.',' 该地已发现'+t(deposit.name)+'。'):'';
    add('borders',L(q.turns<=1?'Keep influence at ':'Compare a border charter at ',q.turns<=1?'暂存影响力 · ':'评估边境特许 · ')+name(city),
      L(site+' is due through growth in '+q.turns+' turns at the present rate. Annex it now for '+q.cost+' influence, leaving '+remaining+', or keep the full balance and wait.',
        '按当前速度，'+site+'预计 '+q.turns+' 回合后自然并入。现在支付 '+q.cost+' 影响力可提前取得，余额 '+remaining+'；等待自然扩张可保留全部影响力。')+benefit,
      43+Math.min(12,q.turns)+Number(!!deposit)*5,{kind:'borders',city:city.id});
  }
}

function supplyDesk({state,seat,cities,L,t,name,add,active}){
  if(!active || state.players[seat].lastShipment===state.round)return;
  const cargo=Object.entries(getResourceLedger(state,seat)).filter(([,a])=>a.stock>=SHIPMENT.goods);
  const bookings=[];
  for(const [key,a] of cargo){
    const food=isProduce(key);
    for(const city of cities){
      const f=getPopulationReport(state,city.id);
      if(food && (f.housingLimited && f.surplus>=0 || f.surplus>=0 && f.food>=f.threshold))continue;
      const gain=food?SHIPMENT.yield:materialShipmentGain(city);
      if(!gain)continue;
      const score=food?(f.starvationTurns?95-f.starvationTurns:50+Math.max(0,3-(f.growthTurns||4))):50+gain;
      bookings.push({key,a,city,food,gain,score});
    }
  }
  bookings.sort((a,b)=>b.score-a.score || b.a.stock-a.a.stock);
  const best=bookings[0];
  const [key,account]=best?[best.key,best.a]:cargo.sort((a,b)=>b[1].stock-a[1].stock)[0]||[];
  if(!key)return;
  const item=t(RESOURCES[key].name),rest=account.stock-SHIPMENT.goods,dest=best&&name(best.city);
  const value=best&&(best.food?L('stored food','储粮'):L('production on the current project','当前项目生产力'));
  const trade=best?L('Deliver to '+dest+' for +'+best.gain+' '+value+' or sell for '+SHIPMENT.gold+' gold.',
    '运至'+dest+'可增加 '+best.gain+' '+value+'，也可出售得 '+SHIPMENT.gold+' 金币。'):L('Sell for '+SHIPMENT.gold+' gold. No city currently needs this shipment.','出售可得 '+SHIPMENT.gold+' 金币。目前没有城市需要这批物资。');
  add('supplies',L('Choose a shipment · ','分配本回合货运 · ')+item,trade+L(' Uses this turn’s shipment and leaves '+rest+' in stock.','将占用本回合的货运机会，发运后库存 '+rest+'。'),
    best?.score||38,{kind:'supplies',city:best?.city.id,resource:key,market:best?'city':'sell'});
}

function coastDesk({state,units,L,t,add,active}){
  if(!active || state.campaignVariety!==1)return;
  for(const boat of units.filter(u=>u.type==='workboat' && u.moves>0 && u.skippedRound!==state.round)){
    const manifest=getFreightManifest(state,boat);
    if(!manifest || !manifest.cargo && !manifest.ready)continue;
    const moves=getUnitOptions(state,boat.id).moves;
    const courses=manifest.routes.map(port=>freightCourse(state,boat,port.berth,moves)).filter(c=>c?.unloadRound!=null);
    const efficiency=c=>c.port.gold/(1+c.unloadRound-state.round);
    courses.sort((a,b)=>efficiency(b)-efficiency(a) || a.unloadRound-b.unloadRound);
    const c=courses[0];if(!c)continue;
    const feedback=manifest.cargo?L('Crate aboard. ','已装货。'):L('Loading uses this turn and removes '+manifest.food+' food from the origin. ','装货占用本回合，出发港消耗 '+manifest.food+' 粮食。');
    add('coast',L('Chart a food delivery to ','规划海运粮食 · ')+t(c.port.name),
      feedback+L('Berth '+c.port.berth+' is '+c.steps+' charted water hexes away. At current speed, unload in round '+c.unloadRound+' for +'+manifest.food+' food there and +'+c.port.gold+' gold for the carrier.',
        '目的泊位 '+c.port.berth+'，航线经 '+c.steps+' 格已探索水域。按当前速度，第 '+c.unloadRound+' 轮可卸下 '+manifest.food+' 粮食，船方获 '+c.port.gold+' 金币。'),
      manifest.cargo?76:52,{kind:'freight',unit:boat.id,tile:c.port.berth});
  }
}

function recoveryDesk({state,seat,units,map,L,t,add,active}){
  if(!active)return;
  for(const u of units.filter(u=>u.hp<u.maxHp && u.moves>0 && !u.resting && u.skippedRound!==state.round)){
    const care=getRecoveryForecast(state,u.id,seat);
    if(!care?.canRest && !care?.nearest?.hexes)continue;
    const now=L('Holding here gives '+care.hpAfter+'/'+u.maxHp+' HP at the next muster. ',
      '在此停留至下回合开始，生命值预计为 '+care.hpAfter+'/'+u.maxHp+'。');
    const alternative=care.canRest?L('Resting spends the remaining '+u.moves+' movement and gives '+(u.hp+care.restGain)+'/'+u.maxHp+' HP.',
      '本回合休整会消耗剩余 '+u.moves+' 移动力，生命值可达 '+(u.hp+care.restGain)+'/'+u.maxHp+'。'):'';
    const station=care.nearest?.hexes?L(' The nearest service station, '+t(care.nearest.name)+', is '+care.nearest.hexes+' hexes away in a straight line.',
      ' 最近的补给站为'+t(care.nearest.name)+'，直线距离 '+care.nearest.hexes+' 格。'):'';
    add('recovery',L('Care for ','安排休整 · ')+t(UNIT_TYPES[u.type].name)+' · '+t(map.byId[u.tile].name),
      now+alternative+station,Math.round(52+24*(1-u.hp/u.maxHp)),{kind:'care',unit:u.id,rest:care.canRest});
  }
}

function launchDesk({state,seat,cities,L,name,options,add}){
  if(!allowsScience(state) || !state.players[seat].technologies?.includes('rocketry') || !cities.length)return;
  const launches=cities.flatMap(city=>{
    const p=options(city).find(p=>p.item===SCIENCE_PROJECT.id);
    const running=city.queue?.item===SCIENCE_PROJECT.id;
    if(!p || !running && !p.enabled || p.turns==null)return [];
    return [{city,p,running,work:running?city.queue.progress:(p.saved||0)}];
  }).sort((a,b)=>a.p.turns-b.p.turns || Number(b.running)-Number(a.running) || b.work-a.work);
  const leader=launches[0];if(!leader)return;
  const {city,p,running,work}=leader,next=launches[1];
  const comparison=next?L(' The next location, '+name(next.city)+', needs '+next.p.turns+' turns.',
    ' 备选城市'+name(next.city)+'需 '+next.p.turns+' 回合。'):'';
  const queue=city.queue && !running?L(' This would pause the current city project.',' 开工将暂停该城现有项目。'):'';
  add('launch',L(running?'Track the leading launch at ':'Start the fastest orbital survey at ',running?'查看领先的发射进度 · ':'开启最快的轨道测绘 · ')+name(city),
    L(work+'/'+p.required+' production already invested. The fastest eligible city can finish in '+p.turns+' turns at present output. Completion wins a science victory.',
      '已投入 '+work+'/'+p.required+' 生产力。按当前产出，最快的可用城市预计 '+p.turns+' 回合完成，完工将取得科技胜利。')+comparison+queue,
    91,{kind:'production',city:city.id,item:p.item});
}

const desks=[launchDesk,recoveryDesk,coastDesk,supplyDesk,influenceDesk,civicDesk,scienceDesk,treasuryDesk,industryDesk,housingDesk,improvementsDesk,explorationDesk,settlementDesk,foodDesk];
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
