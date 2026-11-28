import {trainedAs} from './unit-service.js';
import {sameTeam} from './teams.js';

// Three observations belong to the scout carrying the notebook. Publishing is once per civilization.
const terrainNames={plains:'Lowlands',urban:'Urban',coast:'Coast',forest:'Woodland',hills:'Foothills'};
const fieldGoal=3;
const separation=3;
export const atlasInstruction='Record three different terrains at least three hexes apart. Bring the same scout back to a friendly city.';

export function notebookReport(state,unit,map,distance){
  if(state.campaignVariety!==1 || !unit || !trainedAs(unit,'scout'))return null;
  const publisher=state.players[unit.seat].publishedAtlas;
  const notes=unit.fieldNotes || [];
  const terrain=map.byId[unit.tile]?.terrain;
  const city=state.cities.find(city=>city.seat===unit.seat && distance(city.tile,unit.tile)<=1);
  const sampled=notes.some(sample=>sample.terrain===terrain);
  const close=notes.some(sample=>distance(sample.tile,unit.tile)<separation);
  const full=notes.length>=fieldGoal;
  return {notes:notes.map(sample=>({...sample,name:terrainNames[sample.terrain]})),terrain,name:terrainNames[terrain],
    publisher,full,city,canRecord:!publisher && !full && Boolean(terrainNames[terrain]) && !sampled && !close && unit.moves>0,
    canFile:!publisher && full && Boolean(city) && unit.moves>0,
    reason:publisher ? 'Your civilization has published its atlas.' : full ? 'Return to a city you control with this scout.' :
      sampled ? 'This terrain is already in the notebook.' : close ? 'Move at least three hexes from each previous observation.' :
      !unit.moves ? 'Restore movement next turn.' : null};
}

export function runAtlasOrder(state,seat,action,map,distance){
  const unit=state.units.find(candidate=>candidate.id===action.unit && candidate.seat===seat);
  const report=notebookReport(state,unit,map,distance);
  if(action.type==='recordTransect'){
    if(!report?.canRecord)throw new Error('Record a new terrain with a scout at least three hexes from earlier observations.');
    unit.fieldNotes=[...(unit.fieldNotes || []),{tile:unit.tile,terrain:report.terrain}];
    unit.moves--;
    return {tile:unit.tile,text:'Terrain recorded'+' · '+report.name};
  }
  if(!report?.canFile)throw new Error('Bring the scout with three observations within one hex of your city.');
  const city=report.city;
  state.players[seat].publishedAtlas={city:city.id,round:state.round};
  city.atlasCopies=(city.atlasCopies || 0)+1;
  state.players[seat].capital+=8;
  state.players[seat].influence+=6;
  unit.moves=0;
  return {tile:city.tile,text:'Regional atlas published.'};
}

export function expeditionScout(state,seat,distance,definitions){
  if(state.campaignVariety!==1 || state.players[seat].publishedAtlas)return null;
  const scouts=state.units.filter(unit=>unit.seat===seat && trainedAs(unit,'scout'));
  if(!scouts.length)return null;
  const cities=state.cities.filter(city=>city.seat===seat);
  const needsDefense=state.units.some(unit=>!sameTeam(state,seat,unit.seat) && definitions[unit.type]?.captures
    && cities.some(city=>distance(city.tile,unit.tile)<=2));
  if(needsDefense)return null;
  return scouts.reduce((best,u)=>(u.fieldNotes?.length || 0)>(best.fieldNotes?.length || 0)?u:best).id;
}

export function expeditionOrder(state,unit,moves,map,distance){
  const report=notebookReport(state,unit,map,distance);
  if(!report || report.publisher)return null;
  if(report.canFile)return {type:'fileTransect',unit:unit.id};
  if(report.canRecord)return {type:'recordTransect',unit:unit.id};
  if(!report.full && moves.length){
    const missing=moves.filter(tile=>Boolean(terrainNames[map.byId[tile].terrain]) &&
      report.notes.every(note=>note.terrain!==map.byId[tile].terrain && distance(note.tile,tile)>=separation));
    if(missing.length){
      const target=missing.reduce((best,tile)=>distance(unit.tile,tile)<distance(unit.tile,best)?tile:best);
      return {type:'move',unit:unit.id,tile:target};
    }
  }
  if(report.full && moves.length){
    const cities=state.cities.filter(city=>city.seat===unit.seat);
    if(!cities.length)return null;
    const homeDistance=tile=>Math.min(...cities.map(city=>distance(city.tile,tile)));
    const here=homeDistance(unit.tile);
    let closest=unit.tile,best=here;
    for(const tile of moves){
      const d=homeDistance(tile);
      if(d<best){closest=tile;best=d;}
    }
    if(best<here)return {type:'move',unit:unit.id,tile:closest};
  }
  return null;
}

export function notebookPanel(report,disabled,button,esc){
  if(!report)return '';
  const head='<span>Regional atlas</span><strong>'+(report.publisher?'✓':report.notes.length+' / '+fieldGoal)+'</strong>';
  let html='<div class="unit-sight">'+head+'</div>';
  if(report.publisher)return html+'<p class="panel-note">Your civilization has published its atlas.</p>';
  html+='<p class="panel-note">'+atlasInstruction+'</p>';
  if(report.notes.length)html+='<ul class="expedition-notes">'+report.notes.map(note=>'<li><span>'+esc(note.name)+'</span> · '+esc(note.tile)+'</li>').join('')+'</ul>';
  if(report.full){
    html+=button('file-atlas','Publish regional atlas','+8 gold · +6 influence','gold',disabled||!report.canFile);
    html+='<p class="panel-note">The publishing city also earns 1 influence per turn.</p>';
  }else{
    html+=button('record-terrain','Record terrain',report.name || 'Terrain','',disabled||!report.canRecord);
    html+='<p class="panel-note">One movement per observation.</p>';
  }
  if(report.reason && !report.canFile)html+='<p class="panel-note">'+esc(report.reason)+'</p>';
  return html;
}

export const notebookCopy=`
Regional atlas|地区图志
Record three different terrains at least three hexes apart. Bring the same scout back to a friendly city.|记录三种不同地形，各观测点之间至少相距三格，再派这名侦察兵返回己方城市。
Your civilization has published its atlas.|你的文明已出版地区图志。
Return to a city you control with this scout.|将携带笔记的这名侦察兵带回己方城市或相邻一格。
This terrain is already in the notebook.|笔记中已记录这种地形。
Move at least three hexes from each previous observation.|距每个已有观测点至少三格才能记录。
Restore movement next turn.|下回合将恢复移动力。
Record a new terrain with a scout at least three hexes from earlier observations.|请将侦察兵移动到距离各已有观测点至少三格的新地形。
Bring the scout with three observations within one hex of your city.|派携带三条记录的侦察兵返回己方城市或相邻一格。
Terrain recorded|已记录地形
Regional atlas published.|地区图志已出版。
Publish regional atlas|出版地区图志
+6 influence|+6 影响力
The publishing city also earns 1 influence per turn.|出版城市每回合还可获得 1 影响力。
Record terrain|记录地形
One movement per observation.|每次记录消耗 1 移动力。
Regional atlas collection|地方图志收藏
`;
