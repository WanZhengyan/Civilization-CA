// University names are historical inspirations. Their host city belongs to this campaign.
export const WONDERS = {
  ucla: {grant:5, specialty:'culture', terrain:['urban','coast'], name:'UCLA', civic:'charter', required:18, science:1, culture:3,
    description:'A public arts campus generating 3 culture and 1 science per turn.'},
  stanford: {grant:7, specialty:'production', terrain:['plains','urban'], name:'Stanford University', tech:'industry', required:22, science:2, production:2,
    description:'An engineering quad generating 2 production and 2 science per turn.'},
  berkeley: {grant:6, specialty:'science', terrain:['forest','hills'], name:'UC Berkeley', civic:'conservation', required:21, science:4,
    description:'A public research campus generating 4 science per turn.'},
  caltech: {grant:8, specialty:'science', terrain:['hills','plains'], name:'Caltech', tech:'steam', required:25, science:5,
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
    if (holding.owner!==city.seat || holding.improvement || holding.resource || holding.naturalWonder || holding.wonder || reserved.has(id)) continue;
    const tile=map.byId[id], range=distance(city.tile,id);
    if (range>2 || !tile || ['ocean','mountains'].includes(tile.terrain)) continue;
    const favored=campus.terrain.includes(tile.terrain);
    sites.push({id,name:tile.name,q:tile.q,r:tile.r,range,terrain:tile.terrain,favored});
  }
  return sites.sort((a,b)=>Number(b.favored)-Number(a.favored)||a.range-b.range||a.r-b.r||a.q-b.q);
}

export function campusStatus(state,item) {
  if (state.wonderRegistry?.[item]==='complete' || state.cities.some(c=>c.buildings.includes(item))) return 'complete';
  if (state.wonderRegistry?.[item]==='commissioned' || state.cities.some(c=>c.queue?.item===item)) return 'commissioned';
  return 'open';
}

export function updateCampusRegistry(state) {
  // Availability is public. Host cities, positions and queue progress are private to each view.
  const registry={};
  for (const city of state.cities) {
    if (WONDERS[city.queue?.item]) registry[city.queue.item]='commissioned';
  }
  for (const city of state.cities) {
    for (const id of city.buildings) if (WONDERS[id]) registry[id]='complete';
  }
  state.wonderRegistry=registry;
}

export function settleCampusRace(state, winner, item, record) {
  for (const city of state.cities) {
    const project=city.queue;
    if (city.id===winner.id || project?.item!==item) continue;
    const refund=project.grant||0;
    state.players[city.seat].capital+=refund;
    city.queue=null;
    record(state,city.seat,'wonder-refund','A competing campus opened first. The charter fee was returned.',city.tile,
      {item,city:city.id,refund});
  }
  state.wonderRegistry={...state.wonderRegistry,[item]:'complete'};
}
