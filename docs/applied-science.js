import {allowsScience} from './victory-rules.js';
// Technology IDs are persisted with each civilization. The branch catalog also
// supplies English labels and effects to the research council.
export const appliedScience = {
  cartography: {
    name:'Topographic Mapping', era:'industrial', requires:['civics'], cost:14,
    description:'Scouts and mounted scouts spend one movement point to enter foothills.'
  },
  agriculturalScience: {
    name:'Crop Rotation', era:'industrial', requires:['agronomy'], cost:15,
    description:'Each working farm or orchard supplies 1 extra food to its city.'
  },
  metallurgy: {
    name:'Industrial Metallurgy', era:'industrial', requires:['industry'], cost:18,
    description:'Connected iron mines and stone quarries supply 2 extra production to the city they serve.'
  },
  hydrography: {
    name:'Hydrographic Charts', era:'industrial', requires:['navigation'], cost:15,
    description:'Ships and fishing crews gain 1 movement point when their next turn begins.'
  },
  fieldMedicine: {
    name:'Field Medicine', era:'industrial', requires:['agronomy','tactics'], cost:19,
    description:'Land combat units resting on friendly territory outside a city recover 6 health at the start of their turn.'
  },
  railways: {
    name:'District Railways', era:'modern', requires:['steam','cartography'], cost:27,
    description:'Ground units spend only 1 movement between friendly districts, including bridge crossings.'
  },
  radar: {
    name:'Coastal Radar', era:'modern', requires:['hydrography','radio'], cost:29,
    description:'Each working harbor observes four hexes in every direction from its berth.'
  }
};

// The caller supplies a seat's private view. Resource and military priorities
// depend only on holdings, formations and wounded units the governor can see.
export function nextTechnology(state, seat, threatened, tree) {
  const known=new Set(state.players[seat].technologies);
  const cities=state.cities.filter(city=>city.seat===seat);
  const units=state.units.filter(unit=>unit.seat===seat);
  const holdings=Object.values(state.board).filter(tile=>tile.owner===seat && !tile.pillaged);
  const fleet=cities.some(city=>city.buildings.includes('harbor'));
  const crops=holdings.some(tile=>tile.improvement==='farm' || tile.improvement==='orchard');
  const minerals=holdings.some(tile=>(tile.improvement==='mine' && tile.resource==='iron')
    || (tile.improvement==='quarry' && tile.resource==='stone'));
  const hurt=units.some(unit=>unit.hp < unit.maxHp*0.7);
  const surveyors=units.some(unit=>unit.type==='scout' || unit.type==='cavalry');
  const unmapped=state.intel.explored.length < Object.keys(state.board).length*0.7;
  const opening=['industry','agronomy','tactics','civics'][state.players[seat].faction];
  const priorities=[
    threatened && 'tactics',
    ...(state.victoryMode==='science' ? ['industry','steam','radio','tactics','ballistics','motorization','rocketry'] : []),
    !known.size && opening,
    ...(fleet ? ['navigation','hydrography'] : []),
    ...(hurt && threatened ? ['agronomy','tactics','fieldMedicine','ballistics'] : []),
    ...(minerals ? ['industry','metallurgy'] : []),
    ...(crops ? ['agronomy','agriculturalScience'] : []),
    ...(surveyors && unmapped && (opening==='civics' || state.round>=6) ? ['civics','cartography'] : []),
    'industry','steam','tactics','ballistics',
    ...(fleet ? ['radio','radar'] : []),
    ...(cities.length>1 ? ['civics','cartography','railways'] : []),
    'motorization','radio',allowsScience(state) && 'rocketry',...Object.keys(tree)
  ];
  return priorities.find(id=>id && (id!=='rocketry' || allowsScience(state)) && !known.has(id) && tree[id].requires.every(key=>known.has(key)));
}
