import {getRouteDetail} from './rules.js';

export function previewMove(state,unit,target) {
  const route=unit && getRouteDetail(state,unit.id,target);
  if (!route) return null;
  return {unit:unit.id,round:state.round,tile:target,path:route.path,cost:route.cost,left:unit.moves-route.cost};
}

// A teammate may block a route while the player is looking at the quote.
export function sameMove(a,b) {
  return Boolean(a && b && a.unit===b.unit && a.round===b.round && a.tile===b.tile &&
    a.cost===b.cost && a.left===b.left && a.path.length===b.path.length && a.path.every((id,i)=>id===b.path[i]));
}

export function reviewPointerMove(pointer,compact) {
  return pointer==='touch' || pointer==='pen' || (pointer==='mouse' && compact);
}
