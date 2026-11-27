// University names are historical inspirations. Their host city belongs to this campaign.
export const WONDERS = {
  ucla: {specialty:'culture', terrain:['urban','coast'], name:'UCLA', civic:'charter', required:18, science:1, culture:3,
    description:'A public arts campus generating 3 culture and 1 science per turn.'},
  stanford: {specialty:'production', terrain:['plains','urban'], name:'Stanford University', tech:'industry', required:22, science:2, production:2,
    description:'An engineering quad generating 2 production and 2 science per turn.'},
  berkeley: {specialty:'science', terrain:['forest','hills'], name:'UC Berkeley', civic:'conservation', required:21, science:4,
    description:'A public research campus generating 4 science per turn.'},
  caltech: {specialty:'science', terrain:['hills','plains'], name:'Caltech', tech:'steam', required:25, science:5,
    description:'A research observatory generating 5 science per turn.'}
};

export function universityYield(city, yieldName) {
  return city.buildings.reduce((total, item) => total + (WONDERS[item]?.[yieldName] || 0) + Number(city.campusHonors?.includes(item) && WONDERS[item]?.specialty===yieldName || false), 0);
}

export function universitiesUnlockedBy(project) {
  return Object.values(WONDERS).filter(w => (w.tech || w.civic) === project).map(w => w.name);
}

// Screen, AI and authoritative orders use the same catalogue of possible sites.
export function surveyCampus(state, city, item, map, distance) {
  const campus=WONDERS[item];
  if (!city || !campus) return [];
  const reserved=new Set(state.cities.flatMap(c=>[c.tile,c.portTile,c.queue?.site]).filter(Boolean));
  const sites=[];
  for (const [id,holding] of Object.entries(state.board)) {
    if (holding.owner!==city.seat || holding.improvement || holding.resource || holding.wonder || reserved.has(id)) continue;
    const tile=map.byId[id], range=distance(city.tile,id);
    if (range>2 || !tile || ['ocean','mountains'].includes(tile.terrain)) continue;
    const favored=campus.terrain.includes(tile.terrain);
    sites.push({id,name:tile.name,q:tile.q,r:tile.r,range,terrain:tile.terrain,favored});
  }
  return sites.sort((a,b)=>Number(b.favored)-Number(a.favored)||a.range-b.range||a.r-b.r||a.q-b.q);
}
