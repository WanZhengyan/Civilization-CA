import {applyAction,chooseBotAction,councilTree,createGame} from '../docs/rules.js';

// Keep stdout as one JSON record per game. --summary adds aggregate JSON to stderr.
const openings={la:624101,sf:624102,sd:624103};
const roundLimit=180;

function play(mapId,difficulty) {
  let state=createGame([{bot:true},{bot:true}],mapId,{seed:openings[mapId],mapSize:'large',difficulty});
  const first={};
  const tracks=[
    ['technology',councilTree(state,'research'),'technologies'],
    ['civic',councilTree(state,'civic'),'civics'],
  ];
  let orders=0;
  while(state.phase==='playing' && state.round<=roundLimit) {
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
  return {mapId,difficulty,seed:openings[mapId],orders,round:state.round,
    outcome:state.victoryReason ?? 'still playing',first,roundLimit,censored:state.phase==='playing'};
}

function observedRounds(values) {
  const observed=values.filter(Number.isFinite).sort((a,b)=>a-b);
  const mid=Math.floor(observed.length/2);
  let median=null;
  if(observed.length)median=observed.length%2 ? observed[mid] : (observed[mid-1]+observed[mid])/2;
  return {reached:observed.length,medianAmongReached:median};
}

const results=[];
for(const mapId of Object.keys(openings)) {
  for(const difficulty of ['easy','normal','hard']) {
    const result=play(mapId,difficulty);
    results.push(result);
    console.log(JSON.stringify(result));
  }
}
if(process.argv.includes('--summary')) {
  // A conquest can end a match before Rocketry. Only games reaching each
  // milestone contribute a time for it; retain the count as its denominator.
  const milestones={};
  for(const key of ['technology-industrial','technology-modern','civic-industrial','civic-modern','rocketry']) {
    milestones[key]=observedRounds(results.map(result=>result.first[key]));
  }
  const completed=results.filter(result=>!result.censored);
  console.error(JSON.stringify({games:results.length,roundLimit,unfinished:results.length-completed.length,
    finish:observedRounds(completed.map(result=>result.round)),milestones}));
}
