import {seatMayOrder} from './team-turns.js';

export const CHARTERS = {
  growers:{name:'Growers’ cooperative',building:'granary',description:'The granary supplies 3 additional food each harvest.',food:3},
  machinists:{name:'Machinists’ guild',building:'workshop',description:'The workshop supplies 3 additional production each harvest.',production:3},
  merchants:{name:'Merchants’ exchange',building:'monument',description:'The monument attracts merchants, earning 3 gold and 1 influence each harvest.',capital:3,influence:1}
};

export function charterOptions(state,seat,city) {
  if (state.campaignVariety!==1 || city?.seat!==seat || (state.intel && state.intel.seat!==seat)) return [];
  return Object.entries(CHARTERS).map(([id,charter])=>{
    let reason='';
    if (city.charter) reason=city.charter===id ? 'Charter in force' : 'This city has already granted its charter.';
    else if (city.population<2) reason='The city needs two residents.';
    else if (!city.buildings.includes(charter.building)) reason={
      granary:'Build a granary first.',workshop:'Build a workshop first.',monument:'Build a monument first.'
    }[charter.building];
    else if (!seatMayOrder(state,seat)) reason='Wait for your turn.';
    else if (state.players[seat].capital<18) reason='The charter requires 18 gold.';
    return {id,...charter,reason};
  });
}

export function grantCharter(state,seat,city,id) {
  const option=charterOptions(state,seat,city).find(row=>row.id===id);
  if (!option || option.reason) throw new Error(option?.reason || 'Choose a charter for one of your cities.');
  state.players[seat].capital-=18;
  city.charter=id;
}

export function charterBenefit(state,city) {
  return state.campaignVariety===1 && CHARTERS[city.charter];
}

export function proposeCharter(state,seat) {
  if (state.campaignVariety!==1 || state.players[seat].capital<42) return null;
  const cities=state.cities.filter(city=>city.seat===seat && !city.charter);
  for (const city of cities) {
    const choices=charterOptions(state,seat,city).filter(row=>!row.reason);
    const priorities=city.focus==='food' ? ['growers','machinists','merchants'] :
      ['machinists','merchants','growers'];
    const item=priorities.find(id=>choices.some(option=>option.id===id));
    if (item) return {type:'cityCharter',city:city.id,item};
  }
  return null;
}
