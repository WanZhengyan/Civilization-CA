// Relative positions locate places inside their parent district on this schematic map.
const survey = {
  la:{
    'Downtown LA':[[0,-.39,'Civic Center'],[-.34,-.19,'Bunker Hill'],[.31,.04,'Little Tokyo'],[-.2,.34,'South Park'],[.29,.35,'Fashion District']],
    'Santa Monica':[[-.36,-.27,'Palisades Park'],[-.13,.04,'Ocean Avenue'],[.23,-.11,'Third Street Promenade'],[.05,.36,'Ocean Park']],
    'Hollywood':[[.02,-.32,'Hollywood Bowl'],[-.3,-.03,'Hollywood Boulevard'],[.36,.0,'Vine Street'],[.03,.38,'Sunset Boulevard']],
    'Pasadena':[[.01,-.33,'Northwest Pasadena'],[-.35,.04,'Old Pasadena'],[.23,.0,'Playhouse Village'],[.13,.37,'South Lake']],
    'Beverly Hills':[[0,-.34,'Beverly Gardens'],[-.26,.02,'Rodeo Drive'],[.31,.08,'City Hall'],[-.06,.36,'Beverly Drive']],
    'Venice':[[-.25,-.2,'Venice Boardwalk'],[.29,.0,'Abbot Kinney Boulevard'],[-.03,.38,'Venice Canals']],
    Westwood:[
      [-.43,-.26,'Westwood Hills'],[-.17,-.38,'UCLA Hill'],[.27,-.34,'UCLA North Campus'],
      [.23,.05,'UCLA South Campus'],[-.06,.33,'Westwood Village'],[.43,.29,'Wilshire Corridor']
    ]
  }, sf:{
    'San Francisco':[[.17,-.35,'Ferry Building'],[-.30,-.20,'Chinatown'],[.29,.12,'Embarcadero'],[-.15,.33,'South of Market']],
    'Golden Gate Park':[[-.39,-.13,'Spreckels Lake'],[-.05,.18,'Blue Heron Lake'],[.27,.03,'Music Concourse'],[.43,.19,'Conservatory of Flowers']],
    'Oakland':[[-.31,.25,'Jack London Square'],[-.22,-.18,'Old Oakland'],[.12,-.26,'Uptown'],[.32,.09,'Lake Merritt']],
    'Berkeley':[[-.36,.1,'West Berkeley'],[-.06,.31,'Downtown Berkeley'],[.32,-.07,'UC Berkeley'],[.18,-.36,'Northside']],
    'Presidio':[[-.28,.0,'Baker Beach'],[.0,-.31,'Fort Point'],[.32,-.19,'Crissy Field'],[.15,.28,'Main Post']],
    'Alameda':[[-.34,-.13,'Alameda Point'],[.03,.00,'Park Street'],[.29,.32,'South Shore']]
  }, sd:{
    'Balboa Park':[[-.25,-.3,'San Diego Zoo'],[.26,-.15,'Spanish Village'],[.16,.01,'El Prado'],[-.08,.37,'The Palisades']],
    'Downtown San Diego':[[-.31,-.1,'Columbia'],[.26,-.27,'Cortez Hill'],[.00,.23,'Gaslamp Quarter'],[.30,.26,'East Village']],
    'La Jolla':[[-.16,-.34,'La Jolla Cove'],[.31,-.13,'La Jolla Shores'],[-.13,.02,'Village of La Jolla'],[-.23,.35,'Windansea Beach']],
    'Coronado':[[-.35,-.2,'North Island'],[.28,-.18,'Ferry Landing'],[-.16,.26,'Central Beach'],[.22,.26,'Glorietta Bay']],
    'Old Town':[[-.21,-.2,'Presidio Park'],[-.19,.29,'San Diego Avenue'],[.30,.09,'Heritage Park']],
    'Chula Vista':[[-.35,-.10,'Bayfront'],[-.02,.12,'Third Avenue'],[.29,.30,'Otay Ranch']]
  }
};
export function districtLocality(region,parent,dx,dy) {
  const sites=survey[region]?.[parent.name];
  if(!sites||parent.terrain==='ocean')return null;
  let nearest, distance=Infinity;
  for(const [x,y,name] of sites){
    const d=(dx-x)**2+.75*(dy-y)**2;
    if(d<distance){distance=d;nearest=name;}
  }
  return nearest;
}

const localityTerrain={
  'UCLA Hill':'hills','Westwood Hills':'hills','Palisades Park':'forest','Beverly Gardens':'forest',
  'Hollywood Bowl':'hills','Spreckels Lake':'forest','Music Concourse':'plains','Crissy Field':'plains',
  'Main Post':'urban','San Diego Zoo':'forest','Presidio Park':'forest','El Prado':'urban'
};
export function localGround(locality,terrain,scale) {
  // Existing double-scale games keep their original crossing costs and shoreline.
  if(scale<3||terrain==='coast'||terrain==='ocean'||terrain==='mountains')return terrain;
  return localityTerrain[locality]||terrain;
}
