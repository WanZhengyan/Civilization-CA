import {seededRandom,shuffled} from './opening.js';

const exchanges={
  grant:{name:'Accept a travel grant',label:'+8 gold',stat:'capital',amount:8},
  letters:{name:'Carry local dispatches',label:'+5 influence',stat:'influence',amount:5},
  specimens:{name:'Study the specimens',label:'+5 science',stat:'science',amount:5},
  stories:{name:'Record oral histories',label:'+5 culture',stat:'culture',amount:5},
  rest:{name:'Treat the expedition',label:'Restore up to 25 HP',stat:'hp',amount:25},
  provisions:{name:'Sell spare provisions',label:'+6 gold',stat:'capital',amount:6}
};
export const FIELD_STATIONS={
  post:{name:'Trading post',choices:['grant','letters']},
  archive:{name:'Field archive',choices:['specimens','stories']},
  lodge:{name:'Trail lodge',choices:['rest','provisions']}
};
export const stationInstruction='Bring a scout here to choose one exchange. Each civilization can visit once.';
const siteSpacing=3;

export function placeFieldStations(state,map,distance) {
  if(state.campaignVariety!==1)return;
  const homes=state.units.filter(u=>u.type==='settler').map(u=>u.tile)
    .concat(state.cities.filter(city=>city.originalSeat!=null).map(city=>city.tile));
  const citySites=new Set(state.cities.map(city=>city.tile));
  const blocked=new Set([...(state.barbarians?.parties || []),...(state.barbarians?.camps || [])].map(piece=>piece.tile));
  const reachable=new Set(homes);
  for(const tile of reachable){
    const links=(map.bridgesByTile?.[tile] || []).map(bridge=>bridge.to);
    for(const next of [...map.neighbors(tile),...links]){
      if(!['ocean','mountains'].includes(map.byId[next].terrain))reachable.add(next);
    }
  }
  const random=seededRandom(state.seed,map.id+'/field-stations');
  const order=shuffled([...reachable].filter(tile=>!blocked.has(tile) && !citySites.has(tile) && !state.board[tile].naturalWonder &&
    !state.board[tile].resource && !map.byId[tile].landmark && homes.every(home=>distance(home,tile)>=2)),random);
  const types=shuffled(Object.keys(FIELD_STATIONS),random);
  const stations=[];
  const separated=tile=>stations.every(other=>distance(other,tile)>=siteSpacing);
  function place(tile){
    if(!tile)return;
    const fieldStation=types[stations.length%types.length];
    state.board[tile]={...state.board[tile],fieldStation};
    stations.push(tile);
  }
  // Each opening has a nearby contact; additional stations extend the route into the interior.
  for(const home of homes){
    if(!stations.some(tile=>distance(home,tile)<=4))place(order.find(tile=>distance(home,tile)<=4 && separated(tile)));
  }
  const target=Math.max(3,Math.ceil(map.tiles.length/65));
  for(const tile of order){
    if(stations.length>=target)break;
    if(separated(tile))place(tile);
  }
}

export function fieldStationReport(state,unit) {
  if(state.campaignVariety!==1 || !unit || unit.type!=='scout')return null;
  const station=FIELD_STATIONS[state.board[unit.tile]?.fieldStation];
  if(!station)return null;
  const visited=Boolean(state.players[unit.seat].stationVisits?.includes(unit.tile));
  return {name:station.name,visited,choices:station.choices.map(key=>({
    key,...exchanges[key],enabled:!visited && unit.moves>0 && (key!=='rest' || unit.hp<unit.maxHp)
  }))};
}

export function visitFieldStation(state,seat,action){
  const unit=state.units.find(candidate=>candidate.id===action.unit && candidate.seat===seat);
  const report=fieldStationReport(state,unit);
  const choice=report?.choices.find(item=>item.key===action.item && item.enabled);
  if(!choice)throw new Error('Choose an available exchange with a scout at this station.');
  const player=state.players[seat];
  if(choice.stat==='hp')unit.hp=Math.min(unit.maxHp,unit.hp+choice.amount);
  else player[choice.stat]=(player[choice.stat] || 0)+choice.amount;
  player.stationVisits=[...(player.stationVisits || []),unit.tile];
  unit.moves=0;
  return {tile:unit.tile,text:choice.name+' · '+choice.label};
}

export function nearestKnownStation(state,unit,tiles,distance){
  if(state.campaignVariety!==1 || unit.type!=='scout')return null;
  const visited=new Set(state.players[unit.seat].stationVisits);
  let nearest=null;
  for(const tile of tiles)if(state.board[tile]?.fieldStation && !visited.has(tile) &&
    (!nearest || distance(unit.tile,tile)<distance(unit.tile,nearest)))nearest=tile;
  return nearest;
}

export function volunteerStationOrder(state,unit){
  const report=fieldStationReport(state,unit);
  if(!report || report.visited)return null;
  const choices=report.choices.filter(choice=>choice.enabled);
  const preferred=unit.hp<unit.maxHp-10 ? 'rest' : state.players[unit.seat].research ? 'specimens' : 'stories';
  const chosen=choices.find(choice=>choice.key===preferred) || choices[0];
  return chosen ? {type:'visitStation',unit:unit.id,item:chosen.key} : null;
}

export function drawFieldStation(g,kind,x,y){
  g.save();g.translate(x+8,y-10);g.beginPath();g.arc(0,0,7,0,2*Math.PI);
  g.fillStyle='#283d42';g.fill();g.strokeStyle='#ffd785';g.lineWidth=1.5;g.stroke();
  g.strokeStyle='#fff0b7';g.lineWidth=1.2;g.lineJoin='round';
  g.beginPath();
  if(kind==='archive'){
    g.moveTo(-4,-2);g.lineTo(-1,-2);g.lineTo(0,-1);g.lineTo(1,-2);g.lineTo(4,-2);
    g.lineTo(4,2);g.lineTo(1,2);g.lineTo(0,3);g.lineTo(-1,2);g.lineTo(-4,2);g.closePath();
  }else if(kind==='post'){
    g.moveTo(-4,2);g.lineTo(-4,-1);g.lineTo(4,-1);g.lineTo(4,2);g.closePath();g.moveTo(-2,-1);g.lineTo(-2,-3);g.lineTo(2,-3);g.lineTo(2,-1);
  }else{g.moveTo(-4,3);g.lineTo(0,-4);g.lineTo(4,3);g.closePath();g.moveTo(-1,3);g.lineTo(0,0);g.lineTo(2,3);}
  g.stroke();g.restore();
}

export const stationCopy=`
Trading post|商贸驿站
Field archive|田野档案馆
Trail lodge|山径驿舍
Field station|野外站点
Nearest known station|最近的已知站点
Each civilization can visit once. An exchange uses the scout’s remaining movement.|每个文明可以访问一次。交换会用完侦察兵剩余的移动力。
Bring a scout here to choose one exchange. Each civilization can visit once.|派侦察兵来此选择一次交换。每个文明均可访问一次。
Your expedition has visited this station.|你的远征队已访问过这个站点。
Accept a travel grant|领取旅费
Carry local dispatches|递送地方公文
Study the specimens|研究标本
Record oral histories|采录口述史
Treat the expedition|医疗补给
Sell spare provisions|出售多余补给
+8 gold|+8 金币
+5 influence|+5 影响力
+5 science|+5 科研
+5 culture|+5 文化
Restore up to 25 HP|恢复至多 25 点生命
+6 gold|+6 金币
Choose an available exchange with a scout at this station.|请用位于该站点的侦察兵选择可用的交换。
`;
