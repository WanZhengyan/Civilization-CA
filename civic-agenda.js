// Prerequisites are stable project IDs, also used by saved council orders.
export const REGIONAL_CIVICS = {
  irrigationDistricts: {
    name:'Irrigation Districts', era:'frontier', requires:['publicWorks'], cost:8,
    description:'A city with a working farm or orchard gains 2 food per turn.'
  },
  mutualAid: {
    name:'Mutual Aid Pacts', era:'frontier', requires:['charter'], cost:8,
    description:'Damaged cities recover 6 additional health when their turn begins.'
  },
  harborCommission: {
    name:'Harbor Commissions', era:'industrial', requires:['publicWorks'], cost:10,
    description:'Each city with a harbor earns 3 additional capital per turn.'
  },
  normalSchools: {
    name:'Teachers Colleges', era:'industrial', requires:['charter'], cost:10,
    description:'Cities with at least 3 residents generate 2 additional science per turn.'
  },
  housingTrust: {
    name:'Community Land Trusts', era:'modern', requires:['irrigationDistricts','federation'], cost:12,
    description:'Every city gains 2 housing spaces, including newly founded settlements.'
  },
  exposition: {
    name:'California Expositions', era:'modern', requires:['normalSchools','conservation'], cost:13,
    description:'Each completed university generates 2 additional culture and 2 influence per turn.'
  }
};

export function extraHousing(player) {
  return player?.civics?.includes('housingTrust') ? 2 : 0;
}
