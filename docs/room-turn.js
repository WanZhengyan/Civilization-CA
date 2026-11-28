// Online games send a seat-specific view. Saved sequential campaigns continue
// to use their single turn index.
export function roomSeatTurn(state,seat) {
  if(!state || state.phase!=='playing') return 'closed';
  const phase=state.teamPhase;
  if(!phase) return state.turn===seat?'active':'waiting';
  if(phase.activeSeats.includes(seat)) return 'active';
  if(phase.readySeats.includes(seat)) return 'ready';
  return 'waiting';
}

export function isComputerActing(state) {
  if(!state || state.phase!=='playing') return false;
  return state.teamPhase
    ? state.teamPhase.activeSeats.some(seat=>state.players[seat]?.bot)
    : Boolean(state.players[state.turn]?.bot);
}

export function captureRoomOrder(room,action) {
  const orderKey=room.game?.teamPhase?.orderKey;
  const defender=orderKey && action.type==='attack' ? room.game.intel?.forecasts?.[action.unit]?.[action.tile]?.defenderId : null;
  const order=defender!=null ? {...action,defenderId:defender} : action;
  return {op:'action',code:room.code,revision:room.revision,action:order,...(orderKey && {orderKey})};
}

export function teamTurnLabels(state,seat) {
  const phase=state?.teamPhase;
  if(!phase || state.phase!=='playing') return null;
  const status=roomSeatTurn(state,seat);
  if(status==='active') return {owner:'Your team is playing',button:'Mark ready'};
  if(status==='ready') return {owner:'Ready for next team',button:'Waiting for allies…'};
  return {owner:'Team '+'ABCD'[phase.team],button:'Waiting…'};
}

export function teamMemberStatus(state,seat) {
  if(!state?.teamPhase || state.phase!=='playing') return '';
  if(state.players[seat]?.eliminated) return 'Eliminated';
  return {active:'Taking orders',ready:'Ready',waiting:'Waiting for team turn'}[roomSeatTurn(state,seat)];
}

// An interrupted request can be submitted again only with the original
// per-seat key. A new key belongs to a later order, even within the same round.
export function mayResumeOrder(room,request) {
  return !!(request?.orderKey && room?.code===request.code && room.phase==='playing' &&
    room.game?.teamPhase?.orderKey===request.orderKey && roomSeatTurn(room.game,room.you)==='active');
}
