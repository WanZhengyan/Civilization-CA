import {crossingIndex} from './region-shapes.js';
import {seededRandom} from './opening.js';

// These are schematic campaign basins. Preferred headwaters and estuaries use
// coarse survey coordinates; the river itself is routed across the fine grid.
const basins={
  la:[
    ['Ballona Creek','Ballona Basin Lake',[8,6],[5,9]],
    ['Dominguez Channel','South Bay Lagoon',[11,8],[7,11]]
  ],
  sf:[
    ['Alameda Creek','Alameda Basin Lake',[15,8],[12,9]],
    ['Guadalupe River','South Bay Lagoon',[15,11],[10,10]]
  ],
  sd:[
    ['San Diego River','Mission Valley Lake',[12,3],[7,3]],
    ['Otay River','Otay Lake',[14,10],[11,10]]
  ]
};
const land=t=>t.terrain!=='ocean' && t.terrain!=='mountains';
function distance(tile,[x,y],scale) {
  return Math.hypot((tile.q+(tile.r&1)/2)/scale-x,(tile.r/scale-y)*.87);
}
function protectedSites(map) {
  return new Set([...map.starts.flat(),...map.tiles.filter(t=>t.landmark || t.capitalFor!=null).map(t=>t.id),
    ...map.crossings.flatMap(b=>[b.a,b.b])]);
}
function largestSea(map) {
  const unvisited=new Set(map.tiles.filter(t=>t.terrain==='ocean').map(t=>t.id));
  let largest=new Set();
  for(const id of unvisited) {
    const component=new Set([id]);unvisited.delete(id);
    for(const here of component) for(const next of map.neighbors(here)) {
      if(unvisited.delete(next))component.add(next);
    }
    if(component.size>largest.size)largest=component;
  }
  return largest;
}
// Fixed geography is shared across games on the same survey. This cache holds
// only immutable base data; candidate channels remain local to their game.
const surveyBases=new WeakMap();
function surveyBase(map) {
  if(surveyBases.has(map))return surveyBases.get(map);
  const sea=largestSea(map),reserved=protectedSites(map);
  const viable=map.tiles.filter(t=>land(t) && !reserved.has(t.id));
  const allowed=new Set(viable.map(t=>t.id)),banks=[];
  for(const tile of viable) {
    const salt=map.neighbors(tile.id).filter(id=>sea.has(id));
    if(salt.length)banks.push([tile.id,salt]);
  }
  const survey={viable,allowed,banks};
  surveyBases.set(map,survey);
  return survey;
}
function makeChannel(map,seed) {
  const random=seededRandom(seed,'hydrology-1/'+map.id+'/'+map.mapSize);
  const [riverName,lakeName,head,estuary]=basins[map.id][Math.floor(random()*basins[map.id].length)];
  const {viable,allowed,banks}=surveyBase(map),scale=map.scaleFactor;
  const shore=new Map(banks.map(([id,salt])=>[id,salt[Math.floor(random()*salt.length)]]));
  // Multi-source weighted flood. The randomized cell costs are assigned once,
  // so the same place always has the same resistance from every direction.
  const weight=new Map(viable.map(t=>[t.id,2+Math.floor(random()*8)+(t.terrain==='hills'?2:0)]));
  const cost=new Map(),parent=new Map(),buckets=[];
  function offer(id,value,from) {
    if(value >= (cost.get(id)??Infinity))return;
    cost.set(id,value);parent.set(id,from);(buckets[value]??=[]).push(id);
  }
  for(const [id] of shore)offer(id,Math.round(distance(map.byId[id],estuary,scale)*scale*4),null);
  for(let value=0;value<buckets.length;value++) {
    for(const id of buckets[value] || []) {
      if(cost.get(id)!==value)continue;
      for(const near of map.neighbors(id)) if(allowed.has(near) && !shore.has(near))offer(near,value+weight.get(near),id);
    }
  }
  const ranked=viable.filter(t=>parent.get(t.id) && !map.neighbors(t.id).some(id=>map.byId[id].terrain==='ocean'))
    .map(t=>[t.id,distance(t,head,scale)+random()*2.5]).sort((a,b)=>a[1]-b[1]);
  const long=[],short=[];
  for(const [id] of ranked) {
    const river=[id];
    while(parent.get(river.at(-1)))river.push(parent.get(river.at(-1)));
    if(river.length<3)continue;
    (river.length>=2+scale ? long : short).push({river,riverName,lakeName,mouth:shore.get(river.at(-1))});
    if(long.length>=28)break;
  }
  return {routes:[...long,...short],allowed,random};
}

// Grow a compact freshwater basin at the source. Islands of untouched
// development and the fine-grid landmark centers remain on their original land.
function headwaterLake(map,river,allowed,random) {
  const channel=new Set(river);
  const dry=id=>allowed.has(id) && !channel.has(id) &&
    !map.neighbors(id).some(neighbor=>map.byId[neighbor].terrain==='ocean');
  const candidates=map.neighbors(river[0]).filter(dry);
  if(!candidates.length)return [];
  const center=candidates[Math.floor(random()*candidates.length)];
  const lake=new Set([center]),frontier=new Map(),target=2+map.scaleFactor*2;
  function expand(id) {
    for(const next of map.neighbors(id)) {
      if(lake.has(next) || frontier.has(next) || !dry(next))continue;
      const tile=map.byId[next],origin=map.byId[center];
      const dx=tile.q+(tile.r&1)/2-origin.q-(origin.r&1)/2,dy=(tile.r-origin.r)*.87;
      frontier.set(next,Math.hypot(dx,dy)+random()*.9);
    }
  }
  expand(center);
  while(lake.size<target && frontier.size) {
    let nearest=null;
    for(const [id,score] of frontier)if(!nearest || score<nearest[1])nearest=[id,score];
    frontier.delete(nearest[0]);lake.add(nearest[0]);expand(nearest[0]);
  }
  return [...lake];
}

const originalComponents=new WeakMap();
function groundComponents(map,water) {
  const labels=new Map();
  for(const tile of map.tiles) {
    if(!land(tile) || water.has(tile.id) || labels.has(tile.id))continue;
    const origin=tile.id,group=[origin];labels.set(origin,origin);
    for(let i=0;i<group.length;i++) {
      const here=group[i],bridges=map.bridgesByTile[here] || [];
      for(const id of [...map.neighbors(here),...bridges.map(b=>b.to)]) {
        if(labels.has(id) || water.has(id) || !land(map.byId[id]))continue;
        labels.set(id,origin);group.push(id);
      }
    }
  }
  return labels;
}
function bridgeSurvey(map,route,lake) {
  const water=new Set([...lake,...route.river]);
  if(!originalComponents.has(map))originalComponents.set(map,groundComponents(map,new Set()));
  const baseline=originalComponents.get(map), components=groundComponents(map,water), candidates=[];
  // Opposite banks two hex-steps apart leave the channel clear for vessels.
  for(const [index,via] of [...route.river,...lake].entries()) {
    const banks=map.neighbors(via).filter(id=>components.has(id));
    for(let i=0;i<banks.length;i++)for(let j=i+1;j<banks.length;j++) {
      const a=banks[i],b=banks[j];
      if(map.neighbors(a).includes(b))continue;
      const ta=map.byId[a],tb=map.byId[b];
      const dx=ta.q+(ta.r&1)/2-tb.q-(tb.r&1)/2,dy=(ta.r-tb.r)*.866;
      // A straight span near the middle of the channel is the normal crossing.
      const score=Math.hypot(dx,dy)*2-Math.abs(index-route.river.length*.55)*.13-(index>=route.river.length?3:0);
      candidates.push({a,b,via,score});
    }
  }
  candidates.sort((a,b)=>b.score-a.score);
  if(!candidates.length)return null;
  const merged=new Map(),result=[];
  function root(id){while(merged.has(id))id=merged.get(id);return id;}
  function add(link) {
    const {a,b,via}=link,from=root(components.get(a)),to=root(components.get(b));
    if(from!==to)merged.set(from,to);
    result.push({a,b,via,kind:'bridge',waterway:true,name:route.riverName+' crossing',color:'#a88760'});
  }
  add(candidates[0]);
  // On the longest channels a second crossing near the upper course gives
  // the lake settlements their own connection across the watershed.
  if(route.river.length>=12) {
    const primary=candidates[0].via;
    const upper=new Set(route.river.slice(0,Math.floor(route.river.length*.3)));
    const upstream=candidates.find(link=>upper.has(link.via) && !map.neighbors(primary).includes(link.via) &&
      [link.a,link.b].every(id=>id!==result[0].a && id!==result[0].b));
    if(upstream && upstream.via!==primary)add(upstream);
  }
  for(const link of candidates)if(root(components.get(link.a))!==root(components.get(link.b)))add(link);
  // A lake can sever an isthmus or trap a single foothill cell. Only accept
  // surveys in which all previously connected surviving land remains joined.
  const afterByBefore=new Map();
  for(const [id,component] of components) {
    const before=baseline.get(id),after=root(component);
    if(afterByBefore.has(before) && afterByBefore.get(before)!==after)return null;
    afterByBefore.set(before,after);
  }
  return result;
}

function basinSurvey(map,seed) {
  const {routes,allowed,random}=makeChannel(map,seed);
  for(const route of routes){
    const lake=headwaterLake(map,route.river,allowed,random);
    for(let length=lake.length;length>=2;length--) {
      const basin=lake.slice(0,length),crossings=bridgeSurvey(map,route,basin);
      if(crossings)return {version:1,...route,lake:basin,crossings};
    }
  }
  return null;
}
export function planWaterways(map,seed) {
  const plan=basinSurvey(map,seed) || basinSurvey(map,0);
  if(!plan)throw new Error('No connected lake and river in the regional survey.');
  return plan;
}

// Most rule queries share a plan object. Reconnected JSON and seat projections
// can supply equivalent new objects, so keep a small content cache as well.
const byPlan=new WeakMap(),recentCharts=new Map();
export function waterwayChart(base,plan) {
  if(plan?.version!==1)return base;
  const remembered=byPlan.get(plan);
  if(remembered?.base===base)return remembered.map;
  const key=base.id+'/'+base.mapSize+'/'+JSON.stringify(plan);
  let map=recentCharts.get(key);
  if(!map){
    const updates=new Map();
    for(const [kind,ids,name] of [['river',plan.river,plan.riverName],['lake',plan.lake,plan.lakeName]]){
      for(const id of ids){
        const tile=base.byId[id];
        if(tile)updates.set(id,{...tile,name,terrain:'ocean',waterway:kind,waterName:name,localityLabel:false});
      }
    }
    const apply=tile=>updates.get(tile.id) || tile;
    const crossings=[...base.crossings,...plan.crossings],tiles=base.tiles.map(apply);
    map={...base,tiles,terrainAtlas:base.terrainAtlas.map(apply),byId:Object.fromEntries(tiles.map(tile=>[tile.id,tile])),
      crossings,bridgesByTile:crossingIndex(crossings),waterways:plan};
  }
  recentCharts.delete(key);recentCharts.set(key,map);
  if(recentCharts.size>12)recentCharts.delete(recentCharts.keys().next().value);
  byPlan.set(plan,{base,map});
  return map;
}

// The published base atlas is common knowledge. A player's inland survey is
// the explored difference from it, never a recipe for regenerating the map.
export function chartedWaterways(plan,explored) {
  if(plan?.version!==1)return null;
  const river=plan.river.filter(id=>explored.has(id)),lake=plan.lake.filter(id=>explored.has(id));
  return {version:1,river,riverName:river.length ? plan.riverName : null,lakeName:lake.length ? plan.lakeName : null,
    mouth:explored.has(plan.mouth) && explored.has(plan.river.at(-1)) ? plan.mouth : null,lake,
    crossings:plan.crossings.filter(c=>explored.has(c.a) && explored.has(c.b) && explored.has(c.via))};
}
