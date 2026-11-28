import {ROCKETRY} from './victory-rules.js';
import {appliedScience} from './applied-science.js';
// Research projects share stable IDs with saved campaigns and room commands.
export const ERAS = {
  frontier: {id: 'frontier', name: 'Frontier', rank: 0},
  industrial: {id: 'industrial', name: 'Industrial', rank: 1},
  modern: {id: 'modern', name: 'Modern', rank: 2}
};

const originalTechs = {
  agronomy: {name: 'Agronomy', era: 'frontier', requires: [], cost: 9,
    description: 'Each city produces 2 more food per turn.'},
  industry: {name: 'Workshop Engineering', era: 'frontier', requires: [], cost: 10,
    description: 'Each city produces 2 more production per turn.'},
  tactics: {name: 'Field Tactics', era: 'frontier', requires: [], cost: 9,
    description: 'Military units deal 7 more attack damage and 3 more retaliation damage.'},
  civics: {name: 'Land Surveying', era: 'frontier', requires: [], cost: 9,
    description: 'Each city earns 2 more gold, 1 influence and 1 point toward natural border growth per turn.'},
  navigation: {name: 'Coastal Navigation', era: 'frontier', requires: [], cost: 7,
    description: 'Coastal cities earn 2 extra capital per turn.'},
  steam: {name: 'Steam Power', era: 'industrial', requires: ['industry'], cost: 10,
    description: 'Workshops supply 2 extra production per turn.'},
  ballistics: {name: 'Ballistics', era: 'industrial', requires: ['tactics'], cost: 9,
    description: 'Ranged attacks deal 5 extra damage.'},
  radio: {name: 'Radio Networks', era: 'modern', requires: ['steam'], cost: 12,
    description: 'Each city generates 2 more science per turn.'},
  motorization: {name: 'Motorization', era: 'modern', requires: ['steam', 'ballistics'], cost: 12,
    description: 'Each city produces 2 more production per turn.'},
  ...appliedScience,
  rocketry:ROCKETRY
};

export function eraFor(known = [], adopted = []) {
  return [...known.map(id => TECHS[id]), ...adopted.map(id => CIVICS[id])].reduce((era, project) => {
    const next = ERAS[project?.era];
    return next && next.rank > era.rank ? next : era;
  }, ERAS.frontier);
}

import {REGIONAL_CIVICS} from './civic-agenda.js';

const originalCivics = {
  ...REGIONAL_CIVICS,
  charter: {name: 'Municipal Charter', era: 'frontier', requires: [], cost: 7,
    description: 'Each city generates 1 extra culture per turn.'},
  publicWorks: {name: 'Public Works', era: 'frontier', requires: [], cost: 8,
    description: 'Each city produces 1 more production per turn.'},
  conservation: {name: 'Park Conservancies', era: 'industrial', requires: ['charter'], cost: 10,
    description: 'Cities near an owned woodland or foothill gain 1 food and 1 culture per turn.'},
  federation: {name: 'County Federation', era: 'industrial', requires: ['charter'], cost: 11,
    description: 'Each city adds 2 points per turn toward its next natural border expansion.'},
  publicRadio: {name: 'Public Broadcasting', era: 'modern', requires: ['conservation'], cost: 13,
    description: 'Each city generates 2 more science per turn.'},
  mobilization: {name: 'Civil Mobilization', era: 'modern', requires: ['publicWorks', 'federation'], cost: 12,
    description: 'New military units enter service with 20 extra maximum health.'}
};

// Saved expeditions retain the catalog and prices present when they began.
function stagedTree(definitions,requirements,prices) {
  const tree={};
  function define(id) {
    if(tree[id])return tree[id];
    const project=definitions[id];
    const requires=requirements[id] ?? project.requires;
    const parents=requires.map(define);
    const tier=1+Math.max(0,...parents.filter(parent=>parent.era===project.era).map(parent=>parent.tier));
    const cost=project.cost+prices[project.era][tier-1];
    tree[id]={...project,requires,tier,cost};
    return tree[id];
  }
  for(const id of Object.keys(definitions))define(id);
  return tree;
}

export const TECHS=stagedTree({
  ...originalTechs,
  mechanics:{name:'Applied Mechanics',era:'frontier',requires:['industry'],cost:12,
    description:'Each workshop supplies 1 additional production per turn.'},
  electricity:{name:'Electrical Engineering',era:'industrial',requires:['metallurgy'],cost:16,
    description:'Each workshop generates 2 additional science per turn.'},
},{
  navigation:['civics'],steam:['mechanics'],ballistics:['tactics','mechanics'],
  metallurgy:['steam'],hydrography:['navigation','cartography'],
  fieldMedicine:['agriculturalScience','tactics'],radio:['electricity'],
  motorization:['railways','ballistics'],
},{
  frontier:[0,16],industrial:[50,80,108],modern:[145,196,270]
});

export const CIVICS=stagedTree({
  ...originalCivics,
  landRegistry:{name:'Land Registry',era:'frontier',requires:['charter'],cost:9,
    description:'Each city earns 1 additional gold per turn.'},
  publicLibraries:{name:'Public Libraries',era:'industrial',requires:['normalSchools'],cost:12,
    description:'Each monument generates 2 additional culture per turn.'},
  regionalPlanning:{name:'Regional Planning',era:'modern',requires:['housingTrust','exposition'],cost:16,
    description:'Cities with at least 5 residents gain 1 production and 1 culture per turn.'},
},{
  federation:['landRegistry'],conservation:['irrigationDistricts'],normalSchools:['federation'],
  harborCommission:['publicWorks','federation'],publicRadio:['publicLibraries'],
  mobilization:['housingTrust','mutualAid'],exposition:['publicRadio','conservation'],
},{
  frontier:[0,10],industrial:[28,45,65],modern:[82,115,150]
});

export function councilTree(state,focus) {
  if(focus==='research')return state.researchPace===2 ? TECHS : originalTechs;
  return state.researchPace===2 ? CIVICS : originalCivics;
}

export const ERA_UNITS = {
  cavalry: {name:'Mounted Scouts', era:'frontier', role:'Recon unit', tech:'agronomy', captures:true,
    description:'Fast riders move four hexes and can occupy a weakened city.',
    maxHp:80, moves:4, range:1, strength:32, required:12, upgrade:'armor', upgradeCost:18},
  riflemen: {name:'Rifle Company', era:'industrial', role:'Infantry unit', tech:'ballistics', captures:true,
    description:'Durable infantry fight at close range and capture weakened cities.',
    maxHp:110, moves:2, range:1, strength:55, required:15, upgrade:'armor', upgradeCost:16},
  artillery: {name:'Field Artillery', era:'industrial', role:'Siege unit', tech:'steam', captures:false,
    description:'Guns bombard targets up to three hexes away. A ground unit must occupy the city.',
    maxHp:90, moves:3, range:3, strength:46, required:17},
  armor: {name:'Armored Column', era:'modern', role:'Armored unit', tech:'motorization', captures:true,
    description:'Armored columns move four hexes, break defended positions and occupy cities.',
    maxHp:130, moves:4, range:1, strength:68, required:21}
};
