import {getVisibleTiles} from './vision.js';
import {sameTeam} from './teams.js';
import {seatMayOrder} from './team-turns.js';
import {prepareBattle} from './battle-reports.js';

export const FORTIFICATIONS={
  walls:{name:'City walls',tech:'tactics',era:'frontier',required:14,health:50,
    description:'Built in the city center. Adds 50 city health, reduces incoming damage by 7 and strengthens retaliation.'},
  modernWalls:{name:'Modern fortifications',tech:'motorization',era:'modern',building:'walls',required:38,health:35,
    description:'Upgrades the city center. Adds 35 city health and one battery shot per round for up to 32 damage against visible field forces within two hexes.'}
};
export const cityCenterProject=item=>Object.hasOwn(FORTIFICATIONS,item);

// Before defenses were city-center projects an exterior parcel could carry a
// wall marker. Preserve the building, health and investment while freeing it.
export function restoreCityDefenses(state) {
  if(!state?.cities?.length)return state;
  let cities=state.cities,board=state.board;
  state.cities.forEach((city,index)=>{
    let revised=city;
    for(const item of Object.keys(FORTIFICATIONS)) {
      if(!city.buildings.includes(item) || city.buildingSites?.[item]===city.tile)continue;
      const site=city.buildingSites?.[item],holding=state.board[site];
      if(holding?.facility===item && holding.facilityCity===city.id){
        if(board===state.board)board={...board};
        const {facility,facilityCity,...rest}=board[site];
        board[site]=rest;
      }
      revised={...revised,buildingSites:{...revised.buildingSites,[item]:city.tile}};
    }
    if(city.queue && cityCenterProject(city.queue.item) && city.queue.site!==city.tile){
      revised={...revised,queue:{...city.queue,site:city.tile}};
    }
    if(revised!==city){
      if(cities===state.cities)cities=[...cities];
      cities[index]=revised;
    }
  });
  return cities===state.cities ? state : {...state,cities,board};
}

export function batteryTargets(state,seat,city,distance,units) {
  if(!city || city.seat!==seat || state.phase!=='playing' || !seatMayOrder(state,seat) ||
    (state.intel && state.intel.seat!==seat) || !city.buildings.includes('modernWalls') || city.batteryRound===state.round)return [];
  const visible=getVisibleTiles(state,seat),cityTiles=new Set(state.cities.map(c=>c.tile));
  const enemyUnits=state.units.filter(u=>units[u.type]?.strength>0 && !sameTeam(state,seat,u.seat));
  const parties=state.barbarians?.parties || [];
  return [...enemyUnits,...parties].filter(piece=>piece.hp>0 && visible.has(piece.tile) &&
    !cityTiles.has(piece.tile) && distance(city.tile,piece.tile)<=2).map(piece=>{
    const damage=Math.min(32,piece.hp);
    return {id:piece.id,tile:piece.tile,type:piece.type,seat:piece.seat ?? null,hp:piece.hp,maxHp:piece.maxHp,
      damage,hpAfter:piece.hp-damage,distance:distance(city.tile,piece.tile)};
  }).sort((a,b)=>a.hpAfter-b.hpAfter || a.distance-b.distance || String(a.id).localeCompare(String(b.id)));
}

export function batteryOrder(city,round,target) {
  return {type:'cityBattery',city:city.id,round,tile:target.tile,target:target.id,expectedHp:target.hp};
}

export function reviewedBatteryTarget(targets,action,round) {
  if(action.round!==round)return null;
  return targets.find(t=>t.tile===action.tile && t.id===action.target && t.hp===action.expectedHp);
}

export function fireBattery(state,seat,action,targets,record) {
  const city=state.cities.find(c=>c.id===action.city && c.seat===seat);
  const target=reviewedBatteryTarget(targets,action,state.round);
  if(!city || !target)throw new Error('City battery orders changed. Review the target again.');
  const wild=target.seat===null;
  const group=wild ? state.barbarians.parties : state.units;
  const unit=group.find(u=>u.id===target.id);
  const finish=prepareBattle(state,city,unit,{attackMode:'ranged',defenderType:wild?'wild':'unit',
    attackerHpAfter:city.hp,defenderHpAfterHit:target.hpAfter,damage:target.damage,retaliation:0,defeated:target.hpAfter===0},
    {attackerKind:'city'});
  const survivors=group.flatMap(u=>u.id!==unit.id ? [u] : target.hpAfter ? [{...u,hp:target.hpAfter}] : []);
  if(wild)state.barbarians={...state.barbarians,parties:survivors};
  else state.units=survivors;
  city.batteryRound=state.round;
  record(state,seat,'attack','The city battery fired on a field formation.',target.tile,{city:city.id,from:city.tile,damage:target.damage});
  finish();
}
