import {WONDERS, universityYield, surveyCampus} from './wonders.js';
import {getVisibleTiles, projectForSeat, rememberVision} from './vision.js';
import {RESOURCES, populateDeposits, canSeeDeposits, canSurvey, SPECIAL_IMPROVEMENTS, serviceCity, connectedDeposit, resourceAccounts, bankHarvest, shipGoods, planShipment} from './resources.js';
export {RESOURCES, canSeeDeposits, canSurvey};
import { assignWorkforce, CITY_FOCUS } from "./workforce.js";
import { foodForecast, feedCity } from "./population.js";
// Shared rules for the browser and the authoritative room service.
import {campaignSeed, selectStarts, seededRandom, shuffled} from './opening.js';
import { PORT_BUILDINGS, VESSELS, findPortSite, fisheryPort } from "./maritime.js";
import {TECHS, CIVICS, ERA_UNITS, eraFor} from './progression.js';
export {TECHS, CIVICS, ERAS} from './progression.js';
export function getEra(state, seat) { return eraFor(state.players[seat]?.technologies, state.players[seat]?.civics); }
import {LOS_ANGELES, regionalMaps, validMapId} from './maps.js';
export {CAMPAIGN_MAPS, validMapId} from './maps.js';
import {barbarianRound,seedCamps,wildAt,wildForecast,resolveWildAttack} from "./barbarians.js";

export const MAX_ROUNDS = 30;
export const TARGET_SCORE = 125;
export const ACTIONS_PER_TURN = 2;
export const FACTIONS = [
  { id: "republic", nameZh:"加州共和国", name: "California Republic", color: "#efbb62", capital: "11,7", capitalName: "Downtown LA" },
  { id: "pacific", nameZh:"太平洋联盟", name: "Pacific Union", color: "#69b7c7", capital: "4,7", capitalName: "Santa Monica" },
  { id: "valley", nameZh:"山谷联盟", name: "Valley Coalition", color: "#8ab98a", capital: "10,2", capitalName: "Burbank" },
  { id: "arroyo", nameZh:"阿罗约同盟", name: "Arroyo League", color: "#dc8c9f", capital: "15,3", capitalName: "Pasadena" }
];
export const TERRAIN_NAMES = {
  ocean: "Open water", coast: "Coast", plains: "Lowlands", urban: "Urban",
  forest: "Woodland", hills: "Foothills", mountains: "Mountains"
};
const COLUMNS = 17;
const ROWS = 13;
const SHORE = [0, 0, 0, 0, 0, 1, 2, 4, 5, 5, 6, 6, 7];
const STARTING_TERRITORY = [
  ["11,7", "10,7", "11,8"],
  ["4,7", "5,7", "5,8"],
  ["10,2", "9,2", "10,1"],
  ["15,3", "14,3", "15,4"]
];
// A district can mark a landmark, override its terrain, or both.
const DISTRICTS = {
  "0,4": ["Malibu", "coast"],
  "2,3": ["Topanga", "mountains"],
  "3,4": ["Topanga Canyon", "forest"],
  "3,5": ["Pacific Palisades", "hills"],
  "4,6": ["Palisades Park", "forest"],
  "4,7": ["Santa Monica", "coast", "pier"],
  "5,7": ["Wilshire Montana", "urban"],
  "5,8": ["Venice", "coast"],
  "5,9": ["Marina del Rey", "coast"],
  "6,10": ["Playa del Rey", "coast"],
  "6,11": ["El Segundo", "coast"],
  "7,12": ["Manhattan Beach", "coast"],
  "6,5": ["Brentwood", "hills"],
  "6,6": ["Westwood", "urban", "ucla"],
  "7,4": ["Bel Air", "hills"],
  "7,7": ["Century City", "urban"],
  "7,8": ["Culver City", "urban"],
  "8,6": ["Beverly Hills", "urban"],
  "8,5": ["West Hollywood", "urban"],
  "8,7": ["Pico-Robertson", "urban"],
  "8,8": ["Baldwin Hills", "hills"],
  "8,9": ["View Park", "hills"],
  "6,9": ["Playa Vista", "plains"],
  "7,10": ["Westchester", "plains"],
  "7,11": ["Los Angeles International", "plains", "airport"],
  "8,11": ["Hawthorne", "plains"],
  "8,10": ["Inglewood", "urban"],
  "9,8": ["West Adams", "urban"],
  "10,9": ["Exposition Park", "forest"],
  "9,6": ["Fairfax", "urban"],
  "10,6": ["Koreatown", "urban"],
  "10,7": ["Pico-Union", "urban"],
  "11,7": ["Downtown LA", "urban", "downtown"],
  "11,8": ["South Park", "urban"],
  "12,7": ["Boyle Heights", "urban"],
  "12,8": ["Arts District", "urban"],
  "13,7": ["East Los Angeles", "urban"],
  "11,6": ["Echo Park", "urban"],
  "12,6": ["Lincoln Heights", "urban"],
  "11,5": ["Silver Lake", "hills"],
  "9,5": ["Hollywood", "urban"],
  "9,4": ["Hollywood Hills", "hills", "hollywood"],
  "10,4": ["Los Feliz", "hills"],
  "11,4": ["Griffith Park", "forest", "griffith"],
  "11,3": ["Verdugo Hills", "mountains"],
  "12,3": ["Glendale", "urban"],
  "13,4": ["Eagle Rock", "hills"],
  "14,4": ["Highland Park", "urban"],
  "13,5": ["Mount Washington", "hills"],
  "15,4": ["South Pasadena", "urban"],
  "15,3": ["Pasadena", "urban", "rosebowl"],
  "14,3": ["Arroyo Seco", "hills"],
  "15,2": ["Altadena", "forest"],
  "16,3": ["San Marino", "plains"],
  "15,5": ["Alhambra", "urban"],
  "16,6": ["San Gabriel", "urban"],
  "9,2": ["North Hollywood", "urban"],
  "10,2": ["Burbank", "urban", "studios"],
  "10,1": ["Sun Valley", "plains"],
  "8,3": ["Studio City", "urban"],
  "6,3": ["Sherman Oaks", "urban"],
  "5,2": ["Encino", "urban"],
  "7,1": ["Van Nuys", "urban"],
  "3,2": ["Woodland Hills", "hills"],
  "3,1": ["Canoga Park", "urban"],
  "1,2": ["Calabasas", "hills"],
  "2,0": ["Chatsworth", "hills"],
  "13,2": ["La Cañada Flintridge", "hills"],
  "13,0": ["Angeles National Forest", "mountains"],
  "14,8": ["Montebello", "urban"],
  "13,9": ["Commerce", "urban"],
  "12,9": ["Vernon", "urban"],
  "12,10": ["Huntington Park", "urban"],
  "14,11": ["Downey", "urban"],
  "11,11": ["Watts", "urban"],
  "10,12": ["Gardena", "plains"],
  "12,12": ["Compton", "urban"],
  "13,12": ["Lynwood", "urban"]
};
function terrainAt(q, r) {
  if (q < SHORE[r]) return "ocean";
  if (r >= 4 && q === SHORE[r]) return "coast";
  if ((r === 0 && q > 9) || (r <= 1 && q >= 13)) return "mountains";
  if (r <= 1 && q >= 9) return "hills";
  if (q < 10 && (r === 4 || (r === 3 && q < 6))) {
    return (q + r) % 3 === 0 ? "forest" : "mountains";
  }
  if ((r === 3 && q >= 10) || (r === 5 && q < 6) || (r < 3 && q === 0)) {
    return (q + r) % 3 === 0 ? "forest" : "hills";
  }
  if (r < 3 || (r >= 9 && (q * 3 + r) % 5 < 3)) return "plains";
  if (r === 4 && q >= 11) return "forest";
  return (q * 3 + r) % 7 === 0 ? "plains" : "urban";
}
const namedDistricts = Object.entries(DISTRICTS).map(([id, [name]]) => {
  const [q, r] = id.split(",").map(Number);
  return { q, r, name };
});
function nearbyName(q, r, terrain) {
  if (terrain === "ocean") return "Pacific Ocean";
  let nearest, best = Infinity;
  for (const district of namedDistricts) {
    const dx = q + (r % 2) / 2 - district.q - (district.r % 2) / 2;
    const distance = dx * dx + 0.75 * (r - district.r) ** 2;
    if (distance < best) { best = distance; nearest = district.name; }
  }
  const label = { urban: "district", hills: "foothills", mountains: "ridge", forest: "woodland", plains: "lowlands", coast: "coast" }[terrain];
  return nearest + " " + label;
}
export const TILES = [];
export const TILE_BY_ID = Object.create(null);
const adjacent = Object.create(null);
for (let r = 0; r < ROWS; r++) {
  for (let q = 0; q < COLUMNS; q++) {
    const id = q + "," + r;
    const district = DISTRICTS[id];
    const terrain = district?.[1] || terrainAt(q, r);
    const seat = FACTIONS.findIndex(faction => faction.capital === id);
    const tile = { id, q, r, name: district?.[0] || nearbyName(q, r, terrain), terrain, landmark: district?.[2] || null, capitalFor: seat < 0 ? null : seat };
    TILES.push(tile);
    TILE_BY_ID[id] = tile;
  }
}
for (const {id, q, r} of TILES) {
  const shift = r % 2;
  adjacent[id] = [
    [q - 1, r], [q + 1, r], [q - 1 + shift, r - 1], [q + shift, r - 1],
    [q - 1 + shift, r + 1], [q + shift, r + 1]
  ].map(([x, y]) => x + "," + y).filter(key => TILE_BY_ID[key]);
}
const losAngeles = {...LOS_ANGELES, tiles:TILES, byId:TILE_BY_ID, starts:STARTING_TERRITORY};
export function getMap(stateOrId) {
  const id = typeof stateOrId === 'string' ? stateOrId : stateOrId?.mapId;
  return id && Object.hasOwn(regionalMaps,id) ? regionalMaps[id] : losAngeles;
}
export function neighbors(id) {
  return adjacent[id] ? [...adjacent[id]] : [];
}
function isProductive(terrain) {
  return terrain === "coast" || terrain === "plains" || terrain === "urban";
}
export const UNIT_TYPES = {
  settler: {name:"Settler", era:"frontier", maxHp:60, moves:2, range:0, strength:0, required:14},
  scout: {name:"Scout", era:"frontier", role:"Recon unit", moves:3, maxHp:65, range:1, strength:22, required:7, captures:false,
    description:"Light reconnaissance infantry. Moves three points per turn, can skirmish with units, and cannot occupy cities."},
  builder: {name:"Builder", era:"frontier", maxHp:60, moves:2, range:0, strength:0, required:9},
  melee: {name:"Militia", era:"frontier", captures:true, upgrade:"riflemen", upgradeCost:10, maxHp:100, moves:2, range:1, strength:42, required:10},
  ranged: {name:"Rangers", era:"frontier", captures:false, upgrade:"artillery", upgradeCost:12, maxHp:80, moves:2, range:2, strength:35, required:12},
  ...ERA_UNITS,
  ...VESSELS
};
export const BUILDINGS = {
  ...WONDERS,
  ...PORT_BUILDINGS,
  granary: {name:"Granary", required:10, description:"Provides 2 food and housing for 2 more citizens."},
  neighborhood: {name:"Residential quarter", required:16, description:"Provides housing for 3 more citizens."},
  workshop: {name:"Workshop", required:13},
  monument: {name:"Monument", required:10},
  walls: {name:"City walls", required:14}
};
export const IMPROVEMENTS = {
  ...SPECIAL_IMPROVEMENTS,
  farm: {name:"Farm"}, mine: {name:"Mine"}, fishery: {name:"Fishery"}
};
function knows(state, seat, technology) {
  return state.players[seat]?.technologies?.includes(technology) === true;
}
function adopted(state, seat, civic) {
  return state.players[seat]?.civics?.includes(civic) === true;
}
function tradesBySea(state, city) {
  if (!knows(state,city.seat,'navigation')) return false;
  const {byId}=getMap(state);
  return city.buildings.includes('harbor') || byId[city.tile].terrain==='coast'
    || neighbors(city.tile).some(id=>byId[id].terrain==='ocean');
}
function hasPark(state, city) {
  return [city.tile,...adjacent[city.tile]].some(id => state.board[id].owner===city.seat
    && ['forest','hills'].includes(getMap(state).byId[id].terrain));
}
const PRODUCTS = {...UNIT_TYPES, ...BUILDINGS};
const terrainCost = {coast:1, urban:1, plains:1, hills:2, forest:2};
export function hexDistance(a, b) {
  const t = TILE_BY_ID[a], u = TILE_BY_ID[b];
  if (!t || !u) return Infinity;
  const x = t.q - Math.floor(t.r / 2) - u.q + Math.floor(u.r / 2);
  const z = t.r - u.r;
  return Math.max(Math.abs(x), Math.abs(z), Math.abs(x + z));
}
function mint(state, prefix) { return prefix + state.nextId++; }
function spawn(state,seat,type,tile) {
  const def = UNIT_TYPES[type];
  const maxHp = def.maxHp + (def.strength && adopted(state,seat,'mobilization') ? 20 : 0);
  const unit = {id:mint(state,'u'),seat,type,tile,hp:maxHp,maxHp,moves:def.moves,maxMoves:def.moves,charges:type === 'builder' ? 3 : def.charges || 0};
  state.units.push(unit);
  return unit;
}
function establish(state,seat,tile,original = false) {
  const city = {id:mint(state,'c'),name:getMap(state).byId[tile].name,seat,tile,hp:100,maxHp:100,population:1,food:0,buildings:[],queue:null,originalSeat:original ? seat : null};
  state.cities.push(city);
  state.board[tile] = {...state.board[tile],owner:seat,level:Math.max(1,state.board[tile].level)};
  if (!original || state.opening==='settlers') for (const next of adjacent[tile]) {
    const holding = state.board[next];
    if (!wildAt(state,next) && holding.owner === null && terrainCost[getMap(state).byId[next].terrain] && !state.units.some(u=>u.tile===next && u.seat!==seat)) {
      state.board[next] = {...holding,owner:seat};
    }
  }
  return city;
}
function addResearch(state) {
  const hasBots = state.players.some(player => player.bot);
  const players = state.players.map((player, seat) => {
    const faction = FACTIONS[player.faction];
    let name = player.name;
    if (player.bot && player.name === faction.nameZh) name = faction.name;
    if (hasBots && seat === 0 && !player.bot && player.name === "你") name = "You";
    return {...player, name, research: null, science: 0, technologies: [], culture: 0, civic: null, civics: []};
  });
  return {...state, rulesVersion: 3, players};
}
export function migrateGame(state) {
  if (state?.intel) return state;
  let migrated=migrateCore(state);
  if (migrated?.opening==='settlers' && migrated.resourceVersion!==1 && Number.isInteger(migrated.seed)) {
    migrated={...migrated,board:{...migrated.board},players:migrated.players.map((p,seat)=>({
      ...p,surveyEnabled:p.surveyEnabled ?? migrated.cities.some(city=>city.seat===seat)
    }))};
    populateDeposits(migrated,getMap(migrated),migrated.seed,neighbors);
    return rememberVision(migrated);
  }
  return migrated && !migrated.exploration ? rememberVision(migrated) : migrated;
}
function migrateCore(state) {
  if (!state) return state;
  if (state.rulesVersion === 3) {
    if (state.players.every(p => Array.isArray(p.civics) && Number.isFinite(p.culture) && Object.hasOwn(p,'civic'))) return state;
    return {...state, players: state.players.map(p => ({culture: 0, civic: null, civics: [], ...p}))};
  }
  if (state.rulesVersion === 2) return addResearch(state);
  const next = {...state,rulesVersion:2,nextId:1,units:[],cities:[],
    board:Object.fromEntries(Object.entries(state.board).map(([id,tile])=>[id,{...tile,improvement:null}])),
    players:state.players.map(player=>({...player}))};
  next.players.forEach((player,seat)=>{
    const home = getMap(state).starts[player.faction][0];
    establish(next,seat,home,true);
    spawn(next,seat,'settler',getMap(state).starts[seat][1]);
    spawn(next,seat,'melee',getMap(state).starts[seat][2]);
  });
  if (state.phase === 'playing') refreshScores(next);
  else next.legacyFinalScores = state.players.map(p=>p.score);
  return addResearch(next);
}
export function createGame(players = [{name:"You"}, ...FACTIONS.slice(1).map(()=>({bot:true}))], mapId = "la", {seed: requestedSeed} = {}) {
  if (!validMapId(mapId)) throw new Error("Choose a valid campaign map.");
  if (!Array.isArray(players) || players.length < 2 || players.length > 4) throw new Error("A campaign needs two to four factions.");
  const seed = campaignSeed(requestedSeed);
  const allocation = shuffled(FACTIONS.map((_,i)=>i), seededRandom(seed,'civilizations'));
  const starts = selectStarts(getMap(mapId), players.length, seed, neighbors, hexDistance);
  const next = {seed, mapId, opening:'settlers', rulesVersion:3, nextId:1, cities:[], units:[], round:1,turn:0,actionsLeft:ACTIONS_PER_TURN,phase:'playing',winners:[],
    board:Object.fromEntries(getMap(mapId).tiles.map(tile=>[tile.id,{owner:null,level:0,improvement:null}])),
    players:players.map((player,seat)=>({
      name:(typeof player === 'string' ? player : player?.name)?.trim().slice(0,32) || FACTIONS[allocation[seat]].name,
      bot:player?.bot===true,faction:allocation[seat],color:FACTIONS[allocation[seat]].color,capital:12,influence:6,score:0
    })),log:[{round:1,seat:0,type:'start',text:'The campaign has begun.'}]};
  starts.forEach(([site],seat)=>spawn(next,seat,'settler',site));
  seedCamps(next,getMap(next),neighbors,hexDistance);
  refreshScores(next);
  for (const player of next.players) player.surveyEnabled=false;
  populateDeposits(next,getMap(mapId),seed,neighbors);
  return rememberVision(addResearch(next));
}
function cityOrNull(state,id) { return state.cities.find(c=>c.id === id); }
export function getWonderSites(state,cityId,item) {
  return surveyCampus(state, cityOrNull(state,cityId), item, getMap(state), hexDistance);
}
export function getPortSite(state, cityId) {
  return findPortSite(state, cityOrNull(state, cityId), getMap(state).byId, neighbors);
}
function unitOrNull(state,id) { return state.units.find(u=>u.id === id); }
function cityWorkArea(state, city) {
  const map=getMap(state);
  const neighborsInRange=new Set([city.tile]);
  let ring=[city.tile];
  for (let distance=0;distance<2;distance++) {
    const next=[];
    for (const tile of ring) for (const id of adjacent[tile]) {
      if (neighborsInRange.has(id) || state.board[id]?.owner!==city.seat || !terrainCost[map.byId[id].terrain]) continue;
      neighborsInRange.add(id);next.push(id);
    }
    ring=next;
  }
  return [...neighborsInRange].filter(id=>id!==city.tile && !state.cities.some(c=>c.tile===id)).map(id=>map.byId[id]);
}
export function getCitizenWorkforce(state,cityId,focus) {
  const city=cityOrNull(state,cityId);
  if(!city)return null;
  const tiles=cityWorkArea(state,city).filter(tile=>
    !state.board[tile.id].pillaged && getWorkingCity(state,tile.id)?.id===city.id);
  return assignWorkforce(city,tiles,focus);
}
export function getCityYield(state,cityId) {
  const city = cityOrNull(state,cityId);
  if (!city) return {food:0,production:0,capital:0,influence:0};
  const work=getCitizenWorkforce(state,cityId).yields;
  const has = key=>city.buildings.includes(key);
  // Improvements within two hexes work the closest city; city id order breaks ties.
  let farms = 0, mines = 0, fisheries = 0, cropBonus = 0, materialBonus = 0;
  for (const tile of getMap(state).tiles) {
    const holding = state.board[tile.id];
    if (holding?.owner !== city.seat || !holding.improvement || holding.pillaged || getWorkingCity(state,tile.id)?.id !== city.id) continue;
    if (holding.improvement==='fishery') fisheries++;
    if (['farm','orchard'].includes(holding.improvement)) farms++;
    if (['mine','lumberCamp','quarry'].includes(holding.improvement)) mines++;
    if (connectedDeposit(holding)) {
      if (['grain','citrus','fish'].includes(holding.resource)) cropBonus++;
      else materialBonus++;
    }
  }
  const civics = knows(state, city.seat, 'civics');
  const steam = has('workshop') && knows(state, city.seat, 'steam');
  const trade = tradesBySea(state,city);
  return {
    food: 4 + work.food + cropBonus + fisheries * 2 + (adopted(state,city.seat,'conservation') && hasPark(state,city) ? 1 : 0) + farms * 2 + (has('granary') ? 2 : 0) + (knows(state, city.seat, 'agronomy') ? 2 : 0),
    production:universityYield(city,'production')+ 3 + work.production + materialBonus + (has('shipyard') ? 2 : 0) + Number(adopted(state,city.seat,'publicWorks')) + Math.floor(city.population / 2) + mines * 2 + (has('workshop') ? 2 : 0) + (knows(state, city.seat, 'industry') ? 2 : 0) + (steam ? 2 : 0) + (knows(state, city.seat, 'motorization') ? 2 : 0),
    capital: city.population + fisheries + (has('harbor') ? 2 : 0) + (civics ? 2 : 0) + (trade ? 2 : 0),
    influence: (has('monument') ? 3 : 0) + (civics ? 1 : 0)
  };
}
export function getPopulationReport(state, cityId) {
  const city = cityOrNull(state, cityId);
  return city ? foodForecast(city, getCityYield(state, cityId).food) : null;
}
export function getStats(state,seat) {
  let territories=0,developments=0,landmarks=0,improvements=0,productive=0,fisheries=0;
  for (const tile of getMap(state).tiles) {
    const holding = state.board[tile.id];
    if (holding.owner !== seat) continue;
    territories++; developments+=holding.level;
    if (tile.landmark) landmarks++;
    if (holding.improvement) improvements++;
    if (holding.improvement==='fishery') fisheries++;
    if (isProductive(tile.terrain)) productive+=holding.level;
  }
  const cities=(state.cities||[]).filter(c=>c.seat===seat);
  const count=cities.length,population=cities.reduce((sum,c)=>sum+c.population,0);
  const buildings=cities.reduce((sum,c)=>sum+c.buildings.length,0);
  const monuments=cities.filter(c=>c.buildings.includes('monument')).length;
  const settled = count > 0 || state.opening !== 'settlers';
  const score=territories*2+developments+landmarks*2+count*3+population+buildings*2+improvements;
  return {territories,developments,landmarks,improvements,cities:count,population,buildings,units:(state.units||[]).filter(u=>u.seat===seat).length,
    score:state.legacyFinalScores?.[seat] ?? score,
    cultureIncome:cities.reduce((n,c)=>n+universityYield(c,'culture'),0)+Number(settled)+count+2*monuments+(adopted(state,seat,'charter') ? count : 0)
      +(adopted(state,seat,'conservation') ? cities.filter(c=>hasPark(state,c)).length : 0),
    scienceIncome:cities.reduce((n,c)=>n+universityYield(c,'science'),0)+2*Number(settled)+count+cities.reduce((sum,c)=>sum+getCitizenWorkforce(state,c.id).yields.science,0)+Math.floor(population/3)+(knows(state,seat,'radio') ? 2*count : 0)
      +(adopted(state,seat,'publicRadio') ? 2*count : 0),
    capitalIncome:3*Number(settled)+fisheries+2*cities.filter(c=>c.buildings.includes('harbor')).length+Math.floor(territories/2)+productive+population+(knows(state,seat,'civics') ? 2*count : 0)
      +2*cities.filter(c=>tradesBySea(state,c)).length,
    influenceIncome:2*Number(settled)+Math.floor(territories/3)+developments-productive+3*monuments+(knows(state,seat,'civics') ? count : 0)};
}
function refreshScores(state) { state.players.forEach((p,i)=>{p.score=getStats(state,i).score;}); }
function record(state,seat,type,text,tile,detail={}) {
  state.log.push({round:state.round,seat,type,text,...(tile ? {tile}:{}),...detail});
  if (state.log.length>160) state.log.shift();
}
function territoryOrder(state,seat,tile) {
  if (tile.terrain==='ocean' || wildAt(state,tile.id)) return null;
  const {owner,level}=state.board[tile.id];
  if (state.board[tile.id].wonder || state.cities.some(c=>c.queue?.site===tile.id)) return null;
  if (owner===seat) return level<3 ? {type:'develop',label:'Develop district',cost:{capital:5+level*3,influence:0}} : null;
  if (state.cities.some(c=>c.tile===tile.id) || state.units.some(u=>u.tile===tile.id && u.seat!==seat)) return null;
  if (owner===null) return {type:'claim',label:'Claim district',cost:{capital:4,influence:0}};
  return {type:'contest',label:'Contest district',cost:{capital:4,influence:5+level*2}};
}
export function getActions(state,seat,id) {
  const tile=getMap(state).byId[id], player=state.players[seat];
  if (!tile || !player) return [];
  const order=territoryOrder(state,seat,tile);
  if (!order) return [];
  let reason='';
  if (state.phase!=='playing') reason='The campaign has ended.';
  else if (state.turn!==seat) reason='Wait for your turn.';
  else if (state.actionsLeft<=0) reason='You have used all district orders this turn.';
  else if (order.type!=='develop' && !adjacent[id].some(key=>state.board[key].owner===seat)) reason='Choose a district next to your territory.';
  else if (player.capital<order.cost.capital) reason='You need '+order.cost.capital+' capital.';
  else if (player.influence<order.cost.influence) reason='You need '+order.cost.influence+' influence.';
  return [{...order,enabled:!reason,reason}];
}
function movementCost(state,unit, tileId) {
  const terrain=getMap(state).byId[tileId].terrain;
  return UNIT_TYPES[unit.type].domain==='sea' ? Number(terrain==='ocean') : terrainCost[terrain];
}
function bridgeTo(state,from,to) {
  return getMap(state).bridgesByTile?.[from]?.find(bridge=>bridge.to===to);
}
function routeStepCost(state,unit,from,to) {
  return UNIT_TYPES[unit.type].domain!=='sea' && bridgeTo(state,from,to) ? 2 : movementCost(state,unit,to);
}
export function getRouteDetail(state,unitId,target) {
  const unit=unitOrNull(state,unitId),path=getMovePath(state,unitId,target);
  if(!unit || !path.length)return null;
  let cost=0;
  const crossings=[];
  for(let i=1;i<path.length;i++){
    cost+=routeStepCost(state,unit,path[i-1],path[i]);
    const bridge=bridgeTo(state,path[i-1],path[i]);if(bridge)crossings.push(bridge.name);
  }
  return {path,cost,crossings};
}
// The search budget is the unit's remaining movement on this turn.
function findRoutes(state,unit) {
  const seen=(state.intel || state.opening==='settlers' || state.enforceSight) && getVisibleTiles(state,unit.seat);
  const costs=new Map([[unit.tile,0]]),parents=new Map(),queue=[unit.tile];
  const blocked=new Set(state.units.filter(u=>u.id!==unit.id).map(u=>u.tile));
  for (const c of state.cities) if (c.seat!==unit.seat) blocked.add(c.tile);
  for (const group of [state.barbarians?.camps,state.barbarians?.parties]) for (const p of group || []) blocked.add(p.tile);
  for (let i=0;i<queue.length;i++) {
    const here=queue[i];
    const bridges=UNIT_TYPES[unit.type].domain!=='sea' && getMap(state).bridgesByTile?.[here];
    const directions=bridges ? [...adjacent[here],...bridges.map(link=>link.to)] : adjacent[here];
    for (const next of directions) {
      const step=routeStepCost(state,unit,here,next);
      if (!step || blocked.has(next) || (seen && !seen.has(next))) continue;
      const cost=costs.get(here)+step;
      if (cost>unit.moves || cost>=(costs.get(next)??Infinity)) continue;
      costs.set(next,cost); parents.set(next,here); queue.push(next);
    }
  }
  return {costs,parents};
}
function active(state,unit) { return unit && state.phase==='playing' && state.turn===unit.seat && unit.moves>0; }
export function getMovePath(state,unitId,target) {
  const unit=unitOrNull(state,unitId);
  if (!active(state,unit) || target===unit.tile) return [];
  const {parents}=findRoutes(state,unit);
  if (!parents.has(target)) return [];
  const path=[target];
  while (path[0]!==unit.tile) path.unshift(parents.get(path[0]));
  return path;
}
function nearestSettlement(state, tileId) {
  let nearest = null;
  for (const city of state.cities) {
    const distance = hexDistance(city.tile, tileId);
    if (!nearest || distance < nearest.distance) {
      nearest = {id: city.id, name: city.name, tile: city.tile, distance};
    }
  }
  return nearest;
}
function settlementRestriction(state, seat, tile, nearest) {
  if (!terrainCost[tile.terrain] || state.board[tile.id].wonder || state.cities.some(c=>c.queue?.site===tile.id)) return 'terrain';
  const owner = state.board[tile.id].owner;
  if (owner !== null && owner !== seat) return 'ownership';
  if (nearest && nearest.distance < 3) return 'spacing';
  return null;
}
function canSettle(state, seat, id) {
  return !settlementRestriction(state, seat, getMap(state).byId[id], nearestSettlement(state, id));
}
export function getSettlementAssessment(state, unitId, tileId) {
  const unit = unitOrNull(state, unitId);
  const tile = getMap(state).byId[tileId];
  const nearest = tile ? nearestSettlement(state, tileId) : null;
  const assessment = {
    status: 'invalid', reason: '', canFoundThisTurn: false, canFoundNextTurn: false,
    reachable: false, nearestCity: nearest, distanceToNearestCity: nearest?.distance ?? null,
    terrainCost: tile ? terrainCost[tile.terrain] ?? null : null, moveCost: null, movesAfter: null
  };
  if (!tile) return {...assessment, reason: 'Select a tile on the map.'};
  if (unit?.type !== 'settler') return {...assessment, reason: 'Select a settler to survey this tile.'};
  if (state.phase !== 'playing') return {...assessment, reason: 'The campaign has ended.'};
  if (unit.seat !== state.turn) return {...assessment, reason: 'Wait for the settler’s turn.'};

  const cost = tileId === unit.tile ? 0 : findRoutes(state, unit).costs.get(tileId);
  assessment.reachable = cost !== undefined;
  assessment.moveCost = cost ?? null;
  assessment.movesAfter = assessment.reachable ? unit.moves - cost : null;

  const restriction = settlementRestriction(state, unit.seat, tile, nearest);
  if (restriction === 'terrain') {
    assessment.reason = tile.terrain === 'ocean' ? 'Cities need land. This tile is open water.' : 'Mountain terrain is impassable.';
  } else if (restriction === 'ownership') {
    const owner = state.board[tileId].owner;
    assessment.reason = FACTIONS[state.players[owner].faction].name+' owns this tile. Settle on friendly or neutral land.';
  } else if (restriction === 'spacing') {
    assessment.reason = nearest.distance === 0
      ? nearest.name+' already occupies this tile. Cities must be at least 3 hexes apart.'
      : nearest.name+' is '+nearest.distance+(nearest.distance === 1 ? ' hex' : ' hexes')+' away. Cities must be at least 3 hexes apart.';
  } else if (state.units.some(other => other.id !== unitId && other.tile === tileId)) {
    assessment.reason = 'Another unit occupies this tile.';
  } else if (!assessment.reachable) {
    assessment.reason = 'This tile is outside the settler’s remaining movement range.';
  } else if (assessment.movesAfter === 0) {
    assessment.status = 'next-turn';
    assessment.canFoundNextTurn = true;
    assessment.reason = cost === 0 ? 'Movement is spent. Found here next turn.' : 'Reaching this tile uses all movement. Found here next turn.';
  } else {
    assessment.status = 'now';
    assessment.canFoundThisTurn = true;
    assessment.reason = cost === 0 ? 'Found a city here this turn.' : 'Move here and found a city this turn.';
  }
  return assessment;
}
export function getResourceLedger(state,seat) { return resourceAccounts(state,seat,getMap(state).byId,neighbors); }
export function getWorkingCity(state,id) {
  return serviceCity(state,id,getMap(state).byId,neighbors);
}
function improvementAt(state,seat,id) {
  if(state.board[id].wonder || state.cities.some(c=>c.queue?.site===id)) return null;
  if (state.board[id].owner!==seat || state.board[id].improvement || state.cities.some(c=>c.tile===id)) return null;
  if (!getWorkingCity(state,id) || state.board[id].wonder || state.cities.some(city=>city.queue?.site===id)) return null;
  const deposit=RESOURCES[state.board[id].resource];
  if (deposit) return deposit.improvement;
  const terrain=getMap(state).byId[id].terrain;
  return isProductive(terrain) ? 'farm' : terrain==='forest' || terrain==='hills' ? 'mine' : null;
}
function unitImprovement(state,unit,tile) {
  if (!unit.charges) return null;
  if (unit.type==='workboat') return fisheryPort(state,unit.seat,tile,getMap(state).byId, neighbors) ? 'fishery' : null;
  return unit.type==='builder' ? improvementAt(state,unit.seat,tile) : null;
}
function attackTargets(state,unit) {
  const range=UNIT_TYPES[unit.type].range;
  if (!range) return [];
  // A land melee unit can contest a defended end of a bridge with a full crossing order.
  const sight=(state.intel || state.opening==='settlers' || state.enforceSight) && getVisibleTiles(state,unit.seat);
  const inRange=tile=>(!sight||sight.has(tile)) && (hexDistance(unit.tile,tile)<=range || (UNIT_TYPES[unit.type].captures && unit.moves>=2 && Boolean(bridgeTo(state,unit.tile,tile))));
  const occupied=state.units.filter(u=>u.seat!==unit.seat && inRange(u.tile)).map(u=>u.tile);
  const cities=state.cities.filter(c=>c.seat!==unit.seat && inRange(c.tile) && (UNIT_TYPES[unit.type].captures || c.hp>1)).map(c=>c.tile);
  const wilds=[...(state.barbarians?.camps||[]),...(state.barbarians?.parties||[])].filter(t=>inRange(t.tile) && (t.type!=="camp" || unit.type!=="scout" && (t.hp>1 || UNIT_TYPES[unit.type].captures)));
  return [...new Set([...occupied,...(unit.type==='scout'?[]:cities),...wilds.map(p=>p.tile)])];
}
function fieldUpgrade(state, unit) {
  const source = UNIT_TYPES[unit.type];
  if (!source.upgrade) return null;
  const next = UNIT_TYPES[source.upgrade];
  if (!knows(state,unit.seat,next.tech)) return null;
  let reason = '';
  if (state.board[unit.tile].owner !== unit.seat) reason = 'Move into your territory to upgrade.';
  else if (state.players[unit.seat].capital < source.upgradeCost) reason = 'Your treasury cannot cover this upgrade.';
  return {to:source.upgrade, cost:source.upgradeCost, enabled:!reason, reason};
}
export function getUnitOptions(state,unitId) {
  const empty={moves:[],attacks:[],canFound:false,improvements:[],upgrade:null},unit=unitOrNull(state,unitId);
  if (!active(state,unit)) return empty;
  const improvement=unitImprovement(state,unit,unit.tile);
  return {moves:[...findRoutes(state,unit).parents.keys()],attacks:attackTargets(state,unit),upgrade:fieldUpgrade(state,unit),
    canFound:unit.type==='settler' && canSettle(state,unit.seat,unit.tile),improvements:improvement ? [improvement]:[]};
}
export function getProductionOptions(state,cityId) {
  const city=cityOrNull(state,cityId);
  if (!city) return [];
  const rate=getCityYield(state,city.id).production;
  return Object.entries(PRODUCTS).map(([item,def])=>{
    const kind=Object.hasOwn(UNIT_TYPES,item) ? 'unit':'building';
    let reason='';
    if (state.phase!=='playing') reason='The campaign has ended.';
    else if (city.seat!==state.turn) reason='Wait for the city owner’s turn.';
    else if (city.queue) reason='This city already has a project in progress.';
    else if (city.buildings.includes(item)) reason='This city already has that building.';
    else if (def.civic && !adopted(state,city.seat,def.civic)) reason='Requires '+CIVICS[def.civic].name+'.';
    else if (item==='harbor' && !getPortSite(state,city.id)) reason='Settle on the shore or claim a shore district connected to this city within two hexes.';
    else if ((item==='shipyard' || def.domain==='sea') && !city.buildings.includes('harbor')) reason='Build a harbor in this city first.';
    else if (item==='frigate' && !city.buildings.includes('shipyard')) reason='Build a shipyard in this city first.';
    else if (def.tech && !knows(state,city.seat,def.tech)) reason='Requires '+TECHS[def.tech].name+'.';
    else if (WONDERS[item] && !getWonderSites(state,city.id,item).length) reason='Claim an empty land tile within two hexes of the city.';
    return {item,label:def.name,kind,era:def.era || null,turns:Math.ceil(def.required/rate),required:def.required,enabled:!reason,reason};
  });
}
const SCIENCE = {tree: TECHS, bank:'science', income:'scienceIncome', known:'technologies', focus:'research',
  order:'research', event:'discovery', verb:'discovered'};
const CULTURE = {tree: CIVICS, bank:'culture', income:'cultureIncome', known:'civics', focus:'civic',
  order:'civic', event:'adoption', verb:'adopted'};

function councilOptions(state, seat, track) {
  const player = state.players[seat];
  if (!player) return [];
  const known = player[track.known] || [];
  const bank = player[track.bank] || 0;
  const income = getStats(state, seat)[track.income];
  return Object.entries(track.tree).map(([item, project]) => {
    const completed = known.includes(item);
    const active = player[track.focus] === item;
    const missing = project.requires.filter(key => !known.includes(key));
    let reason = "";
    if (state.phase !== "playing") reason = "The campaign has ended.";
    else if (state.turn !== seat) reason = "Wait for your turn.";
    else if (completed) reason = "Your faction has already completed this project.";
    else if (active) reason = "This is your current project.";
    else if (missing.length) reason = "Requires " + missing.map(key=>track.tree[key].name).join(" + ") + ".";
    const turns = completed ? 0 : Math.max(0, Math.ceil((project.cost - bank) / income));
    return {item, label: project.name, description: project.description, cost: project.cost, era: project.era,
      requires: project.requires, locked: missing.length>0, completed, active, turns, enabled: !reason, reason};
  });
}
export function getResearchOptions(state, seat) { return councilOptions(state,seat,SCIENCE); }
export function getCivicOptions(state, seat) { return councilOptions(state,seat,CULTURE); }

function finishProject(state, seat, track) {
  const player = state.players[seat], item = player[track.focus];
  if (!item || player[track.bank] < track.tree[item].cost) return;
  player[track.bank] -= track.tree[item].cost;
  player[track.known] = [...player[track.known], item];
  player[track.focus] = null;
  record(state, seat, track.event, FACTIONS[state.players[seat].faction].name+' '+track.verb+' '+track.tree[item].name+'.', null, {item});
}
function selectProject(state, seat, item, track) {
  const option = councilOptions(state, seat, track).find(project => project.item === item);
  if (!option?.enabled) throw new Error(option?.reason || "Choose an available council project.");
  state.players[seat][track.focus] = item;
  const verb = track === SCIENCE ? ' began researching ' : ' began debating ';
  record(state, seat, track.order, FACTIONS[state.players[seat].faction].name+verb+option.label+'.', null, {item});
  finishProject(state, seat, track);
}
function cloneGame(state) {
  // Records are cloned at the action boundary so optimistic retries cannot mutate the old revision.
  return {...state,board:{...state.board},players:state.players.map(p=>({...p})),units:state.units.map(u=>({...u})),
    cities:state.cities.map(c=>({...c,buildings:[...c.buildings],queue:c.queue ? {...c.queue}:null})),log:[...state.log]};
}
function produceCityTurn(state,city) {
  const yieldNow=getCityYield(state,city.id);
  const previousPopulation=city.population;
  feedCity(city, foodForecast(city,yieldNow.food));
  if (city.population!==previousPopulation) {
    const verb=city.population>previousPopulation?' grew to ':' fell to ';
    record(state,city.seat,'population',city.name+verb+city.population+' residents.',city.tile,{city:city.id});
  }
  const queue=city.queue;
  if (!queue) return;
  queue.progress=Math.min(queue.required,queue.progress+yieldNow.production);
  if (queue.progress<queue.required) return;
  if (Object.hasOwn(UNIT_TYPES,queue.item)) {
    const vessel=UNIT_TYPES[queue.item].domain==='sea';
    const origin=vessel ? city.portTile : city.tile;
    if (!origin) return;
    const spawnTile=[origin,...adjacent[origin]].find(id=>(vessel ? getMap(state).byId[id].terrain==='ocean' : terrainCost[getMap(state).byId[id].terrain]) &&
      !wildAt(state,id) && !state.units.some(u=>u.tile===id) && !state.cities.some(c=>c.tile===id && c.seat!==city.seat) &&
      (state.board[id].owner===null || state.board[id].owner===city.seat));
    if (!spawnTile) return;
    spawn(state,city.seat,queue.item,spawnTile).moves=0;
  } else {
    if (queue.item==='harbor') {
      const tile = queue.portTile || getPortSite(state,city.id);
      if (!tile) return;
      city.portTile = tile;
    }
    if (WONDERS[queue.item] && queue.site) {
      const terrain=getMap(state).byId[queue.site].terrain;
      state.board[queue.site]={...state.board[queue.site],wonder:queue.item,wonderCity:city.id};
      if (WONDERS[queue.item].terrain.includes(terrain)) city.campusHonors=[...(city.campusHonors||[]),queue.item];
    }
    city.buildings.push(queue.item);
    if (queue.item==='walls') {city.maxHp+=50; city.hp=Math.min(city.maxHp,city.hp+50);}
  }
  record(state,city.seat,'complete',city.name+' completed '+PRODUCTS[queue.item].name+'.',city.tile,{item:queue.item,city:city.id});
  city.queue=null;
}
function finish(state,winners,reason) {
  state.phase='finished';state.winners=winners;state.actionsLeft=0;state.victoryReason=reason;
  const names=winners.map(i=>FACTIONS[state.players[i].faction].name).join(' and ');
  const message=reason==='survival' ? names+' is the last civilization standing.' : reason==='domination' ? names+' controls every original capital.' : names+(winners.length===1 ? ' won' : ' shared victory')+' with '+state.players[winners[0]].score+' civic points.';
  record(state,winners[0],'finish',message);
}
function endTurn(state,seat) {
  const income=getStats(state,seat),player=state.players[seat];
  bankHarvest(state,seat,getMap(state).byId,neighbors);
  player.capital+=income.capitalIncome;player.influence+=income.influenceIncome;
  for (const city of state.cities) if (city.seat===seat) produceCityTurn(state,city);
  player.science += income.scienceIncome;
  player.culture += income.cultureIncome;
  finishProject(state, seat, SCIENCE);
  finishProject(state, seat, CULTURE);
  refreshScores(state);
  record(state,seat,'end',FACTIONS[state.players[seat].faction].name+' ended its turn.');
  let next=(seat+1)%state.players.length;
  while (state.players[next].eliminated && next!==seat) next=(next+1)%state.players.length;
  if (next<=seat) {
    const top=Math.max(...state.players.filter(p=>!p.eliminated).map(p=>p.score));
    if (state.round>=MAX_ROUNDS || top>=TARGET_SCORE) {
      finish(state,state.players.map((p,i)=>!p.eliminated && p.score===top ? i : -1).filter(i=>i>=0),'civic');
      return;
    }
    state.round++;
    barbarianRound(state,getMap(state),neighbors,hexDistance,UNIT_TYPES,record);
  }
  state.turn=next;state.actionsLeft=ACTIONS_PER_TURN+Number(adopted(state,next,'federation'));
  const towns=state.cities.filter(c=>c.seat===next);
  for (const city of towns) city.hp=Math.min(city.maxHp,city.hp+6);
  for (const unit of state.units) if (unit.seat===next) {
    unit.moves=unit.maxMoves;
    const repairs=towns.some(c=>c.tile===unit.tile || (UNIT_TYPES[unit.type].domain==='sea' && c.portTile && hexDistance(c.portTile,unit.tile)<=1));
    if (repairs) unit.hp=Math.min(unit.maxHp,unit.hp+12);
  }
}
// Compute spotter-assisted forecasts on the authority without disclosing rival
// research or a city's private construction queue to the attacking client.
export function campaignView(state, seat) {
  if(!state || state.intel?.seat===seat) return state;
  const view=projectForSeat(state,seat), forecasts={};
  if(state.phase==='playing' && state.turn===seat) {
    const visible=new Set(view.intel.visible);
    for(const unit of view.units) {
      if(unit.seat!==seat || !unit.moves || !UNIT_TYPES[unit.type].range)continue;
      for(const target of attackTargets(state,unit)) {
        if(!visible.has(target))continue;
        const forecast=combatPreview(state,unit.id,target);
        if(forecast)(forecasts[unit.id]??={})[target]=forecast;
      }
    }
  }
  return {...view,intel:{...view.intel,forecasts}};
}

export function combatPreview(state, unitId, target) {
  if(state.intel) return state.intel.forecasts?.[unitId]?.[target] ?? null;
  const unit = unitOrNull(state, unitId);
  if (!active(state, unit) || !attackTargets(state, unit).includes(target)) return null;

  const wild=wildAt(state,target);
  if (wild) return wildForecast(unit,UNIT_TYPES[unit.type],wild);

  // A garrison absorbs the hit before the city can be damaged.
  const defender = state.units.find(other => other.tile === target && other.seat !== unit.seat);
  const town = state.cities.find(city => city.tile === target && city.seat !== unit.seat);
  const opponent = defender || town;
  const canCapture = UNIT_TYPES[unit.type].captures === true;
  const melee = canCapture || unit.type==='scout';
  const walls = !!town?.buildings.includes('walls');
  const terrain = getMap(state).byId[target].terrain;
  const terrainDefense = terrain === 'hills' || terrain === 'forest' ? 4 : 0;
  const strength = Math.round(UNIT_TYPES[unit.type].strength * (0.75 + 0.25 * unit.hp / unit.maxHp));
  const attackBonus = (knows(state, unit.seat, 'tactics') ? 7 : 0)
    + (UNIT_TYPES[unit.type].range > 1 && knows(state, unit.seat, 'ballistics') ? 5 : 0);
  let damage = Math.min(opponent.hp, Math.max(1, strength + attackBonus - terrainDefense - (walls ? 7 : 0)));
  let retaliation = 0;
  if (melee) {
    if (defender) {
      const military = UNIT_TYPES[defender.type].strength;
      retaliation = Math.round(military * (0.45 + 0.15 * defender.hp / defender.maxHp));
      if (military && knows(state, defender.seat, 'tactics')) retaliation += 3;
    } else {
      retaliation = walls ? 24 : 15;
    }
  }
  retaliation = Math.min(retaliation, unit.hp);
  const attackerHpAfter = unit.hp - retaliation;
  if (!defender && (!canCapture || attackerHpAfter === 0)) damage = Math.min(damage, town.hp - 1);
  const defenderHpAfterHit = opponent.hp - damage;
  const capture = !defender && defenderHpAfterHit === 0;
  const defeated = !!defender && defenderHpAfterHit === 0;
  const advances = melee && movementCost(state,unit,target)>0 && attackerHpAfter > 0 && (capture || (defeated && !town));
  return {
    defenderType: defender ? 'unit' : 'city', defenderId: opponent.id,
    damage, retaliation, capture, defeated, advances, attackerDefeated: attackerHpAfter === 0,
    attackerHpBefore: unit.hp, defenderHpBefore: opponent.hp, attackerHpAfter, defenderHpAfterHit,
    defenderHpAfter: capture ? Math.ceil(town.maxHp / 2) : defenderHpAfterHit
  };
}
function resolveAttack(state, unit, target) {
  const result = combatPreview(state, unit.id, target);
  if (!result) throw new Error('Choose an enemy unit or city within range.');
  if (result.defenderType==="wild") return resolveWildAttack(state,unit,wildAt(state,target),result,record);
  const from = unit.tile;
  const isUnit = result.defenderType === 'unit';
  const defender = isUnit ? unitOrNull(state, result.defenderId) : cityOrNull(state, result.defenderId);
  const name = isUnit ? UNIT_TYPES[defender.type].name+' in '+getMap(state).byId[target].name : defender.name;
  defender.hp = result.defenderHpAfter;
  if (result.capture) {
    defender.seat = unit.seat;
    defender.queue = null;
    for (const [id,holding] of Object.entries(state.board)) {
      if (holding.wonderCity===defender.id) state.board[id]={...holding,owner:unit.seat};
    }
    if (defender.portTile) {
      for (const [tile,holding] of Object.entries(state.board)) {
        if (holding.improvement==='fishery' && holding.portCity===defender.id) state.board[tile]={...holding,owner:unit.seat};
      }
    }
    state.board[target] = {...state.board[target], owner: unit.seat};
  }
  unit.hp = result.attackerHpAfter;
  unit.moves = 0;
  if (result.advances) unit.tile = target;
  if (result.attackerDefeated || result.defeated) state.units = state.units.filter(other => other.hp > 0);
  const text = UNIT_TYPES[unit.type].name+(result.capture ? ' captured ' : ' attacked ')+name+' for '+result.damage+' damage.';
  record(state, unit.seat, 'attack', text, target, {unit: unit.id, from, ...result});
  if (state.opening==='settlers') {
    for (const [seat,player] of state.players.entries()) {
      if (player.eliminated || state.cities.some(c=>c.seat===seat) || state.units.some(u=>u.seat===seat && u.type==='settler')) continue;
      player.eliminated=true;
      state.units=state.units.filter(u=>u.seat!==seat);
      for (const [id,h] of Object.entries(state.board)) if(h.owner===seat) state.board[id]={...h,owner:null,level:0};
    }
  }
  const ownsCapitals=state.players.every((player,seat) => state.cities.some(c => c.originalSeat===seat && c.seat===unit.seat));
  const remaining=state.players.map((p,i)=>p.eliminated ? -1 : i).filter(i=>i>=0);
  if (result.capture && ownsCapitals) {
    refreshScores(state);
    finish(state, [unit.seat], 'domination');
  } else if (state.opening==='settlers' && remaining.length===1) {
    refreshScores(state);
    finish(state, remaining, 'survival');
  }
}
function unitOrder(state,seat,action) {
  const unit=unitOrNull(state,action.unit);
  if (!unit || unit.seat!==seat) throw new Error('Choose one of your units.');
  if (!unit.moves) throw new Error('This unit has spent its movement for the turn.');
  const id=unit.tile, label=UNIT_TYPES[unit.type].name;
  if (action.type==='move') {
    const path=getMovePath(state,unit.id,action.tile);
    if (!path.length) throw new Error('Choose an unoccupied tile within movement range.');
    unit.moves-=path.slice(1).reduce((sum,k,i)=>sum+routeStepCost(state,unit,path[i],k),0);
    unit.tile=action.tile;
    record(state,seat,'move',label+' moved to '+getMap(state).byId[unit.tile].name+'.',unit.tile,{from:id,unit:unit.id,path});
  } else if (action.type==='survey') {
    if (!canSurvey(state,unit)) throw new Error('This unit cannot start a resource survey.');
    unit.moves--;
    state.players[seat].surveyEnabled=true;
    record(state,seat,'survey','Resource survey completed.',id,{unit:unit.id});
  } else if (action.type==='upgrade') {
    const upgrade=fieldUpgrade(state,unit);
    if (!upgrade?.enabled) throw new Error(upgrade?.reason || 'No field upgrade is available.');
    const def=UNIT_TYPES[upgrade.to];
    const trainingBonus=unit.maxHp-UNIT_TYPES[unit.type].maxHp;
    const maxHp=def.maxHp+trainingBonus;
    const hp=Math.max(1,Math.floor(unit.hp/unit.maxHp*maxHp));
    Object.assign(unit,{type:upgrade.to,maxHp,hp,moves:0,maxMoves:def.moves});
    state.players[seat].capital-=upgrade.cost;
    record(state,seat,'upgrade',label+' upgraded to '+def.name+'.',id,{unit:unit.id,item:upgrade.to});
  } else if (action.type==='attack') {
    resolveAttack(state,unit,action.tile);
  } else if (action.type==='found') {
    if (unit.type!=='settler' || !canSettle(state,seat,id)) throw new Error('Found a city on friendly or neutral land at least three hexes from every other city.');
    const first=state.opening==='settlers' && !state.cities.some(c=>c.originalSeat===seat);
    const city=establish(state,seat,id,first);
    state.players[seat].surveyEnabled=true;
    state.units=state.units.filter(u=>u.id!==unit.id);
    record(state,seat,'found',FACTIONS[state.players[seat].faction].name+' founded a city at '+city.name+'.',id,{city:city.id,unit:unit.id});
  } else {
    const item=unitImprovement(state,unit,id);
    if (!item || item!==action.item) throw new Error(unit.type==='workboat'
      ? 'Build a fishery on open water within two water hexes of a friendly harbor.'
      : 'Build a suitable improvement on one of your unimproved districts.');
    const port=item==='fishery' ? fisheryPort(state,seat,id,getMap(state).byId, neighbors) : null;
    state.board[id]={...state.board[id],improvement:item,...(port ? {owner:seat,portCity:port.id} : {})};
    unit.moves=0;unit.charges--;
    if (!unit.charges) state.units=state.units.filter(u=>u.id!==unit.id);
    record(state,seat,'improve',label+' built a '+IMPROVEMENTS[item].name.toLowerCase()+' in '+getMap(state).byId[id].name+'.',id,{unit:unit.id,item});
  }
}
export function applyAction(source,seat,action) {
  const current=migrateGame(source);
  return rememberVision(resolveOrder(current,seat,action),current);
}
function resolveOrder(source,seat,action) {
  const state=migrateGame(source);
  if (state.phase!=='playing') throw new Error('The campaign has ended.');
  if (!Number.isInteger(seat) || seat!==state.turn) throw new Error('Wait for your turn.');
  if (!action || typeof action!=='object') throw new Error('Choose an action.');
  const next=cloneGame(state);
  if (action.type==='end') {endTurn(next,seat);return next;}
  if (action.type==='shipment') {
    shipGoods(next,seat,action);
    record(next,seat,'shipment','Resource shipment dispatched.');
  } else if (action.type==='research' || action.type==='civic') {
    selectProject(next, seat, action.item, action.type==='research' ? SCIENCE : CULTURE);
  } else if (action.type==='focus') {
    const city=cityOrNull(next,action.city);
    if(!city || city.seat!==seat) throw new Error('Choose one of your cities.');
    if(!Object.hasOwn(CITY_FOCUS,action.item)) throw new Error('Choose a valid citizen focus.');
    city.focus=action.item;
    city.focusRound=state.round;
  } else if (action.type==='produce') {
    const city=cityOrNull(next,action.city);
    if (!city || city.seat!==seat) throw new Error('Choose one of your cities.');
    const option=getProductionOptions(next,city.id).find(o=>o.item===action.item);
    if (!option || !option.enabled) throw new Error(option?.reason || 'Choose an available production project.');
    let site;
    if (WONDERS[option.item]) {
      const candidate=getWonderSites(next,city.id,option.item).find(s=>s.id===action.site);
      if (!candidate) throw new Error('Choose a surveyed campus site.');
      site=candidate.id;
    }
    const berth=option.item==='harbor' ? getPortSite(next,city.id) : null;
    city.queue={item:option.item,required:option.required,progress:0,...(site ? {site} : {}),...(berth ? {portTile:berth} : {})};
    record(next,seat,'produce',city.name+' started production of '+option.label+'.',city.tile,{city:city.id,item:option.item});
  } else if (['move','attack','found','improve','upgrade','survey'].includes(action.type)) {
    unitOrder(next,seat,action);
  } else {
    if (typeof action.tile!=='string') throw new Error('Choose a district.');
    const [order]=getActions(next,seat,action.tile);
    if (!order || action.type!==order.type) throw new Error('That order is unavailable in this district.');
    if (!order.enabled) throw new Error(order.reason);
    const tile=getMap(state).byId[action.tile],prior=next.board[tile.id],player=next.players[seat];
    player.capital-=order.cost.capital;player.influence-=order.cost.influence;
    next.board[tile.id]={...prior,owner:seat,level:order.type==='develop' ? prior.level+1:prior.level};
    next.actionsLeft--;
    const verb={develop:'developed',contest:'took control of',claim:'claimed'}[order.type];
    record(next,seat,order.type,FACTIONS[state.players[seat].faction].name+' '+verb+' '+tile.name+'.',tile.id);
  }
  refreshScores(next);
  return next;
}
function botProject(state,city) {
  const units=state.units.filter(u=>u.seat===city.seat);
  const cities=state.cities.filter(c=>c.seat===city.seat);
  const count=type=>units.filter(u=>u.type===type).length+cities.filter(c=>c.queue?.item===type).length;
  const choices=[];
  if (state.opening==='settlers' && count('scout')===0 && state.round<8) choices.push('scout');
  const forecast=getPopulationReport(state,city.id);
  if (forecast.housingLimited && !city.buildings.includes('granary')) choices.push('granary');
  if (forecast.housingLimited && !city.buildings.includes('neighborhood')) choices.push('neighborhood');
  if (!city.buildings.includes('harbor') && getPortSite(state,city.id)) choices.push('harbor');
  if (city.buildings.includes('harbor')) {
    const worked=Object.values(state.board).filter(tile=>tile.portCity===city.id).length;
    if (worked<2 && count('workboat')===0) choices.push('workboat');
    if (count('cutter')===0) choices.push('cutter');
    if (city.buildings.includes('shipyard') && knows(state,city.seat,'steam') && count('frigate')===0) choices.push('frigate');
  }
  if (count('builder')===0) choices.push('builder');
  for (const type of ['armor','artillery','riflemen','cavalry']) {
    if (knows(state,city.seat,UNIT_TYPES[type].tech) && !count(type)) choices.push(type);
  }
  if (count('ranged')<Math.max(1,cities.length-1)) choices.push('ranged');
  if (count('melee')<2) choices.push('melee');
  if (cities.length<3 && count('settler')===0) choices.push('settler');
  if (city.buildings.includes('harbor')) choices.push('shipyard');
  choices.push('workshop','walls','monument','granary');
  if (count('melee')<4) choices.push('melee');
  const option=choices.find(key=>!city.buildings.includes(key));
  return option ? {type:'produce',city:city.id,item:option}:null;
}
function botMovement(state,unit,options) {
  if (!options.moves.length) return null;
  const settle=unit.type==='settler', builder=unit.type==='builder';
  const candidates=[unit.tile,...options.moves];
  const towns=state.cities.filter(c=>c.seat===unit.seat);
  let goals;
  if (unit.type==='scout') {
    const footprints=new Set([unit.tile]);
    for(const event of state.log) if(event.unit===unit.id && event.type==='move') {
      for(const tile of event.path || [event.tile]) footprints.add(tile);
    }
    const rating=tile=>{
      const frontier=neighbors(tile).filter(n=>!footprints.has(n)).length;
      const home=towns.length ? Math.min(...towns.map(c=>hexDistance(c.tile,tile))) : 0;
      return Number(!footprints.has(tile))*12+frontier+Math.min(home,6)*.5;
    };
    const unexplored=options.moves.filter(tile=>!footprints.has(tile));
    if(unexplored.length){
      const best=unexplored.reduce((a,b)=>rating(a)>=rating(b)?a:b);
      return {type:'move',unit:unit.id,tile:best};
    }
    return null;
  }
  if (settle) goals=getMap(state).tiles.filter(t=>canSettle(state,unit.seat,t.id)).map(t=>t.id);
  else if (unit.type==='workboat') {
    const site=options.moves.find(id=>unitImprovement(state,unit,id));
    return site ? {type:'move',unit:unit.id,tile:site} : null;
  } else if (builder) {
    const eligible=getMap(state).tiles.filter(t=>improvementAt(state,unit.seat,t.id));
    const rich=eligible.filter(t=>state.board[t.id].resource);
    goals=(rich.length?rich:eligible).map(t=>t.id);
  }
  else if (UNIT_TYPES[unit.type].domain==='sea') {
    const range=UNIT_TYPES[unit.type].range;
    goals=[...state.units,...state.cities].filter(target=>target.seat!==unit.seat && (
      movementCost(state,unit,target.tile) || (getMap(state).tiles.some(t=>t.terrain==='ocean' && hexDistance(t.id,target.tile)<=range))
    )).map(target=>target.tile);
  } else goals=state.cities.filter(c=>c.seat!==unit.seat).map(c=>c.tile);
  if (!goals.length) return null;
  const costs=findRoutes(state,unit).costs;
  function value(tile) {
    const distance=Math.min(...goals.map(g=>hexDistance(g,tile)));
    if (settle && distance===0) {
      const territory=adjacent[tile].filter(k=>terrainCost[getMap(state).byId[k].terrain] && state.board[k].owner===null).length;
      return 20+territory*0.3+(getMap(state).byId[tile].landmark ? 1:0)-costs.get(tile)*0.2;
    }
    if (!builder && !settle) {
      const inRange=state.units.some(u=>u.seat!==unit.seat && hexDistance(u.tile,tile)<=UNIT_TYPES[unit.type].range) ||
        state.cities.some(c=>c.seat!==unit.seat && hexDistance(c.tile,tile)<=UNIT_TYPES[unit.type].range);
      const immediate=inRange && costs.get(tile)<unit.moves;
      return -distance + (immediate ? 3 : inRange ? 0.5:0) - costs.get(tile)*0.04;
    }
    return -distance - costs.get(tile)*0.05;
  }
  let best=unit.tile, rating=value(best);
  for (const tile of candidates) {
    const v=value(tile);
    if (v>rating) {best=tile;rating=v;}
  }
  return best===unit.tile ? null : {type:'move',unit:unit.id,tile:best};
}
function botDistrict(state) {
  if (!state.actionsLeft) return null;
  let choice=null,best=-Infinity;
  for (const tile of getMap(state).tiles) {
    const [order]=getActions(state,state.turn,tile.id);
    if (!order?.enabled) continue;
    const frontier=adjacent[tile.id].filter(id=>terrainCost[getMap(state).byId[id].terrain] && state.board[id].owner===null).length;
    const variety=((tile.q*67+tile.r*31+state.round*19+state.turn*11+state.actionsLeft*7)%29)/29;
    const value=order.type==='develop' ? 0.5 : 2+Number(Boolean(tile.landmark))*3+frontier*0.1+(order.type==='contest'?1.5:0);
    if (value+variety>best) {best=value+variety;choice={type:order.type,tile:tile.id};}
  }
  return choice;
}
export function chooseBotAction(source) {
  const state=migrateGame(source),seat=state.turn;
  if (state.phase!=='playing') throw new Error('The campaign has ended.');
  const player = state.players[seat];
  if (!state.cities.some(c=>c.seat===seat)) {
    const pioneer=state.units.find(u=>u.type==='settler' && u.seat===seat && u.moves>0);
    if (pioneer && canSettle(state,seat,pioneer.tile)) return {type:'found',unit:pioneer.id};
  }
  if (!player.research && player.technologies.length < Object.keys(TECHS).length) {
    const threatened = state.cities.some(city => city.seat === seat && state.units.some(
      unit => unit.seat !== seat && UNIT_TYPES[unit.type].range > 0 && hexDistance(unit.tile, city.tile) <= 2));
    const opening = ['industry', 'agronomy', 'tactics', 'civics'][seat];
    const priorities = [threatened ? 'tactics' : opening, 'ballistics', 'industry', 'steam', 'tactics', 'motorization', 'radio', 'agronomy', 'navigation', 'civics'];
    const project = priorities.find(key => !knows(state, seat, key) && TECHS[key].requires.every(parent => knows(state, seat, parent)));
    if (project) return {type: 'research', item: project};
  }
  if (!player.civic && player.civics.length < Object.keys(CIVICS).length) {
    const opening = seat%2 ? 'publicWorks' : 'charter';
    const priorities = [opening,'charter','federation','publicWorks','mobilization','conservation','publicRadio'];
    const project = priorities.find(key => !adopted(state,seat,key) && CIVICS[key].requires.every(parent=>adopted(state,seat,parent)));
    if (project) return {type:'civic',item:project};
  }
  const available=state.units.filter(u=>u.seat===seat && u.moves>0);
  const plans=available.map(u=>[u,getUnitOptions(state,u.id)]);
  for (const [unit,options] of plans) {
    if (options.canFound) return {type:'found',unit:unit.id};
    if (options.improvements.length) return {type:'improve',unit:unit.id,item:options.improvements[0]};
    if (options.attacks.length) {
      // Compare actual outcomes, prioritizing captures, then kills and favorable exchanges.
      const outcomes = options.attacks.map(tile => {
        const result = combatPreview(state, unit.id, tile);
        const value = Number(result.capture)*500 + Number(result.defeated)*80 + result.damage - result.retaliation
          - Number(result.attackerDefeated)*40 - result.defenderHpAfterHit*0.1;
        return {tile, value};
      });
      const target = outcomes.sort((a,b) => b.value-a.value)[0].tile;
      return {type:'attack',unit:unit.id,tile:target};
    }
  }
  const shipment=planShipment(state,seat);
  if(shipment)return shipment;
  for (const city of state.cities) if (city.seat===seat && city.focusRound!==state.round) {
    const food=getPopulationReport(state,city.id);
    const focus=food.surplus<0 ? 'food' : food.housingLimited ? 'industry' :
      (city.population>=3 && player.research ? 'science' : 'balanced');
    if ((city.focus || 'balanced')!==focus) return {type:'focus',city:city.id,item:focus};
  }
  const veteran=plans.find(([,options])=>options.upgrade?.enabled && player.capital >= options.upgrade.cost + 8);
  if (veteran) return {type:'upgrade',unit:veteran[0].id};
  for (const city of state.cities) if (city.seat===seat && !city.queue) {
    const order=botProject(state,city);
    if (order) return order;
  }
  for (const [unit,options] of plans) {
    const move=botMovement(state,unit,options);
    if (move) return move;
  }
  return botDistrict(state) || {type:'end'};
}
