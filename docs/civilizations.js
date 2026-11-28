import {seededRandom, shuffled} from './opening.js';

export const RANDOM_CIVILIZATION = 'random';
export const CIVILIZATIONS = [
  {
    id:'republic', name:'California Republic', nameZh:'加州共和国', color:'#efbb62', capital:'11,7', capitalName:'Downtown LA',
    traitName:'Public Works Corps', traitNameZh:'公共工程队', bonus:{production:1},
    description:'Your original capital produces 1 extra Production per turn while you control it.',
    descriptionZh:'控制自己的初始首都时，该城每回合额外获得 1 点生产力。'
  },
  {
    id:'pacific', name:'Pacific Union', nameZh:'太平洋联盟', color:'#69b7c7', capital:'4,7', capitalName:'Santa Monica',
    traitName:'Pacific Exchange', traitNameZh:'太平洋商会', bonus:{capital:2},
    description:'Your original capital earns 2 extra Gold per turn while you control it.',
    descriptionZh:'控制自己的初始首都时，每回合额外获得 2 金币。'
  },
  {
    id:'valley', name:'Valley Coalition', nameZh:'山谷联盟', color:'#8ab98a', capital:'10,2', capitalName:'Burbank',
    traitName:'Valley Growers', traitNameZh:'谷地种植合作社', bonus:{food:2},
    description:'Your original capital produces 2 extra Food per turn while you control it.',
    descriptionZh:'控制自己的初始首都时，该城每回合额外获得 2 点食物。'
  },
  {
    id:'arroyo', name:'Arroyo League', nameZh:'阿罗约同盟', color:'#dc8c9f', capital:'15,3', capitalName:'Pasadena',
    traitName:'Field Institutes', traitNameZh:'地方研究所', bonus:{science:1},
    description:'Your original capital produces 1 extra Science per turn while you control it.',
    descriptionZh:'控制自己的初始首都时，每回合额外获得 1 点科研。'
  }
];

const factionIndex = new Map(CIVILIZATIONS.map((civilization,index)=>[civilization.id,index]));

export function validCivilizationPick(pick) {
  return pick === undefined || pick === RANDOM_CIVILIZATION || factionIndex.has(pick);
}

export function validateCivilizationPicks(picks) {
  if (!Array.isArray(picks) || picks.length<1 || picks.length>CIVILIZATIONS.length || !picks.every(validCivilizationPick)) {
    throw new Error('Choose a valid civilization.');
  }
  const fixed=picks.filter(pick=>factionIndex.has(pick));
  if (new Set(fixed).size!==fixed.length) throw new Error('Each civilization can be chosen only once. Choose an available civilization or Random.');
}

export function allocateCivilizations(picks, seed) {
  validateCivilizationPicks(picks);
  const fixed=new Set(picks.map(pick=>factionIndex.get(pick)));
  const available=shuffled([...factionIndex.values()],seededRandom(seed,'civilizations')).filter(faction=>!fixed.has(faction));
  let next=0;
  return Array.from(picks,pick=>factionIndex.get(pick) ?? available[next++]);
}

const noBonus=Object.freeze({});

// Old campaigns retain their original economy. Capturing another founder's
// capital never transfers its trait, even between allied civilizations.
export function capitalBonus(state, seat, city) {
  if (state.civilizationTraits!==1 || !city || city.seat!==seat || city.originalSeat!==seat) return noBonus;
  return CIVILIZATIONS[state.players[seat].faction].bonus;
}
