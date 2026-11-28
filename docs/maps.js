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
    '5,4':['Golden Gate Bridge','goldengate'], '4,4':['Presidio'], '3,5':['Ocean Beach'],
    '4,5':['Golden Gate Park'], '5,5':['Western Addition'], '6,5':['San Francisco','ferry'],
    '5,6':['Twin Peaks'], '6,6':['Mission District'], '5,7':['Daly City'],
    '4,8':['Pacifica'], '6,8':['South San Francisco'], '7,9':['Burlingame'],
    '8,10':['San Mateo'], '9,11':['Redwood City'], '11,12':['Palo Alto'],
    '14,12':['San Jose'], '13,11':['Fremont'], '13,9':['Hayward'],
    '13,7':['San Leandro'], '12,6':['Alameda'], '12,5':['Oakland','cranes'],
    '13,5':['Fruitvale'], '12,4':['Emeryville'], '12,3':['Berkeley','cityhall'],
    '13,3':['Berkeley Hills'], '12,2':['Albany'], '10,1':['Richmond','cranes'],
    '11,1':['North Richmond'], '12,1':['El Cerrito'], '8,3':['Angel Island']
  },
  routes: [
    [[4,0],[5,2],[5,4],[6,5],[5,7],[6,8],[8,10],[10,11],[14,12]],
    [[10,1],[12,3],[12,5],[12,6],[13,8],[13,10],[14,12]],
    [[12,4],[12,5],[13,6]]
  ],
  crossings: [
    {name:'Golden Gate Bridge', a:'5,2', b:'5,4', largeLandings:['10,5','11,7'], color:'#be5c42'},
    {name:'Bay Bridge', a:'6,5', b:'12,4', color:'#73848a'}
  ],
  regionalCrossings: [{name:'Angel Island ferry',kind:'ferry',a:'7,2',b:'8,3',largeLandings:['15,4','16,5']}],
  oceanName(q,r) { return q < 4 ? 'Pacific Ocean' : r < 2 ? 'San Pablo Bay' : 'San Francisco Bay'; }
};

const SAN_DIEGO = {
  id: 'sd', name: 'San Diego Bay', shortName: 'San Diego',
  coordinates: '32°43′ N   117°10′ W',
  description: 'Command the harbor from Point Loma to Chula Vista. The Silver Strand shelters the inner bay.',
  oceanLabel: [2.3,6,'PACIFIC','OCEAN'], ridgeLabel: [14,2,'PENINSULAR RANGES'],
  districts: ['La Jolla','Pacific Beach','Ocean Beach','Point Loma','Old Town','Coronado','National City','Chula Vista','Imperial Beach'],
  starts: [['10,6','11,6','10,5'],['4,1','5,1','4,2'],['7,8','7,7','8,8'],['12,10','12,9','13,10']],
  rows: [
    '~~~~cfhppuhhffmhh','~~~~cuuhuupfhmmhh','~~~~cuucuuuphhmhh',
    '~~~~c~~cuuuufhhhh','~~~c~~~cuufuuphhu','~~~cuhcuuuufuuuhh',
    '~~~cuu~~~~uuuuuuh','~~~~cu~cu~~cuuuph','~~~~~c~cu~~cuuuph',
    '~~~~~~~cc~~~cuuph','~~~~~~~~c~~cuuuph','~~~~~~~~c~ccuuphh',
    '~~~~~~~~cccuuufhh'
  ],
  places: {
    '4,0':['La Jolla Shores'], '4,1':['La Jolla','scripps'], '5,1':['Mount Soledad'],
    '4,2':['Pacific Beach'], '5,2':['Crown Point'], '4,3':['Mission Beach'],
    '7,3':['Mission Bay Park'], '3,5':['Ocean Beach'], '7,4':['Old Town','mission'],
    '4,5':['Point Loma'], '5,5':['Loma Portal'], '7,5':['Midway District'],
    '8,5':['San Diego International'], '10,4':['Balboa Park','balboa'],
    '11,4':['North Park'], '10,5':['Little Italy'], '10,6':['Downtown San Diego','depot'],
    '11,6':['East Village'], '12,6':['Golden Hill'], '11,7':['Barrio Logan'],
    '5,8':['Cabrillo Point','lighthouse'], '7,7':['North Island'], '7,8':['Coronado','hotel'],
    '8,8':['Glorietta Bay'], '8,9':['Silver Strand'], '11,8':['National City','cranes'],
    '12,9':['Chula Vista Marina'], '12,10':['Chula Vista','marina'], '13,10':['Otay Valley'],
    '11,11':['South Bay Salt Works'], '9,12':['Imperial Beach'], '13,12':['San Ysidro']
  },
  routes: [
    [[5,0],[5,1],[6,2],[7,3],[7,4],[8,5],[10,6],[11,7],[12,8],[12,10],[13,12]],
    [[7,8],[8,8]],[[7,7],[7,8],[8,9],[8,10],[8,11],[9,12]],
    [[9,0],[9,2],[10,3],[11,4],[11,6],[13,7],[14,9],[15,12]]
  ],
  crossings: [{name:'Coronado Bridge', a:'8,8', b:'11,7', color:'#69889a'}],
  oceanName(q,r) { return r>=3 && r<=4 && q>=5 ? 'Mission Bay' : r>=6 && q>=6 && q>=(r>=9?9:8) ? 'San Diego Bay' : 'Pacific Ocean'; }
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

export const regionalMaps = {sf:chart(BAY_AREA),sd:chart(SAN_DIEGO)};
export const CAMPAIGN_MAPS = [LOS_ANGELES, ...Object.values(regionalMaps)];
export function validMapId(id) { return CAMPAIGN_MAPS.some(map=>map.id===id); }
export const MAP_SCALES=Object.freeze({standard:1,large:2,grand:3,epic:4});
export const CAMPAIGN_SIZES=Object.freeze(['large','grand','epic']);
export const DEFAULT_MAP_SIZE=CAMPAIGN_SIZES[0];
export function validMapSize(size) { return Object.hasOwn(MAP_SCALES,size); }
export function validNewMapSize(size) { return CAMPAIGN_SIZES.includes(size); }
