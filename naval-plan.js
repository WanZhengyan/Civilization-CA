import {waterKind,waterDistances} from './water-navigation.js';

export function fleetBasin(state,city,berth,map) {
  const charted=new Set(state.intel.explored);
  const tiles=waterDistances(berth,map.byId,map.neighbors,8,charted);
  const local=state.units.filter(u=>u.seat===city.seat && (u.launchedFrom===city.id || tiles.has(u.tile)));
  const count=type=>local.filter(u=>u.type===type).length+state.cities.filter(c=>c.seat===city.seat && c.queue?.item===type &&
    (c.id===city.id || tiles.has(c.portTile))).length;
  const available=[...tiles.keys()].filter(id=>id!==berth && state.intel.visible.includes(id) &&
    !state.intel.visibleBerths.includes(id) && !state.board[id].naturalWonder && !state.board[id].improvement &&
    (state.board[id].owner==null || state.board[id].owner===city.seat));
  const warships=['cutter','frigate','ironclad','destroyer'];
  const armed=warships.reduce((total,type)=>total+count(type),0);
  return {count,armed,available,tiles,score:Math.min(tiles.size,10)+available.reduce((n,id)=>n+
    Number(state.board[id].resource==='fish')*4+Number(waterKind(map.byId[id])!=='sea'),0)};
}

// Navigate known channels, including bends that initially run away from the
// destination. Orders can only select a tile exposed by the rules' move list.
export function sailTo(state,unit,moves,goals,map) {
  if(!goals.length || !moves.length || goals.includes(unit.tile))return null;
  const charted=new Set(state.intel.explored),cost=new Map(),search=[];
  for(const id of goals)if(charted.has(id) && waterKind(map.byId[id]) && !cost.has(id)){cost.set(id,0);search.push(id);}
  for(let i=0;i<search.length;i++){
    const here=search[i];
    for(const next of map.neighbors(here)){
      if(cost.has(next)||!charted.has(next)||!waterKind(map.byId[next]))continue;
      cost.set(next,cost.get(here)+1);search.push(next);
    }
  }
  let best=unit.tile;
  for(const id of moves)if((cost.get(id)??Infinity)<(cost.get(best)??Infinity))best=id;
  return best===unit.tile?null:{type:'move',unit:unit.id,tile:best};
}

export function flotillaMove(state,unit,moves,map,defs,distance,allied,fisheryOrder) {
  const charted=new Set(state.intel.explored);
  const basin=waterDistances(unit.tile,map.byId,map.neighbors,Infinity,charted);
  const water=[...basin.keys()];
  const ports=state.cities.filter(c=>c.seat===unit.seat && c.portTile && c.buildings.includes('harbor'));
  const course=goals=>sailTo(state,unit,moves,goals,map);
  const occupied=new Set(state.units.filter(u=>u.id!==unit.id).map(u=>u.tile));
  if(unit.type==='workboat'){
    if(unit.fishCargo)return course(ports.map(c=>c.portTile).filter(id=>!occupied.has(id)));
    const accessible=water.filter(id=>state.intel.visible.includes(id) && !occupied.has(id));
    const grounds=accessible.filter(id=>fisheryOrder(id));
    const shoals=accessible.filter(id=>state.board[id].resource==='fish' || state.board[id].improvement==='fishery');
    if(unit.charges<2 && shoals.length){
      const owned=shoals.filter(id=>state.board[id].owner===unit.seat && state.board[id].improvement==='fishery');
      return course(owned.length?owned:shoals);
    }
    if(grounds.length){
      const rich=grounds.filter(id=>state.board[id].resource==='fish');
      return course(rich.length?rich:grounds);
    }
  }else{
    const targets=[...state.units,...state.cities].filter(o=>!allied(state,unit.seat,o.seat));
    if(targets.length){
      const range=defs[unit.type].range;
      const approach=water.filter(id=>!occupied.has(id) && targets.some(t=>distance(id,t.tile)<=range));
      const move=course(approach);
      if(move || approach.includes(unit.tile))return move;
    }
  }
  const frontier=water.filter(id=>map.neighbors(id).some(n=>!charted.has(n)));
  return course(frontier);
}
