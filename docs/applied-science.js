// Technology IDs are persisted with each civilization. The branch catalog also
// supplies English labels and effects to the research council.
export const appliedScience = {
  cartography: {
    name:'Topographic Mapping', era:'industrial', requires:['civics'], cost:9,
    description:'Scouts and mounted scouts observe one additional ring of hexes.'
  },
  agriculturalScience: {
    name:'Crop Rotation', era:'industrial', requires:['agronomy'], cost:10,
    description:'Each working farm or orchard supplies 1 extra food to its city.'
  },
  metallurgy: {
    name:'Industrial Metallurgy', era:'industrial', requires:['industry'], cost:12,
    description:'Connected iron mines and stone quarries supply 2 extra production to the city they serve.'
  },
  hydrography: {
    name:'Hydrographic Charts', era:'industrial', requires:['navigation'], cost:10,
    description:'Ships and fishing crews gain 1 movement point when their next turn begins.'
  },
  fieldMedicine: {
    name:'Field Medicine', era:'industrial', requires:['agronomy','tactics'], cost:11,
    description:'Land combat units resting on friendly territory outside a city recover 6 health at the start of their turn.'
  },
  railways: {
    name:'District Railways', era:'modern', requires:['steam','cartography'], cost:14,
    description:'Ground units spend only 1 movement between friendly districts, including bridge crossings.'
  },
  radar: {
    name:'Coastal Radar', era:'modern', requires:['hydrography','radio'], cost:14,
    description:'Each working harbor observes four hexes in every direction from its berth.'
  }
};
