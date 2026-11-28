import {ROCKETRY} from './victory-rules.js';
import {appliedScience} from './applied-science.js';
// Research projects share stable IDs with saved campaigns and room commands.
export const ERAS = {
  frontier: {id: 'frontier', name: 'Frontier', rank: 0},
  industrial: {id: 'industrial', name: 'Industrial', rank: 1},
  modern: {id: 'modern', name: 'Modern', rank: 2}
};

export const TECHS = {
  agronomy: {name: 'Agronomy', era: 'frontier', requires: [], cost: 9,
    description: 'Each city produces 2 more food per turn.'},
  industry: {name: 'Workshop Engineering', era: 'frontier', requires: [], cost: 10,
    description: 'Each city produces 2 more production per turn.'},
  tactics: {name: 'Field Tactics', era: 'frontier', requires: [], cost: 9,
    description: 'Military units deal 7 more attack damage and 3 more retaliation damage.'},
  civics: {name: 'Land Surveying', era: 'frontier', requires: [], cost: 9,
    description: 'Each city earns 2 more capital and 1 more influence per turn.'},
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

export const CIVICS = {
  ...REGIONAL_CIVICS,
  charter: {name: 'Municipal Charter', era: 'frontier', requires: [], cost: 7,
    description: 'Each city generates 1 extra culture per turn.'},
  publicWorks: {name: 'Public Works', era: 'frontier', requires: [], cost: 8,
    description: 'Each city produces 1 more production per turn.'},
  conservation: {name: 'Park Conservancies', era: 'industrial', requires: ['charter'], cost: 10,
    description: 'Cities near an owned woodland or foothill gain 1 food and 1 culture per turn.'},
  federation: {name: 'County Federation', era: 'industrial', requires: ['charter'], cost: 11,
    description: 'Gain a third district order at the start of each turn.'},
  publicRadio: {name: 'Public Broadcasting', era: 'modern', requires: ['conservation'], cost: 13,
    description: 'Each city generates 2 more science per turn.'},
  mobilization: {name: 'Civil Mobilization', era: 'modern', requires: ['publicWorks', 'federation'], cost: 12,
    description: 'New military units enter service with 20 extra maximum health.'}
};

export const ERA_UNITS = {
  cavalry: {name:'Mounted Scouts', era:'frontier', role:'Recon unit', tech:'agronomy', captures:true,
    description:'Fast riders move four hexes and can occupy a weakened city.',
    maxHp:80, moves:4, range:1, strength:32, required:12, upgrade:'armor', upgradeCost:18},
  riflemen: {name:'Rifle Company', era:'industrial', role:'Infantry unit', tech:'ballistics', captures:true,
    description:'Durable infantry fight at close range and capture weakened cities.',
    maxHp:110, moves:2, range:1, strength:55, required:15, upgrade:'armor', upgradeCost:16},
  artillery: {name:'Field Artillery', era:'industrial', role:'Siege unit', tech:'steam', captures:false,
    description:'Guns bombard targets up to three hexes away. A ground unit must occupy the city.',
    maxHp:75, moves:2, range:3, strength:46, required:17},
  armor: {name:'Armored Column', era:'modern', role:'Armored unit', tech:'motorization', captures:true,
    description:'Armored columns move three hexes, break defended positions and occupy cities.',
    maxHp:130, moves:3, range:1, strength:68, required:21}
};
