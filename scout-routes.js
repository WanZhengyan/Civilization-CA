import {trainedAs} from './unit-service.js';
import {sightFrom} from './vision.js';
import {getRouteDetail} from './rules.js';

// The shape of the playable chart is public. Never inspect the contents of fogged hexes.
export function unchartedFrom(state,tile,explored) {
  return sightFrom(state,tile).filter(id=>!explored.has(id));
}

export function scoutingRoutes(state,unit,targets) {
  if(!trainedAs(unit,'scout') || state.intel?.seat!==unit.seat)return [];
  const explored=new Set(state.intel.explored);
  const routes=[];
  for(const tile of targets) {
    const route=getRouteDetail(state,unit.id,tile);
    if(route)routes.push({tile,cost:route.cost,left:unit.moves-route.cost,newHexes:unchartedFrom(state,tile,explored).length});
  }
  return routes.sort((a,b)=>b.newHexes-a.newHexes || a.cost-b.cost || a.tile.localeCompare(b.tile));
}

export function openScoutingRoutes(rows,map,escapeHTML,review) {
  if(!rows.length)return;
  const dialog=document.createElement('dialog');
  dialog.className='order-dialog scout-routes';
  dialog.setAttribute('aria-labelledby','scout-routes-title');
  const buttons=rows.map(({tile,cost,left,newHexes})=>
    '<button type="button" data-site="'+escapeHTML(tile)+'"><span><strong>'+escapeHTML(map.byId[tile].name)+'</strong> <small>'+escapeHTML(tile)+'</small></span>'+
      '<span><b>'+newHexes+'</b> <span>'+(newHexes===1?'new hex':'new hexes')+'</span></span><small><span>Move cost</span> '+cost+' · <span>Remaining movement</span> '+left+'</small></button>').join('');
  dialog.innerHTML='<div class="modal-shell"><div class="modal-head"><h2 class="modal-title" id="scout-routes-title">Scouting routes</h2>'+
    '<button type="button" data-close class="modal-close" aria-label="Close dialog">×</button></div>'+
    '<div class="modal-body"><p class="panel-note">Select a destination to preview it on the map. Each dotted hex will be added to your chart when the scout arrives.</p>'+
    '<div class="scout-destinations">'+buttons+'</div></div></div>';
  document.body.append(dialog);
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  dialog.onclick=event=>{
    const button=event.target.closest('button');
    if(!button)return;
    dialog.close();
    if(button.dataset.site)review(button.dataset.site);
  };
  dialog.showModal();
}
