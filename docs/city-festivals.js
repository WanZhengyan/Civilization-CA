import {seatMayOrder} from './team-turns.js';

export const FESTIVALS={
  crafts:{name:'Craft exhibition',art:'workshop',description:'Each of the next three harvests adds 3 production to the city and 1 culture to the council.',production:3,culture:1},
  market:{name:'Market days',art:'granary',description:'Each of the next three harvests earns 5 gold and 1 influence.',capital:5,influence:1},
  heritage:{name:'Heritage festival',art:'monument',description:'Each of the next three harvests earns 2 culture and 2 influence.',culture:2,influence:2}
};

export function festivalOptions(state,seat,city) {
  if(state.campaignVariety!==1 || city?.seat!==seat || (state.intel && state.intel.seat!==seat) || !state.players[seat].civics.includes('charter')) return [];
  let reason='';
  if(city.festival) reason='A festival is already underway.';
  else if(city.festivalRecovery>0) reason='Festival preparations are still underway.';
  else if (!seatMayOrder(state,seat)) reason='Wait for your turn.';
  else if(city.population<2) reason='The city needs two residents.';
  else if(city.food<4) reason='Save 4 food in this city.';
  else if(state.players[seat].capital<8) reason='The festival requires 8 gold.';
  return Object.entries(FESTIVALS).map(([id,entry])=>({id,...entry,reason}));
}

export function openFestival(state,seat,city,id) {
  const option=festivalOptions(state,seat,city).find(row=>row.id===id);
  if(!option || option.reason) throw new Error(option?.reason || 'Choose an available city festival.');
  state.players[seat].capital-=8;
  city.food-=4;
  city.festival=id;
  city.festivalHarvests=3;
}

export function festivalBenefit(state,city) {
  return state.campaignVariety===1 && city.festivalHarvests>0 && FESTIVALS[city.festival];
}

// Count the owner's harvests, including when allies settle their economies together.
export function endFestivalHarvest(state,city) {
  if(state.campaignVariety!==1) return;
  if(city.festivalHarvests>0) {
    city.festivalHarvests--;
    if(city.festivalHarvests===0) {
      delete city.festival;
      delete city.festivalHarvests;
      city.festivalRecovery=3;
    }
  } else if(city.festivalRecovery>0 && --city.festivalRecovery===0) {
    delete city.festivalRecovery;
  }
}

export function proposeFestival(state,seat) {
  const player=state.players[seat];
  if(state.campaignVariety!==1 || !player.civics.includes('charter') || player.capital<30) return null;
  for(const city of state.cities) {
    if(city.seat!==seat || city.population<3 || city.food<8) continue;
    const options=festivalOptions(state,seat,city);
    if(!options.length || options[0].reason) continue;
    const item=city.queue && city.queue.required-city.queue.progress>=9 ? 'crafts' : player.civic ? 'heritage' : 'market';
    return {type:'cityFestival',city:city.id,item};
  }
  return null;
}
