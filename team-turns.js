import {getTeamId} from './teams.js';

// The opening draw determines a stable cycle of teams, even after its
// original seat is eliminated or its teammates have nonconsecutive seats.
export function initiativeOrder(state) {
  const {players,firstSeat=0}=state;
  return players.map((_,offset)=>(firstSeat+offset)%players.length);
}

export function nextTeamPhase(state) {
  const seats=initiativeOrder(state);
  const teams=[...new Set(seats.map(seat=>getTeamId(state,seat)))];
  const current=teams.indexOf(state.teamPhase.team);
  for (let step=1;step<=teams.length;step++) {
    const team=teams[(current+step)%teams.length];
    if(seats.some(seat=>getTeamId(state,seat)===team && !state.players[seat].eliminated)){
      return {team,wrap:current+step>=teams.length};
    }
  }
  return null;
}

export function newTeamPhase(state,team,ordersFor) {
  return {team,readySeats:[],
    orders:state.players.map((p,seat)=>!p.eliminated && getTeamId(state,seat)===team ? ordersFor(seat) : 0),
    sequence:state.players.map(()=>0)};
}

export function activeTeamSeats(state) {
  if(state.phase!=='playing')return [];
  const phase=state.teamPhase;
  if(!phase)return [state.turn];
  if(phase.activeSeats)return phase.activeSeats;
  return initiativeOrder(state).filter(seat=>!state.players[seat].eliminated &&
    getTeamId(state,seat)===phase.team && !phase.readySeats.includes(seat));
}

export function seatMayOrder(state,seat) {
  if (state.intel && state.intel.seat!==seat) return false;
  return state.teamPhase ? activeTeamSeats(state).includes(seat) : state.phase==='playing' && state.turn===seat;
}

export function teamOrderKey(state,seat) {
  if(!state.teamPhase || !seatMayOrder(state,seat))return null;
  const phase=state.teamPhase;
  if (phase.activeSeats) return phase.orderKey;
  return [state.round,phase.team,seat,phase.sequence[seat]].join('.');
}

export function publicTeamPhase(state,seat) {
  return {team:state.teamPhase.team,activeSeats:activeTeamSeats(state),
    readySeats:[...state.teamPhase.readySeats],orderKey:teamOrderKey(state,seat)};
}

// Existing movement, city and policy rules operate on one actor. Give those
// rules a private acting perspective without changing the stored initiative.
export function actingPerspective(state,seat) {
  if(!state?.teamPhase || state.intel || !seatMayOrder(state,seat))return state;
  return {...state,turn:seat,actionsLeft:state.teamPhase.orders[seat]};
}
