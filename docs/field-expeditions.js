import {getVision} from './vision.js';
import {canSeeDeposits} from './resources.js';
// Field studies are fictional contracts played on the campaign's own terrain.
// Each board funds a different regional question. Only the current region offers its brief.
function terrainPair(first,second) {
  return ({tile,notes})=>!notes.length ? first.includes(tile.terrain) : second.includes(tile.terrain) && tile.id!==notes[0].tile;
}
// Trace only water the owner can already chart. A previously unseen distant
// channel must never change the player's available button.
function watershedSample({tile,map,state,unit,notes,distance}) {
  const known=getVision(state,unit.seat).explored;
  const banks=id=>map.neighbors(id).filter(other=>known.has(other) && ['river','lake'].includes(map.byId[other].waterway));
  const adjacent=banks(tile.id);
  if(!notes.length)return adjacent.length>0;
  if(distance(notes[0].tile,tile.id)<2 || !adjacent.length)return false;
  const water=new Set(banks(notes[0].tile));
  for(const id of water)for(const neighbor of banks(id))water.add(neighbor);
  return adjacent.some(id=>water.has(id));
}

export const studies = {
  assay:{name:['Stone and ore assay','岩石与矿样分析'],fee:4,reward:{science:8},
    steps:[['Collect a sample at a surveyed stone or iron deposit.','在已探明的石料或铁矿资源处采集样本。']],
    sample:({state,unit,tile})=>canSeeDeposits(state,unit.seat) && ['iron','stone'].includes(state.board[tile.id]?.resource),
    evidence:({state,tile})=>({resource:state.board[tile.id].resource})},
  tideWatch:{name:['Two-day tide watch','两日潮汐观测'],fee:2,reward:{science:5,capital:5},
    steps:[['Set a tide staff on coastal land next to open sea or bay water.','在紧邻海洋或海湾的海岸地块设立潮尺。'],['Return to the same staff on a later turn for a second reading.','下一回合或更晚回到原地读取第二次潮位。']],
    sample:({tile,map,notes,state})=>notes.length ? tile.id===notes[0].tile && state.round>notes[0].round :
      tile.terrain==='coast' && map.neighbors(tile.id).some(id=>map.byId[id].terrain==='ocean' && !map.byId[id].waterway)},
  fieldTrial:{name:['Farm comparison trial','农田对照试验'],fee:3,reward:{food:7,science:3},
    steps:[['Visit a working farm or orchard you control.','前往己方尚在生产的农田或果园。'],['Compare an unimproved land hex no more than two hexes from that farm.','到与该农场相距不超过两格的未改良陆地进行对照。']],
    sample:({state,unit,tile,notes,distance})=>{
      const land=state.board[tile.id];
      if(!notes.length)return land?.owner===unit.seat && !land.pillaged && ['farm','orchard'].includes(land.improvement);
      return tile.id!==notes[0].tile && distance(tile.id,notes[0].tile)<=2 && !land?.improvement && !state.cities.some(c=>c.tile===tile.id);
    }},
  watershed:{name:['Freshwater catchment','淡水水系踏查'],fee:3,reward:{science:8,influence:2},
    steps:[['Sample land beside a charted river or lake.','在已探明的河道或湖泊旁采样。'],['Follow the same charted freshwater network to a bank at least two hexes away.','沿同一已探明淡水水系，在至少两格外的岸边再采样。']],
    sample:watershedSample},
  basin:{region:'la',name:['Basin to boulevard','盆地与城区'],fee:4,reward:{culture:8},
    steps:[['Survey a foothill or woodland.','踏查一处丘陵或林地。'],['Interview a different urban district.','前往另一块城市地块走访。']],
    sample:terrainPair(['hills','forest'],['urban'])},
  bay:{region:'sf',name:['Working bay shoreline','海湾岸线调查'],fee:4,reward:{capital:9,influence:2},
    steps:[['Log a coastal district.','记录一处沿海地块。'],['Trace its link to a lowland or urban district.','前往另一块低地或城市地块追踪岸线腹地。']],
    sample:terrainPair(['coast'],['plains','urban'])},
  headland:{region:'sd',name:['Headlands and bluffs','岬角与海崖'],fee:4,reward:{science:8},
    steps:[['Record the coastal terrain.','记录海岸地形。'],['Survey an inland foothill or woodland.','考察内陆的一处丘陵或林地。']],
    sample:terrainPair(['coast'],['hills','forest'])},
  transect: {
    name:['Landscape transect','地貌剖面考察'], fee:3, reward:{science:6},
    steps:[['Record any land hex.','记录一块陆地。'],['Record a different terrain at least two hexes away.','到至少两格外的另一种地形记录。']],
    sample:({tile,notes,distance})=>notes.length===0 || (tile.terrain!==notes[0].terrain && distance(tile.id,notes[0].tile)>=2)
  }
};

export function fieldReport(state,unit,map,distance) {
  if(state.campaignVariety!==1 || unit?.type!=='scout' || (state.intel && state.intel.seat!==unit.seat))return null;
  const player=state.players[unit.seat], mission=player.fieldCrews?.[unit.id];
  const filed=player.fieldReports || {};
  const base=state.cities.find(c=>c.seat===unit.seat && distance(c.tile,unit.tile)<=1);
  const tile=map.byId[unit.tile], notes=mission?.notes || [];
  const context={state,unit,map,distance,tile,notes};
  const catalog=Object.entries(studies).filter(([,study])=>!study.region || study.region===map.id);
  const activeKeys=new Set(state.units.filter(u=>u.seat===unit.seat).map(u=>player.fieldCrews?.[u.id]?.key));
  const open=catalog.filter(([key])=>!filed[key] && !activeKeys.has(key));
  const spec=studies[mission?.key];
  const complete=Boolean(spec && notes.length===spec.steps.length);
  const canSample=Boolean(spec && !complete && unit.moves>0 && spec.sample(context));
  return {player,mission,filed,base,open,spec,complete,canSample,context};
}

function storeCrew(player,id,mission) {
  const crews={...player.fieldCrews};
  if(mission)crews[id]=mission;
  else delete crews[id];
  player.fieldCrews=crews;
}

export function fieldOrder(state,seat,action,map,distance) {
  const unit=state.units.find(u=>u.id===action.unit && u.seat===seat);
  const r=fieldReport(state,unit,map,distance);
  if(!r || !unit.moves)throw new Error('Choose your scout with movement remaining.');
  const {player,mission,base,spec,context}=r;
  if(action.item==='start') {
    const entry=r.open.find(([key])=>key===action.study);
    if(!entry || mission || !base || player.capital<entry[1].fee)throw new Error('Commission a new field study near your city with enough gold.');
    player.capital-=entry[1].fee;
    storeCrew(player,unit.id,{key:entry[0],sponsor:base.id,started:state.round,notes:[]});
    unit.moves--;
    return 'Field expedition commissioned.';
  }
  if(!mission || mission.key!==action.study || action.step!==mission.notes.length)throw new Error('Field notes changed. Review the expedition.');
  if(action.item==='sample' && r.canSample) {
    const note={tile:unit.tile,terrain:context.tile.terrain,round:state.round,...spec.evidence?.(context)};
    storeCrew(player,unit.id,{...mission,notes:[...mission.notes,note]});
    unit.moves--;
    return 'Field observation recorded.';
  }
  const deliverOre=action.item==='deliverOre' && mission.key==='assay';
  if((action.item==='file' || deliverOre) && r.complete && base) {
    if(deliverOre){
      const ore=mission.notes[0].resource;
      player.stockpile={...player.stockpile,[ore]:(player.stockpile?.[ore]||0)+2};
    }else for(const [stat,amount] of Object.entries(spec.reward)){
      if(stat==='food')base.food=(base.food||0)+amount;
      else player[stat]=(player[stat]||0)+amount;
    }
    player.fieldReports={...r.filed,[mission.key]:{...mission,filed:state.round,city:base.id,delivery:action.item}};
    storeCrew(player,unit.id,null);
    unit.moves--;
    return 'Field report deposited.';
  }
  throw new Error('This field order is unavailable here.');
}
