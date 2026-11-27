// Inclusive column spans, north to south on the atlas's odd-row hex grid.
// Disjoint spans on one row represent separate headlands of the same region.
const footprints = {
  // San Fernando Valley and San Gabriel foothills feed the basin. Santa
  // Monica Bay opens westward, then the chart narrows toward the South Bay.
  la: [
    [2,8], [1,12], [1,15], [0,16], [0,15], [0,15], [0,16],
    [0,15], [1,15], [2,14], [3,13], [4,13], [6,12]
  ],
  // Mount Tam and the San Pablo shore frame the north. The Pacific mouth
  // opens at the Golden Gate; the peninsula and East Bay meet at San Jose.
  sf: [
    [3,6,10,12], [2,13], [1,14], [0,14], [1,15], [1,16], [2,16],
    [2,15], [3,15], [3,15], [4,16], [6,16], [8,15]
  ],
  // La Jolla's bluff, Mission Bay and Point Loma turn around the harbor
  // entrance. The Silver Strand leads down to the Imperial Beach wetlands.
  sd: [
    [4,9], [3,11], [2,12], [2,13], [1,14], [0,14], [1,15],
    [2,15], [3,16], [4,16], [5,15], [6,14], [8,13]
  ]
};

export const REGIONAL_SHAPE = 'regional';

export function neighborCoordinates(q, r) {
  const shift = r & 1;
  return [
    [q - 1, r], [q + 1, r], [q - 1 + shift, r - 1], [q + shift, r - 1],
    [q - 1 + shift, r + 1], [q + shift, r + 1]
  ];
}

function crossingIndex(crossings) {
  const byTile = Object.create(null);
  for (const crossing of crossings) {
    (byTile[crossing.a] ||= []).push({...crossing, to:crossing.b});
    (byTile[crossing.b] ||= []).push({...crossing, to:crossing.a});
  }
  return byTile;
}

export function campaignChart(source, adjacency, regional) {
  const tiles = regional ? source.tiles.filter(({q,r}) => {
    const spans = footprints[source.id][r];
    for (let i=0;i<spans.length;i+=2) if (q>=spans[i] && q<=spans[i+1]) return true;
    return false;
  }) : source.tiles;
  const byId = regional ? Object.fromEntries(tiles.map(tile => [tile.id,tile])) : source.byId;
  const edges = Object.fromEntries(tiles.map(({id}) => [id,adjacency[id].filter(next=>Object.hasOwn(byId,next))]));
  const crossings=[...(source.crossings || []),...(regional ? source.regionalCrossings || [] : [])];
  return {...source, tiles, byId, crossings, bridgesByTile:crossingIndex(crossings),
    mapSize:'standard', columns:17, rowsCount:13, terrainAtlas:source.tiles, neighbors:id=>edges[id] || []};
}

// Fine hexes fall either on a surveyed center or halfway between two centers.
// Assign midpoint terrain from one of those two districts. Thus an original
// land route or shipping channel stays connected at twice its old length.
function fineCoordinates([q,r,...label]) {
  return [2*q + (r & 1), 2*r, ...label];
}
function fineId(id) {
  return fineCoordinates(id.split(',').map(Number)).join(',');
}

function districtDirection(q,r,cx,cy) {
  const east=q + (r & 1)/2 > cx;
  if (r===cy) return east ? 'E' : 'W';
  if (r<cy) return east ? 'NE' : 'NW';
  return east ? 'SE' : 'SW';
}

function nearestSurveyTile(q,r,source) {
  const x = q + (r & 1)/2;
  let nearest=[], distance=Infinity;
  for (let row=Math.floor(r/2);row<=Math.ceil(r/2);row++) {
    const col=(x - (row & 1))/2;
    for (let column=Math.floor(col);column<=Math.ceil(col);column++) {
      const tile=source.get(column+','+row);
      if (!tile) continue;
      const dx=x - (2*column + (row & 1)), dy=r - 2*row;
      const d=dx*dx + 0.75*dy*dy;
      if (d < distance) { nearest=[]; distance=d; }
      if (d === distance) nearest.push(tile);
    }
  }
  // Alternate which side owns a midpoint, following the same shoreline
  // on every client and in every save of this geography.
  return nearest[(q+r+Math.floor(q/2)) % nearest.length];
}

export function largeCampaignChart(standard) {
  const columns=standard.columns*2, rowsCount=standard.rowsCount*2;
  const samples=new Map(standard.terrainAtlas.map(tile=>[tile.id,tile]));
  const terrainAtlas=[], tiles=[], byId=Object.create(null);
  for(let r=0;r<rowsCount;r++) for(let q=0;q<columns;q++) {
    const parent=nearestSurveyTile(q,r,samples);
    const [cx,cy]=fineCoordinates([parent.q,parent.r]);
    const center=q===cx && r===cy;
    const name=center || parent.terrain==='ocean' ? parent.name : parent.name+' · '+districtDirection(q,r,cx,cy);
    const tile={id:q+','+r,q,r,terrain:parent.terrain,name,namedCenter:center,
      landmark:center ? parent.landmark : null,capitalFor:center ? parent.capitalFor : null};
    terrainAtlas.push(tile);
    if (standard.byId[parent.id]) { tiles.push(tile); byId[tile.id]=tile; }
  }
  const edges=Object.fromEntries(tiles.map(({id,q,r})=>[id,
    neighborCoordinates(q,r).map(([x,y])=>x+','+y).filter(next=>byId[next])
  ]));
  // Use the actual waterfront landings for the narrow Golden Gate and Angel
  // Island passages so a traveler can see the opposite bank without a fleet.
  const crossings=standard.crossings.map(({largeLandings,...link})=>{
    const [a,b]=largeLandings || [fineId(link.a),fineId(link.b)];
    return {...link,a,b};
  });
  return {...standard,mapSize:'large',columns,rowsCount,tiles,byId,terrainAtlas,
    crossings,bridgesByTile:crossingIndex(crossings),neighbors:id=>edges[id] || [],
    starts:standard.starts.map(group=>group.map(fineId)), anchorId:fineId,
    oceanLabel:fineCoordinates(standard.oceanLabel),ridgeLabel:fineCoordinates(standard.ridgeLabel),
    routes:standard.routes?.map(route=>route.map(fineCoordinates))};
}
