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
  for (const unit of state.units) if (unit.seat===seat) reveal(unit.tile,fieldSight);
  for (const city of state.cities) if (city.seat===seat) {
    reveal(city.tile,fieldSight);
    if (city.portTile && city.buildings.includes('harbor') && state.players[seat]?.technologies?.includes('radar')) reveal(city.portTile,4);
  }
  for (const [id,holding] of Object.entries(state.board)) if (holding.owner===seat) visible.add(id);
  return visible;
}

export function getVision(state, seat) {
  const visible=getVisibleTiles(state,seat);
  const explored=new Set(state.intel?.seat===seat ? state.intel.explored : Object.keys(state.exploration?.[seat] || {}));
  for (const id of visible) explored.add(id);
  return {visible,explored};
}

function observedDeposit(state,seat,id) {
  return state.players[seat].surveyEnabled===false ? null : state.board[id].resource ?? null;
}

// Immutable map of previously observed terrain and its deposit, per seat.
// Ownership, military positions and improvements are live intelligence, never remembered as facts.
export function rememberVision(state, previous) {
  if (!state || state.intel) return state;
  const sights=state.players.map((_,seat)=>getVisibleTiles(state,seat));
  const discoveries=[];
  const exploration=sights.map((visible,seat)=>{
    const old=state.exploration?.[seat] || {};
    let known=old;
    for(const id of visible) {
      const wonder=state.board[id].naturalWonder;
      if(wonder && !Object.hasOwn(old,id))discoveries.push({round:state.round,seat,type:'discovery',tile:id,wonder,text:'Discovered '+NATURAL_WONDERS[wonder].name+'.'});
      const resource=observedDeposit(state,seat,id);
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
  const {visible,explored}=getVision(state,seat);
  const memory=state.exploration?.[seat] || {};
  const board=Object.fromEntries(Object.entries(state.board).map(([id,cell])=>{
    if(visible.has(id)) {
      const {resource,...fields}=cell;
      if (resource && state.players[seat].surveyEnabled!==false) fields.resource=resource;
      return [id,fields];
    }
    const cellMemory={owner:null,level:0,improvement:null};
    if(explored.has(id) && cell.naturalWonder)cellMemory.naturalWonder=cell.naturalWonder;
    if (memory[id] && state.players[seat].surveyEnabled!==false) cellMemory.resource=memory[id];
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
    actionsLeft:state.turn===seat?state.actionsLeft:0, board,players,cities,units,
    log:state.log.map(e=>observedEvent(e,seat)).filter(Boolean),intel:{seat,hasFoundedCapital,visible:[...visible],explored:[...explored],battles:state.battleReports?.[seat] || []}};
  if (state.barbarians) {
    const shown=entries=>(entries||[]).filter(e=>visible.has(e.tile))
      .map(e=>publicShape(e,['id','tile','type','hp','maxHp']));
    view.barbarians={camps:shown(state.barbarians.camps),parties:shown(state.barbarians.parties)};
  }
  return view;
}
