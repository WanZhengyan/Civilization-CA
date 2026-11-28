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

function exhibitWonder({state,unit,tile,map,notes,distance}) {
  const chart=getVision(state,unit.seat).explored;
  if(notes.length){
    const site=notes[0].wonderTile;
    return distance(tile.id,site)===1 && distance(tile.id,notes[0].tile)>=2 ? site : null;
  }
  return map.neighbors(tile.id).find(id=>chart.has(id) && state.board[id]?.naturalWonder);
}

export const studies = {
  perspectives:{name:['Natural wonder in two views','自然奇观双视角图录'],fee:5,reward:{culture:7,science:4},
    steps:[['Sketch a discovered natural wonder from an adjacent land hex.','在已发现的自然奇观旁的一块陆地写生。'],['Draw the same wonder from another adjacent tile at least two hexes from your first viewpoint.','改从该奇观旁的另一地块写生，两处观察点至少相距两格。']],
    sample:context=>Boolean(exhibitWonder(context)),
    evidence:context=>{const id=exhibitWonder(context);return {wonderTile:id,wonder:context.state.board[id].naturalWonder};}},
  corridor:{name:['Habitat corridor','栖息地廊道'],fee:6,reward:{influence:4},
    benefit:['Earn 2 culture each harvest while both plots remain yours, free of improvements and facilities.','两块地均归你所有，且未建设改良或设施时，每次收获获得 2 文化。'],
    steps:[['Mark an unimproved woodland in your territory.','在己方未改良的林地标记一处栖息地。'],['Mark an adjacent unimproved woodland or foothill you control.','在相邻的一块己方未改良林地或丘陵设置另一标记。']],
    sample:({state,unit,tile,notes,map})=>intactHabitat(state,unit.seat,tile.id) && (notes.length ?
      ['forest','hills'].includes(tile.terrain) && map.neighbors(notes[0].tile).includes(tile.id) : tile.terrain==='forest')},
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

function intactHabitat(state,seat,id) {
  const land=state.board[id];
  return land?.owner===seat && !land.improvement && !land.facility && !land.wonder && !state.cities.some(c=>c.tile===id);
}
export function corridorIncome(state,seat) {
  const record=state.players[seat]?.fieldReports?.corridor;
  return record?.notes?.length===2 && record.notes.every(n=>intactHabitat(state,seat,n.tile)) ? 2 : 0;
}

export function fieldReport(state,unit,map,distance) {
  if(state.campaignVariety!==1 || unit?.type!=='scout' || (state.intel && state.intel.seat!==unit.seat))return null;
  const player=state.players[unit.seat], mission=player.fieldCrews?.[unit.id];
  const filed=player.fieldReports || {};
  const base=state.cities.find(c=>c.seat===unit.seat && distance(c.tile,unit.tile)<=1);
  const ownCities=state.cities.filter(c=>c.seat===unit.seat);
  const nearest=ownCities.reduce((best,c)=>!best || distance(c.tile,unit.tile)<distance(best.tile,unit.tile)?c:best,null);
  const friendlyGround=state.board[unit.tile]?.owner==null || state.board[unit.tile].owner===unit.seat;
  const atCamp=player.fieldCamp?.tile===unit.tile && friendlyGround;
  const canCamp=Boolean(nearest && !base && !atCamp && friendlyGround && player.capital>=7 && !state.cities.some(c=>c.tile===unit.tile));
  const office=base || (atCamp && nearest);
  const tile=map.byId[unit.tile], notes=mission?.notes || [];
  const context={state,unit,map,distance,tile,notes};
  const catalog=Object.entries(studies).filter(([,study])=>!study.region || study.region===map.id);
  const activeKeys=new Set(state.units.filter(u=>u.seat===unit.seat).map(u=>player.fieldCrews?.[u.id]?.key));
  const open=catalog.filter(([key])=>!filed[key] && !activeKeys.has(key));
  const relay=mission && mission.relayRound!==state.round ? state.units.filter(u=>u.id!==unit.id && u.seat===unit.seat && u.type==='scout' &&
    u.moves>0 && distance(u.tile,unit.tile)<=1 && !player.fieldCrews?.[u.id]) : [];
  const spec=studies[mission?.key];
  const complete=Boolean(spec && notes.length===spec.steps.length);
  const canSample=Boolean(spec && !complete && unit.moves>0 && spec.sample(context));
  const sponsor=mission && state.cities.find(c=>c.id===mission.sponsor && c.seat===unit.seat);
  const archive=state.board[unit.tile]?.fieldStation==='archive';
  const canMail=Boolean(archive && sponsor && complete && !spec.reward.food && player.influence>=2);
  return {player,mission,filed,base,office,atCamp,canCamp,sponsor,archive,canMail,relay,open,spec,complete,canSample,context};
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
  if(action.item==='camp' && r.canCamp) {
    player.capital-=7;
    player.fieldCamp={tile:unit.tile,round:state.round};
    unit.moves=0;
    return 'Field camp established.';
  }
  if(action.item==='start') {
    const entry=r.open.find(([key])=>key===action.study);
    if(!entry || mission || !r.office || player.capital<entry[1].fee)throw new Error('Commission a new field study near your city with enough gold.');
    player.capital-=entry[1].fee;
    storeCrew(player,unit.id,{key:entry[0],sponsor:r.office.id,started:state.round,notes:[]});
    unit.moves--;
    return 'Field expedition commissioned.';
  }
  if(!mission || mission.key!==action.study || action.step!==mission.notes.length)throw new Error('Field notes changed. Review the expedition.');
  if(action.item==='relay'){
    const recipient=r.relay.find(u=>u.id===action.target);
    if(!recipient)throw new Error('This field order is unavailable here.');
    storeCrew(player,unit.id,null);
    storeCrew(player,recipient.id,{...mission,relayRound:state.round});
    unit.moves--;recipient.moves--;
    return 'Field notes handed to another scout.';
  }
  if(action.item==='sample' && r.canSample) {
    const note={tile:unit.tile,terrain:context.tile.terrain,round:state.round,...spec.evidence?.(context)};
    storeCrew(player,unit.id,{...mission,notes:[...mission.notes,note]});
    unit.moves--;
    return 'Field observation recorded.';
  }
  const deliverOre=action.item==='deliverOre' && mission.key==='assay';
  const mail=action.item==='mail' && r.canMail;
  if(((action.item==='file' || deliverOre) && r.complete && base) || mail) {
    const recipient=mail ? r.sponsor : base;
    if(mail)player.influence-=2;
    if(deliverOre){
      const ore=mission.notes[0].resource;
      player.stockpile={...player.stockpile,[ore]:(player.stockpile?.[ore]||0)+2};
    }else for(const [stat,amount] of Object.entries(spec.reward)){
      if(stat==='food')recipient.food=(recipient.food||0)+amount;
      else player[stat]=(player[stat]||0)+amount;
    }
    player.fieldReports={...r.filed,[mission.key]:{...mission,filed:state.round,city:recipient.id,delivery:action.item}};
    storeCrew(player,unit.id,null);
    unit.moves--;
    return 'Field report deposited.';
  }
  throw new Error('This field order is unavailable here.');
}
