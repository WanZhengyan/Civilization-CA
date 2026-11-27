// Historical campaigns have a separate team for every seat.
export function getTeamId(state,seat) {
  return Number.isInteger(seat) && state.players[seat] ? state.teams?.[seat] ?? seat : null;
}

export function sameTeam(state,first,second) {
  const team=getTeamId(state,first);
  return team!==null && team===getTeamId(state,second);
}

export function teamLabel(id) { return 'Team '+'ABCD'[id]; }
