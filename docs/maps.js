// Fixed scenario geometry is shared by the renderer, solo rules and room server.
// The grids are schematic. Each initial entry is [capital, settler, militia].
export const LOS_ANGELES = {
  id: 'la', name: 'The Los Angeles Basin', shortName: 'Los Angeles',
  coordinates: '34°03′ N   118°15′ W',
  description: 'An urban basin below the Santa Monica Mountains. Expand west to reach the Pacific.',
  oceanLabel: [2,9,'PACIFIC','OCEAN'], ridgeLabel: [3.4,3,'SANTA MONICA MTNS'],
  districts: ['Malibu','Beverly Hills','Culver City','Inglewood','Compton','Venice','Glendale','Van Nuys','Altadena','Montebello']
};

const BAY_AREA = {
  id: 'sf', name: 'San Francisco Bay', shortName: 'San Francisco',
  coordinates: '37°48′ N   122°25′ W',
  description: 'Two shores face across a navigable bay. Build a port or expand around the southern wetlands.',
  oceanLabel: [8.5,5,'SAN FRANCISCO','BAY'], ridgeLabel: [14,2,'EAST BAY HILLS'],
  districts: ['Sausalito','Richmond','Daly City','San Mateo','Fremont','Hayward','Alameda','Berkeley'],
  starts: [['6,5','5,5','6,6'],['12,5','12,6','13,5'],['10,1','11,1','12,1'],['4,1','5,1','4,2']],
  rows: [
    '~~~fhufc~~~cuuhhf', '~~chuuuc~~cuuuhhf', '~~cufucc~~~cuufhm',
    '~~~~~~~~c~~cuufhm', '~~~cccu~~~~cuuufh', '~~~ccuu~~~~cuuuhh',
    '~~~cuuu~~~~~cuuuh', '~~~cuhuc~~~~cuuuh', '~~~chuuc~~~~~cuuh',
    '~~~chhuuc~~~~cuuh', '~~~chhhuuc~~~cuuh', '~~~cfhhhuuccccuuh',
    '~~~cffhhuuuuuuuuh'
  ],
  places: {
    '4,1':['San Rafael','mission'], '5,1':['San Pedro'], '4,2':['Mill Valley'],
    '3,2':['Mount Tamalpais'], '6,2':['Sausalito'], '5,2':['Marin Headlands'],
    '5,4':['Golden Gate','goldengate'], '4,4':['Presidio'], '3,5':['Ocean Beach'],
    '4,5':['Golden Gate Park'], '5,5':['Western Addition'], '6,5':['San Francisco','ferry'],
    '5,6':['Twin Peaks'], '6,6':['Mission District'], '5,7':['Daly City'],
    '4,8':['Pacifica'], '6,8':['South San Francisco'], '7,9':['Burlingame'],
    '8,10':['San Mateo'], '9,11':['Redwood City'], '11,12':['Palo Alto'],
    '14,12':['San Jose'], '13,11':['Fremont'], '13,9':['Hayward'],
    '13,7':['San Leandro'], '12,6':['Alameda'], '12,5':['Oakland','cranes'],
    '13,5':['Fruitvale'], '12,4':['Emeryville'], '12,3':['Berkeley','campanile'],
    '13,3':['Berkeley Hills'], '12,2':['Albany'], '10,1':['Richmond','cranes'],
    '11,1':['North Richmond'], '12,1':['El Cerrito'], '8,3':['Angel Island']
  },
  routes: [
    [[4,0],[5,2],[5,4],[6,5],[5,7],[6,8],[8,10],[10,11],[14,12]],
    [[10,1],[12,3],[12,5],[12,6],[13,8],[13,10],[14,12]],
    [[6,5],[8,4.7],[10,4.8],[12,5]]
  ],
  oceanName(q,r) { return q < 4 ? 'Pacific Ocean' : r < 2 ? 'San Pablo Bay' : 'San Francisco Bay'; }
};

const terrainKey = { '~':'ocean', c:'coast', u:'urban', p:'plains', h:'hills', f:'forest', m:'mountains' };
const terrainSuffix = {coast:'shore',urban:'district',plains:'lowlands',hills:'foothills',forest:'woodland',mountains:'ridge'};

function chart(config) {
  const cityIds = config.starts.map(start => start[0]);
  const named = Object.entries(config.places).map(([id,[name]]) => {
    const [q,r] = id.split(',').map(Number);
    return {q,r,name};
  });
  const tiles = config.rows.flatMap((row,r) => Array.from(row,(symbol,q) => {
    const id = q+','+r, terrain = terrainKey[symbol], site = config.places[id];
    let name = site?.[0];
    if (!name) {
      if (terrain === 'ocean') name = config.oceanName(q,r);
      else {
        let best = Infinity, nearest;
        for (const place of named) {
          const distance = (q+(r%2)*.5-place.q-(place.r%2)*.5)**2 + .75*(r-place.r)**2;
          if (distance < best) { nearest=place.name; best=distance; }
        }
        name = nearest+' '+terrainSuffix[terrain];
      }
    }
    const seat = cityIds.indexOf(id);
    return {id,q,r,name,terrain,landmark:site?.[1]||null,capitalFor:seat<0?null:seat};
  }));
  return {...config, tiles, byId:Object.fromEntries(tiles.map(tile=>[tile.id,tile]))};
}

export const regionalMaps = {sf:chart(BAY_AREA)};
export const CAMPAIGN_MAPS = [LOS_ANGELES, ...Object.values(regionalMaps)];
export function validMapId(id) { return CAMPAIGN_MAPS.some(map=>map.id===id); }
