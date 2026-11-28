import {parkedProduction} from './works.js';

export const victoryModes=Object.freeze(['standard','conquest','science']);
export const validVictoryMode=mode=>victoryModes.includes(mode);
export const allowsScience=state=>state?.victoryMode==='standard' || state?.victoryMode==='science';
export const allowsConquest=state=>!state.practice && state.victoryMode!=='science';

export const SCIENCE_PROJECT=Object.freeze({
  id:'orbitalSurvey',name:'Orbital Survey',era:'modern',tech:'rocketry',required:60,
  description:'Launch a satellite to survey California from orbit. Completing this city project wins a science victory.',
});
export const ROCKETRY=Object.freeze({
  name:'Rocketry',era:'modern',requires:['radio','motorization'],cost:30,
  description:'Unlocks the Orbital Survey city project for a science victory.',
});

// Technology and city queues belong to individual civilizations, including in
// an alliance. Private views report only the receiver’s progress.
export function scienceProgress(state,seat) {
  if(!allowsScience(state) || !state.players?.[seat] || (state.intel && state.intel.seat!==seat))return null;
  const known=state.players[seat].technologies || [];
  let best=null;
  for(const city of state.cities) {
    if(city.seat!==seat)continue;
    const active=city.queue?.item===SCIENCE_PROJECT.id;
    const production=active ? city.queue.progress : parkedProduction(city,SCIENCE_PROJECT.id);
    if(!active && !production)continue;
    if(!best || production>best.production || (production===best.production && active && best.paused)) {
      best={cityName:city.name,production,paused:!active};
    }
  }
  const complete=state.victoryReason==='science' && state.winners?.includes(seat);
  return {hasRocketry:known.includes('rocketry'),
    prerequisites:ROCKETRY.requires.map(id=>({id,complete:known.includes(id)})),
    cityName:complete ? null : best?.cityName ?? null,paused:!complete && Boolean(best?.paused),
    production:complete ? SCIENCE_PROJECT.required : best?.production ?? 0,
    required:SCIENCE_PROJECT.required,complete:Boolean(complete)};
}
