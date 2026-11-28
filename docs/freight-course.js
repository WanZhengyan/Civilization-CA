// Plan only from the captain's projected chart. A remembered channel can be
// charted, but only the normal move preview can authorize sailing its next leg.
import {getFreightManifest,getMap} from './rules.js';
import {seatMayOrder} from './team-turns.js';
import {voyageAllowance} from './voyage-stores.js';
import {waterDistances} from './water-navigation.js';

export function freightCourse(state,unit,berth,legalMoves) {
  if(!unit || !state.intel || state.intel.seat!==unit.seat)return null;
  const manifest=getFreightManifest(state,unit);
  const port=manifest?.routes.find(route=>route.berth===berth);
  if(!port)return null;
  const waters=new Set(state.intel.explored);
  const visible=new Set(state.intel.visible);
  const occupants=[...state.units,...(state.barbarians?.parties || []),...(state.barbarians?.camps || [])];
  for(const piece of occupants)if(piece.tile!==unit.tile && visible.has(piece.tile))waters.delete(piece.tile);
  const map=getMap(state);
  const distance=waterDistances(berth,map.byId,map.neighbors,Infinity,waters);
  const steps=distance.get(unit.tile);
  const course={port,path:[],steps,leg:null,unloadRound:null,cargo:manifest.cargo};
  if(steps===undefined)return course;
  const moves=new Set(legalMoves);
  let current=unit.tile;
  course.path.push(current);
  while(current!==berth) {
    const nextSteps=distance.get(current)-1;
    const candidates=map.neighbors(current).filter(id=>distance.get(id)===nextSteps);
    current=candidates.find(id=>moves.has(id)) || candidates[0];
    course.path.push(current);
    if(manifest.cargo && moves.has(current))course.leg=current;
  }
  if(state.phase!=='playing' || !seatMayOrder(state,unit.seat) || (!manifest.cargo && !manifest.ready))return course;
  // Loading uses this turn. Unloading needs one movement point after arrival.
  const now=manifest.cargo ? unit.moves : 0;
  const next=voyageAllowance({...unit,voyageUnderway:unit.voyageStores});
  const afterToday=steps+1-now;
  const turns=afterToday<=0 ? 0 : 1+Math.ceil(Math.max(0,afterToday-next)/unit.maxMoves);
  course.unloadRound=state.round+turns;
  return course;
}
