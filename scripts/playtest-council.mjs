import {applyAction,chooseBotAction,createGame,TECHS,CIVICS} from '../docs/rules.js';

// Use the same terrain, civilizations and opening strength at every AI level.
const openings={la:624101,sf:624102,sd:624103};
function play(mapId,difficulty) {
  let state=createGame([{bot:true},{bot:true}],mapId,{seed:openings[mapId],mapSize:'large',difficulty});
  const first={},tracks=[['technology',TECHS,'technologies'],['civic',CIVICS,'civics']];
  let orders=0;
  while(state.phase==='playing' && state.round<=80) {
    const before=state,seat=state.turn;
    state=applyAction(state,seat,chooseBotAction(state));
    orders++;
    for(const [track,catalog,known] of tracks) {
      for(const id of state.players[seat][known].slice(before.players[seat][known].length)) {
        first[track+'-'+catalog[id].era]??=before.round;
        first[catalog[id].era]??=before.round;
        if(id==='rocketry')first.rocketry??=before.round;
      }
    }
  }
  return {mapId,difficulty,seed:openings[mapId],orders,round:state.round,outcome:state.victoryReason ?? 'still playing',first};
}
for(const mapId of Object.keys(openings)) {
  for(const difficulty of ['easy','normal','hard'])console.log(JSON.stringify(play(mapId,difficulty)));
}
