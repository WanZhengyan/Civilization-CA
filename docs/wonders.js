// University names are historical inspirations. Their host city belongs to this campaign.
export const WONDERS = {
  ucla: {name:'UCLA', civic:'charter', required:18, science:1, culture:3,
    description:'A public arts campus generating 3 culture and 1 science per turn.'},
  stanford: {name:'Stanford University', tech:'industry', required:22, science:2, production:2,
    description:'An engineering quad generating 2 production and 2 science per turn.'},
  berkeley: {name:'UC Berkeley', civic:'conservation', required:21, science:4,
    description:'A public research campus generating 4 science per turn.'},
  caltech: {name:'Caltech', tech:'steam', required:25, science:5,
    description:'A research observatory generating 5 science per turn.'}
};

export function universityYield(city, yieldName) {
  return city.buildings.reduce((total, item) => total + (WONDERS[item]?.[yieldName] || 0), 0);
}

export function universitiesUnlockedBy(project) {
  return Object.values(WONDERS).filter(w => (w.tech || w.civic) === project).map(w => w.name);
}
