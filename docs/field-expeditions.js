// Field studies are fictional contracts played on the campaign's own terrain.
export const studies = {
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
    const note={tile:unit.tile,terrain:context.tile.terrain,round:state.round};
    storeCrew(player,unit.id,{...mission,notes:[...mission.notes,note]});
    unit.moves--;
    return 'Field observation recorded.';
  }
  if(action.item==='file' && r.complete && base) {
    for(const [stat,amount] of Object.entries(spec.reward))player[stat]=(player[stat]||0)+amount;
    player.fieldReports={...r.filed,[mission.key]:{...mission,filed:state.round,city:base.id}};
    storeCrew(player,unit.id,null);
    unit.moves--;
    return 'Field report deposited.';
  }
  throw new Error('This field order is unavailable here.');
}
