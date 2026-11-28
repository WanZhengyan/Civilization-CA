import {trainedAs} from './unit-service.js';
import {unchartedFrom} from './scout-routes.js';
import {getRouteDetail} from './rules.js';

export function previewMove(state,unit,target) {
  const route=unit && getRouteDetail(state,unit.id,target);
  if (!route) return null;
  const frontier=trainedAs(unit,'scout') && state.intel?.seat===unit.seat
    ? unchartedFrom(state,target,new Set(state.intel.explored)) : undefined;
  return {frontier,unit:unit.id,round:state.round,tile:target,path:route.path,cost:route.cost,left:unit.moves-route.cost};
}

// A teammate may block a route while the player is looking at the quote.
export function sameMove(a,b) {
  return Boolean(a && b && a.unit===b.unit && a.round===b.round && a.tile===b.tile &&
    a.frontier?.length===b.frontier?.length && (!a.frontier || a.frontier.every((id,i)=>id===b.frontier[i])) &&
    a.cost===b.cost && a.left===b.left && a.path.length===b.path.length && a.path.every((id,i)=>id===b.path[i]));
}

export function reviewPointerMove(pointer,compact,guided=false) {
  return guided || pointer==='touch' || pointer==='pen' || (pointer==='mouse' && compact);
}
