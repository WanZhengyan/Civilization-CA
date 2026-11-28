import {actingPerspective,publicTeamPhase} from './team-turns.js';
import {sameTeam} from './teams.js';
import {NATURAL_WONDERS} from './natural-wonders.js';
// All regions use the same odd-row, point-up hex grid. Cached footprints contain
// only public geometry; never cache occupancy, observations, or player data here.
const footprints = new Map();
const fieldSight = 2;

// Foot and mounted scouts explore faster through movement; every mobile unit
// observes the same two rings. This also remains true for already trained units.
export function getSightRadius() { return fieldSight; }
export {getSightRadius as unitSight};

function footprint(id, radius) {
  const key=id+'@'+radius;
  if (footprints.has(key)) return footprints.get(key);
  const [col,row] = id.split(',').map(Number);
  const q = col-Math.floor(row/2);
  const tiles=[];
  for (let dr=-radius; dr<=radius; dr++) {
    for (let dq=Math.max(-radius,-dr-radius); dq<=Math.min(radius,-dr+radius); dq++) {
      const r=row+dr;
      tiles.push((q+dq+Math.floor(r/2))+','+r);
    }
  }
  footprints.set(key,tiles);
  return tiles;
}

export function sightFrom(state, tile) {
  return footprint(tile,fieldSight).filter(id=>Object.hasOwn(state.board,id));
}

export function getVisibleTiles(state, seat) {
  if (state.intel?.seat===seat) return new Set(state.intel.visible);
  const visible = new Set();
  const reveal=(tile,radius)=>{
    for (const id of footprint(tile,radius)) if (Object.hasOwn(state.board,id)) visible.add(id);
  };
  const observes=owner=>owner===seat || (state.teams && sameTeam(state,seat,owner));
  for (const unit of state.units) if (observes(unit.seat)) reveal(unit.tile,fieldSight);
  for (const city of state.cities) if (observes(city.seat)) {
    reveal(city.tile,fieldSight);
    if (city.portTile && city.buildings.includes('harbor') && state.players[city.seat]?.technologies?.includes('radar')) reveal(city.portTile,4);
  }
  for (const [id,holding] of Object.entries(state.board)) if (observes(holding.owner)) visible.add(id);
  return visible;
}

// Merge only discoveries, never private city or army snapshots. Older games
// already have one chart per seat and can share them on their first reload.
function teamMemory(state,seat) {
  const own=state.exploration?.[seat] || {};
  if (!state.teams) return own;
  let chart=own;
  for (let i=0;i<state.teams.length;i++) {
    if (i===seat || !sameTeam(state,seat,i)) continue;
    for (const [id,deposit] of Object.entries(state.exploration?.[i] || {})) {
      if (Object.hasOwn(chart,id) && (chart[id] || !deposit)) continue;
      if (chart===own) chart={...own};
      chart[id]=deposit;
    }
  }
  return chart;
}

export function getVision(state, seat, memory=state.intel ? null : teamMemory(state,seat)) {
  const visible=getVisibleTiles(state,seat);
  const explored=new Set(state.intel?.seat===seat ? state.intel.explored : Object.keys(memory || {}));
  for (const id of visible) explored.add(id);
  return {visible,explored};
}

function teamSurveyed(state,seat) {
  return state.players[seat].surveyEnabled!==false ||
    Boolean(state.teams && state.players.some((p,i)=>sameTeam(state,seat,i) && p.surveyEnabled===true));
}

// Immutable map of previously observed terrain and its deposit, per seat.
// Ownership, military positions and improvements are live intelligence, never remembered as facts.
export function rememberVision(state, previous) {
  if (!state || state.intel) return state;
  const teamSight=new Map();
  const sights=state.players.map((_,seat)=>{
    const team=state.teams?.[seat] ?? seat;
    if (!teamSight.has(team)) teamSight.set(team,getVisibleTiles(state,seat));
    return teamSight.get(team);
  });
  const discoveries=[];
  const exploration=sights.map((visible,seat)=>{
    const old=state.exploration?.[seat] || {};
    let known=old;
    const surveyed=teamSurveyed(state,seat);
    for(const id of visible) {
      const wonder=state.board[id].naturalWonder;
      if(wonder && !Object.hasOwn(old,id))discoveries.push({round:state.round,seat,type:'discovery',tile:id,wonder,text:'Discovered '+NATURAL_WONDERS[wonder].name+'.'});
      const resource=surveyed ? state.board[id].resource ?? null : null;
      if(known[id]===resource) continue;
      if(known===old) known={...old};
      known[id]=resource;
    }
    return known;
  });
  const oldLog=new Set(previous?.log || state.log);
  const log=state.log.map(entry=>{
    if(oldLog.has(entry) || entry.audience!=null || !entry.tile) return entry;
    const audience=sights.reduce((mask,visible,seat)=>visible.has(entry.tile) ? mask|(1<<seat) : mask,0);
    return {...entry,audience};
  });
  return {...state,exploration,log:discoveries.length ? [...log,...discoveries].slice(-160) : log};
}

const publicShape=(object,keys)=>Object.fromEntries(keys.filter(key=>Object.hasOwn(object,key)).map(key=>[key,object[key]]));
function observedEvent(entry,seat) {
  if(entry.seat===seat || ['start','end','finish','victory'].includes(entry.type)) {
    const {audience,...copy}=entry;
    return copy;
  }
  if (!(entry.audience & (1<<seat)) || !['move','found'].includes(entry.type)) return null;
  // Enemy orders must not reveal the route from fog, the hidden target's city name,
  // composition, queue, or the seat IDs that also witnessed this event.
  return {round:entry.round,seat:entry.seat,tile:entry.tile,type:'observation',text:'Activity spotted in view.'};
}

export function projectForSeat(state,seat) {
  if(!state || state.intel?.seat===seat) return state;
  state=actingPerspective(state,seat);
  const memory=teamMemory(state,seat);
  const {visible,explored}=getVision(state,seat,memory);
  const surveyed=teamSurveyed(state,seat);
  const board=Object.fromEntries(Object.entries(state.board).map(([id,cell])=>{
    if(visible.has(id)) {
      const {resource,...fields}=cell;
      if (resource && surveyed) fields.resource=resource;
      return [id,fields];
    }
    const cellMemory={owner:null,level:0,improvement:null};
    if(explored.has(id) && cell.naturalWonder)cellMemory.naturalWonder=cell.naturalWonder;
    if (memory[id] && surveyed) cellMemory.resource=memory[id];
    return [id,cellMemory];
  }));
  const players=state.players.map((player,index)=>index===seat ? player :
    publicShape(player,['name','bot','faction','color','eliminated',...(state.phase==='finished'?['score']:[])]));
  const cities=state.cities.filter(c=>c.seat===seat || visible.has(c.tile)).map(c=>c.seat===seat ? c :
    {...publicShape(c,['id','name','seat','tile','hp','maxHp','population','originalSeat']),buildings:[]});
  const units=state.units.filter(u=>u.seat===seat || visible.has(u.tile)).map(u=>u.seat===seat ? u :
    publicShape(u,['id','seat','type','tile','hp','maxHp','maxMoves']));
  // A founder remembers their first capital even after losing sight of it.
  // Campaigns predating the settler opening began with a capital for every seat.
  const hasFoundedCapital=state.opening!=='settlers' || state.cities.some(city=>city.originalSeat===seat);
  const view={...publicShape(state,['rulesVersion','opening','mapId','mapShape','mapSize','scoreTarget','practice','difficulty','firstSeat','naturalWonderVersion','round','turn','phase','victoryReason','winners','wonderRegistry']),
    ...(state.teams ? {teams:[...state.teams]} : {}),
    ...(state.teamPhase ? {teamPhase:publicTeamPhase(state,seat)} : {}),
    actionsLeft:state.turn===seat?state.actionsLeft:0, board,players,cities,units,
    log:state.log.map(e=>observedEvent(e,seat)).filter(Boolean),intel:{seat,hasFoundedCapital,...(state.teams ? {teamSurveyed:surveyed} : {}),visible:[...visible],explored:[...explored],battles:state.battleReports?.[seat] || []}};
  if (state.barbarians) {
    const shown=entries=>(entries||[]).filter(e=>visible.has(e.tile))
      .map(e=>publicShape(e,['id','tile','type','hp','maxHp']));
    view.barbarians={camps:shown(state.barbarians.camps),parties:shown(state.barbarians.parties)};
  }
  return view;
}
