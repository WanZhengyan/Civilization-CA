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
    description: 'Each city produces 2 more production per turn.'}
};

export function eraFor(known = []) {
  return known.reduce((era, id) => {
    const next = ERAS[TECHS[id]?.era];
    return next && next.rank > era.rank ? next : era;
  }, ERAS.frontier);
}
