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
  }
};
