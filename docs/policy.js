// Each faction can fund one program. The saved value is a stable ID, independent of language.
export const POLICIES = {
  balanced: {name:'Balanced budget', description:'Standard city yields with no program funded.'},
  contracts: {name:'Public contracts', civic:'publicWorks', description:'Each city gains 2 production and loses 1 food.'},
  lectures: {name:'Public lectures', civic:'charter', description:'Each city gains 1 culture and loses 1 science.'},
  relief: {name:'Food relief', civic:'irrigationDistricts', description:'Each city gains 2 food and loses 1 production.'},
  portDues: {name:'Port concessions', civic:'harborCommission', description:'Each harbor earns 3 capital. Every city loses 1 influence.'},
  grants: {name:'Research fellowships', civic:'normalSchools', description:'Each city gains 2 science and spends 2 capital per turn.'}
};

export function policyOptions(state, seat) {
  const player=state.players[seat];
  const active=player.policy || 'balanced';
  const fee=player.policyRound == null ? 0 : 3;
  const hasCity=state.cities.some(c=>c.seat===seat);
  return Object.entries(POLICIES).map(([id,program])=>{
    const current=id===active;
    let reason='';
    if (state.phase!=='playing') reason='The campaign has ended.';
    else if (state.turn!==seat) reason='Wait for your turn.';
    else if (current) reason='In force';
    else if (program.civic && !player.civics?.includes(program.civic)) reason='Civic required';
    else if (!hasCity) reason='Found a city first.';
    else if (player.policyRound===state.round) reason='The assembly has already voted this turn.';
    else if (player.influence<fee) reason='You need 3 influence.';
    return {id,...program,current,fee,reason,enabled:!reason};
  });
}

export function ratifyPolicy(state, seat, id) {
  const option=policyOptions(state,seat).find(p=>p.id===id);
  if (!option?.enabled) throw new Error(option?.reason || 'Choose an available policy.');
  const player=state.players[seat];
  player.policy=id;
  player.policyRound=state.round;
  player.influence-=option.fee;
  return option.name;
}
