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

export function campaignChart(source, adjacency, regional) {
  const tiles = regional ? source.tiles.filter(({q,r}) => {
    const spans = footprints[source.id][r];
    for (let i=0;i<spans.length;i+=2) if (q>=spans[i] && q<=spans[i+1]) return true;
    return false;
  }) : source.tiles;
  const byId = regional ? Object.fromEntries(tiles.map(tile => [tile.id,tile])) : source.byId;
  const edges = Object.fromEntries(tiles.map(({id}) => [id,adjacency[id].filter(next=>Object.hasOwn(byId,next))]));
  const crossings=[...(source.crossings || []),...(regional ? source.regionalCrossings || [] : [])];
  const bridgesByTile=Object.create(null);
  for(const crossing of crossings) {
    (bridgesByTile[crossing.a] ||= []).push({...crossing,to:crossing.b});
    (bridgesByTile[crossing.b] ||= []).push({...crossing,to:crossing.a});
  }
  return {...source, tiles, byId, crossings, bridgesByTile, terrainAtlas:source.tiles, neighbors:id=>edges[id] || []};
}
