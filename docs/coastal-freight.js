import {sameTeam} from './teams.js';
import {waterDistances} from './water-navigation.js';

const foodPerCrate=4;
export function alliedFreightPorts(state,seat,visible) {
  if(state.campaignVariety!==1)return [];
  return state.cities.filter(c=>c.seat!==seat && sameTeam(state,seat,c.seat) && c.buildings.includes('harbor') && visible.has(c.portTile))
    .map(({id,seat,name,portTile})=>({id,seat,name,portTile}));
}

export function freightManifest(state,unit,map,vision,distance) {
  if(state.campaignVariety!==1 || unit.type!=='workboat' || unit.fishCargo)return null;
  const {visible,explored}=vision;
  const own=state.cities.filter(c=>c.seat===unit.seat && c.portTile && c.buildings.includes('harbor'));
  const allies=state.intel?.alliedFreightPorts ?? alliedFreightPorts(state,unit.seat,visible);
  const ports=[...own,...allies],here=ports.find(c=>c.portTile===unit.tile);
  const cargo=unit.freight;
  const origin=cargo || (here?.seat===unit.seat ? here : null);
  if(!origin)return null;
  const distances=waterDistances(unit.tile,map.byId,map.neighbors,Infinity,explored);
  const routes=ports.filter(c=>c.id!==origin.id && distances.has(c.portTile)).map(c=>({
    id:c.id,name:c.name,berth:c.portTile,steps:distances.get(c.portTile),gold:Math.min(8,2+distance(origin.portTile,c.portTile))
  })).sort((a,b)=>a.steps-b.steps || a.id.localeCompare(b.id));
  const delivery=cargo && routes.find(r=>r.id===here?.id);
  const type=!cargo?'loadFreight':delivery?'landFreight':here?.id===cargo.id?'returnFreight':null;
  const ready=Boolean(unit.moves && (cargo ? type : routes.length && here.food>=foodPerCrate));
  return {origin,cargo:Boolean(cargo),routes,delivery,type,ready,food:foodPerCrate};
}

export function carryFreight(state,unit,action,manifest) {
  if(!manifest?.ready || action.type!==manifest.type)throw new Error('Review the cargo and charted friendly harbors before giving this order.');
  const city=state.cities.find(c=>c.portTile===unit.tile && sameTeam(state,c.seat,unit.seat) && c.buildings.includes('harbor'));
  if(action.type==='loadFreight'){
    city.food-=foodPerCrate;
    unit.freight={id:city.id,name:city.name,portTile:city.portTile};
  }else{
    city.food+=foodPerCrate;
    state.players[unit.seat].capital+=manifest.delivery?.gold || 0;
    delete unit.freight;
  }
  unit.moves=0;
}
