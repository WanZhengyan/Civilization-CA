import {sendDelegation,proposeDelegation} from './diplomacy.js';
import {councilProjectCost} from './council-costs.js';
import {allowsConquest,allowsScience,SCIENCE_PROJECT,validVictoryMode} from './victory-rules.js';
import {advanceCityBorder, planCityBorders} from './city-expansion.js';
import {advancementRoutes,promotionOutcome,recoveryAt,nearestServiceStation} from './unit-service.js';
import {fleetBasin,flotillaMove} from './naval-plan.js';
import {waterKind} from './water-navigation.js';
import {harborSites,fishingTask,runFishingTask} from './maritime.js';
import {revisionOf, advanceProduction, verifyProduction, parkedProduction, parkProject, resumeWork, purchasePrice} from './works.js';
import {NATURAL_WONDERS, placeNaturalWonders, neighboringWonders} from './natural-wonders.js';
import {REGIMENTS, matchup, formationChoices, signalPosition} from './regiments.js';
import {WONDERS, universityYield, surveyCampus, campusStatus, updateCampusRegistry, settleCampusRace} from './wonders.js';
import {getVision, getVisibleTiles, projectForSeat, rememberVision, sightFrom} from './vision.js';
import {RESOURCES, populateDeposits, canSeeDeposits, canSurvey, SPECIAL_IMPROVEMENTS, serviceCity, connectedDeposit, resourceAccounts, bankHarvest, shipGoods, planShipment} from './resources.js';
export {RESOURCES, canSeeDeposits, canSurvey};
import { assignWorkforce, CITY_FOCUS } from "./workforce.js";
import {councilAgenda,proposePolicy} from './assembly-plan.js';
import {ratifyPolicy} from "./policy.js";
import {extraHousing} from "./civic-agenda.js";
import { foodForecast, feedCity } from "./population.js";
// Shared rules for the browser and the authoritative room service.
import {campaignSeed, selectStarts, seededRandom} from './opening.js';
import {CIVILIZATIONS, allocateCivilizations, capitalBonus} from './civilizations.js';
import {validDifficulty} from './ai-levels.js';
import {actingPerspective,activeTeamSeats,newTeamPhase,nextTeamPhase,seatMayOrder} from './team-turns.js';
import {getTeamId,sameTeam,teamLabel} from './teams.js';
export {getTeamId,sameTeam,teamLabel};
import { PORT_BUILDINGS, VESSELS, findPortSite, fisheryPort } from "./maritime.js";
import {nextTechnology} from './applied-science.js';
import {TECHS, CIVICS, ERAS, ERA_UNITS, eraFor, councilTree} from './progression.js';
export {TECHS, CIVICS, ERAS, councilTree} from './progression.js';
export function getEra(state, seat) { return eraFor(state.players[seat]?.technologies, state.players[seat]?.civics); }
import {planWaterways, waterwayChart} from './waterways.js';
import {campaignChart, largeCampaignChart, neighborCoordinates, REGIONAL_SHAPE} from './region-shapes.js';
import {LOS_ANGELES, regionalMaps, MAP_SCALES, validMapId, validMapSize} from './maps.js';
export {CAMPAIGN_MAPS, validMapId, validMapSize} from './maps.js';
import {prepareBattle} from './battle-reports.js';
import {fieldPosition,holdGround} from './field-position.js';
import {attackMode} from './attack-mode.js';
import {barbarianRound,seedCamps,wildAt,wildForecast,resolveWildAttack} from "./barbarians.js";

export const MAX_ROUNDS = 30;
export const TARGET_SCORE = 125;
export const SCORE_TARGETS = Object.freeze([100,TARGET_SCORE,150]);
export function getScoreTarget(state) {
  const perSeat=SCORE_TARGETS.includes(state?.scoreTarget) ? state.scoreTarget : TARGET_SCORE;
  if (!state?.teams?.length) return perSeat;
  const counts=[0,0,0,0];
  for (const team of state.teams) counts[team]++;
  return perSeat*Math.max(...counts);
}
export const ACTIONS_PER_TURN = 2;
export const FACTIONS = CIVILIZATIONS;
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
  "6,6": ["Westwood", "urban", "westwood"],
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
  adjacent[id] = neighborCoordinates(q,r).map(([x,y])=>x+','+y).filter(key=>TILE_BY_ID[key]);
}
const losAngeles = {...LOS_ANGELES, tiles:TILES, byId:TILE_BY_ID, starts:STARTING_TERRITORY};
const sources = [losAngeles,...Object.values(regionalMaps)];
const classicCharts = Object.fromEntries(sources.map(map=>[map.id,campaignChart(map,adjacent,false)]));
const regionalCharts = Object.fromEntries(sources.map(map=>[map.id,campaignChart(map,adjacent,true)]));
const largeCharts = new Map();
export function getMap(stateOrId, mapSize='standard') {
  const isState = stateOrId && typeof stateOrId === 'object';
  const id = isState ? stateOrId.mapId : stateOrId;
  const key = Object.hasOwn(regionalCharts,id) ? id : 'la';
  if (isState && stateOrId.mapShape !== REGIONAL_SHAPE) return classicCharts[key];
  const size=(isState?stateOrId.mapSize:mapSize)||'standard';
  const scale=MAP_SCALES[size];
  let base=regionalCharts[key];
  if(scale>1){
    const cacheKey=key+'.'+size;
    if(!largeCharts.has(cacheKey))largeCharts.set(cacheKey,largeCampaignChart(base,size,scale));
    base=largeCharts.get(cacheKey);
  }
  return isState ? waterwayChart(base,stateOrId.waterways) : base;
}
export function getCityExpansion(state, cityId) {
  const city = state.cities.find(c => c.id === cityId);
  if (!city || (state.intel && state.intel.seat !== city.seat)) return null;
  return getCityExpansions(state, city.seat).get(city.id);
}

export function getCityExpansions(state, seat) {
  if (state.intel && state.intel.seat!==seat) return new Map();
  return planCityBorders(state,seat,getMap(state),getVisibleTiles(state,seat));
}

export function neighbors(id,stateOrId) {
  return [...(stateOrId ? getMap(stateOrId).neighbors(id) : adjacent[id] || [])];
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
  ...VESSELS,
  ...REGIMENTS
};
export const BUILDINGS = {
  ...WONDERS,
  ...PORT_BUILDINGS,
  granary: {name:"Granary", required:10, description:"Provides 2 food and housing for 2 more citizens."},
  neighborhood: {name:"Residential quarter", era:"frontier", civic:"publicWorks", required:16, description:"Provides housing for 3 more citizens."},
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
  const map=getMap(state);
  if (!knows(state,city.seat,'navigation')) return false;
  const {byId,neighbors}=map;
  return city.buildings.includes('harbor') || byId[city.tile].terrain==='coast'
    || neighbors(city.tile).some(id=>waterKind(byId[id]));
}
function hasPark(state, city) {
  const map=getMap(state);
  return [city.tile,...map.neighbors(city.tile)].some(id => state.board[id].owner===city.seat
    && ['forest','hills'].includes(map.byId[id].terrain));
}
const PRODUCTS = {...UNIT_TYPES, ...BUILDINGS, [SCIENCE_PROJECT.id]:SCIENCE_PROJECT};
const terrainCost = {coast:1, urban:1, plains:1, hills:2, forest:2};
// Coordinates are shared geometry. Distance checks can be made before a
// campaign starts, independent of the region, footprint or current view.
const distanceGrid=Object.create(null);
const maxMapScale=Math.max(...Object.values(MAP_SCALES));
for(let r=0;r<ROWS*maxMapScale;r++) for(let q=0;q<COLUMNS*maxMapScale;q++) {
  distanceGrid[q+','+r]={x:q-Math.floor(r/2),z:r};
}
export function hexDistance(a, b) {
  const t = distanceGrid[a], u = distanceGrid[b];
  if (!t || !u) return Infinity;
  const x = t.x-u.x, z=t.z-u.z;
  return Math.max(Math.abs(x), Math.abs(z), Math.abs(x + z));
}
function mint(state, prefix) { return prefix + state.nextId++; }
function spawn(state,seat,type,tile) {
  const def = UNIT_TYPES[type];
  const maxHp = def.maxHp + (def.strength && adopted(state,seat,'mobilization') ? 20 : 0);
  const movement = def.moves + Number(def.domain==='sea' && knows(state,seat,'hydrography'));
  const unit = {id:mint(state,'u'),seat,type,tile,hp:maxHp,maxHp,moves:movement,maxMoves:movement,charges:type === 'builder' ? 3 : def.charges || 0};
  state.units.push(unit);
  return unit;
}
function establish(state,seat,tile,original = false) {
  const map=getMap(state);
  const city = {id:mint(state,'c'),name:map.byId[tile].name,seat,tile,hp:100,maxHp:100,population:1,food:0,buildings:[],queue:null,originalSeat:original ? seat : null};
  state.cities.push(city);
  state.board[tile] = {...state.board[tile],owner:seat,level:Math.max(1,state.board[tile].level)};
  if (!original || state.opening==='settlers') for (const next of map.neighbors(tile)) {
    const holding = state.board[next];
    if (!wildAt(state,next) && holding.owner === null && terrainCost[map.byId[next].terrain] && !state.units.some(u=>u.tile===next && u.seat!==seat)) {
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
    populateDeposits(migrated,getMap(migrated),migrated.seed,getMap(migrated).neighbors);
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
function drawOpeningSeat(seed,teams,count) {
  const members=new Map();
  for(let seat=0;seat<count;seat++) {
    const team=teams?.[seat] ?? seat;
    if (!members.has(team)) members.set(team,[]);
    members.get(team).push(seat);
  }
  const random=seededRandom(seed,'initiative');
  const pick=options=>options[Math.floor(random()*options.length)];
  return pick(pick([...members.values()]));
}
export function createGame(players = [{name:"You"}, ...FACTIONS.slice(1).map(()=>({bot:true}))], mapId = "la", {seed: requestedSeed, mapSize='standard', scoreTarget=TARGET_SCORE, practice=false, teams, difficulty='normal', drawInitiative=false, simultaneousTeams=false, civilizationTraits=true, waterways=true, victoryMode='standard', legacyVictory=false, researchPace=legacyVictory ? 0 : 2, campaignVariety=!legacyVictory && researchPace===2} = {}) {
  if (!validMapId(mapId)) throw new Error("Choose a valid campaign map.");
  if (!validVictoryMode(victoryMode)) throw new Error('Choose a valid victory mode.');
  if (!legacyVictory && practice && victoryMode==='conquest') throw new Error('Conquest requires a rival civilization.');
  if (!validMapSize(mapSize)) throw new Error("Choose a valid map size.");
  if (!SCORE_TARGETS.includes(scoreTarget)) throw new Error("Choose a valid civic victory target.");
  if (practice) {
    if (practice!==true || !Array.isArray(players) || players.length!==1 || players[0]?.bot===true) {
      throw new Error('Practice needs one human player.');
    }
  } else if (!Array.isArray(players) || players.length<2 || players.length>4) {
    throw new Error('A campaign needs two to four factions.');
  }
  if (!validDifficulty(difficulty)) throw new Error('Choose a valid AI difficulty.');
  if (teams!==undefined) {
    if (!Array.isArray(teams) || teams.length!==players.length || !Array.from(teams).every(id=>Number.isInteger(id) && id>=0 && id<4)) {
      throw new Error('Choose a team for every seat.');
    }
    if (!practice && new Set(teams).size<2) throw new Error('A campaign needs at least two opposing teams.');
  }
  const seed = campaignSeed(requestedSeed);
  const firstSeat=drawInitiative===true ? drawOpeningSeat(seed,teams,players.length) : 0;
  const allocation = allocateCivilizations(players.map(player=>player?.civilization),seed);
  const base=getMap(mapId,mapSize);
  const waterPlan=waterways ? planWaterways(base,seed) : null;
  const map=waterwayChart(base,waterPlan);
  const starts = selectStarts(map, players.length, seed, map.neighbors, hexDistance);
  const next = {seed, mapId, ...(campaignVariety ? {campaignVariety:1} : {}), ...(waterPlan ? {waterways:waterPlan} : {}), ...([1,2].includes(researchPace) ? {researchPace} : {}), ...(civilizationTraits ? {civilizationTraits:1} : {}), ...(legacyVictory ? {} : {victoryMode}), ...(mapSize!=='standard' ? {mapSize} : {}), ...(practice ? {practice:true} : {}),
    ...(teams ? {teams:[...teams]} : {}), ...(difficulty!=='normal' ? {difficulty} : {}),
    ...(drawInitiative===true ? {firstSeat} : {}), ...(!legacyVictory || scoreTarget===TARGET_SCORE ? {} : {scoreTarget}), mapShape:REGIONAL_SHAPE, naturalWonderVersion:1, opening:'settlers', rulesVersion:3, nextId:1, cities:[], units:[], round:1,turn:firstSeat,actionsLeft:ACTIONS_PER_TURN,phase:'playing',winners:[],
    board:Object.fromEntries(map.tiles.map(tile=>[tile.id,{owner:null,level:0,improvement:null}])),
    players:players.map((player,seat)=>({
      name:(typeof player === 'string' ? player : player?.name)?.trim().slice(0,32) || FACTIONS[allocation[seat]].name,
      bot:player?.bot===true,faction:allocation[seat],color:FACTIONS[allocation[seat]].color,capital:12,influence:6,score:0
    })),log:[{round:1,seat:firstSeat,type:'start',text:'The campaign has begun.'}]};
  if (simultaneousTeams && teams && new Set(teams).size<teams.length) {
    next.teamPhase=newTeamPhase(next,teams[firstSeat],()=>ACTIONS_PER_TURN);
  }
  starts.forEach(([site],seat)=>spawn(next,seat,'settler',site));
  placeNaturalWonders(next,map);
  seedCamps(next,map,map.neighbors,hexDistance);
  refreshScores(next);
  for (const player of next.players) player.surveyEnabled=false;
  populateDeposits(next,map,seed,map.neighbors);
  return rememberVision(addResearch(next));
}
function cityOrNull(state,id) { return state.cities.find(c=>c.id === id); }
export function getWonderSites(state,cityId,item) {
  const city=cityOrNull(state,cityId), campus=WONDERS[item];
  if (!city || !campus || !productionUnlocked(state,city.seat,campus)) return [];
  return surveyCampus(state,city,item,getMap(state),hexDistance);
}
export function getProjectSites(state,cityId,item) {
  const city=cityOrNull(state,cityId),map=getMap(state);
  if (!city || !Object.hasOwn(BUILDINGS,item) || (state.intel && state.intel.seat!==city.seat)) return [];
  if (WONDERS[item]) return getWonderSites(state,cityId,item);
  const describe=id=>({...map.byId[id],range:hexDistance(city.tile,id),favored:false});
  if (item==='harbor') {
    const visible=state.intel ? new Set(state.intel.visible) :
      ((state.opening==='settlers' || state.enforceSight) ? getVisibleTiles(state,city.seat) : null);
    const berths=state.intel?.harborSites?.[cityId] || harborSites(state,city,map.byId,map.neighbors,visible);
    return berths.map(describe);
  }
  const sites=[describe(city.tile)];
  if (item==='shipyard' && city.portTile) sites.push(describe(city.portTile));
  const reserved=new Set(state.cities.filter(c=>c.id!==cityId).map(c=>c.queue?.site));
  for (const tile of cityWorkArea(state,city)) {
    const cell=state.board[tile.id];
    if (cell.naturalWonder || cell.wonder || cell.resource || cell.facility || cell.improvement || reserved.has(tile.id)) continue;
    sites.push(describe(tile.id));
  }
  return sites;
}
export function getPortSite(state, cityId) {
  const map=getMap(state);
  const city=cityOrNull(state,cityId);
  if (!city) return null;
  if (state.intel?.portSites) return state.intel.portSites[cityId] ?? null;
  const visible=(state.opening==='settlers' || state.enforceSight) ? getVisibleTiles(state,city.seat) : null;
  return findPortSite(state,city,map.byId,map.neighbors,visible);
}
function unitOrNull(state,id) { return state.units.find(u=>u.id === id); }
function cityWorkArea(state, city) {
  const map=getMap(state);
  const neighborsInRange=new Set([city.tile]);
  let ring=[city.tile];
  for (let distance=0;distance<2;distance++) {
    const next=[];
    for (const tile of ring) for (const id of map.neighbors(tile)) {
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
  const map=getMap(state);
  const known=state.exploration?.[city.seat] || {};
  const visible=getVisibleTiles(state,city.seat);
  const canIdentify=id=>visible.has(id) || Object.hasOwn(known,id) || state.intel?.explored?.includes(id);
  const tiles=cityWorkArea(state,city).filter(tile=>
    !state.board[tile.id].pillaged && !state.board[tile.id].naturalWonder && getWorkingCity(state,tile.id)?.id===city.id)
    .map(tile=>{
      const wonders=neighboringWonders(state.board,map,tile.id,canIdentify);
      return wonders.length ? {...tile,naturalWonders:wonders} : tile;
    });
  return assignWorkforce(city,tiles,focus);
}
export function getCityYield(state,cityId) {
  const city = cityOrNull(state,cityId);
  if (!city) return {food:0,production:0,capital:0,influence:0};
  const work=getCitizenWorkforce(state,cityId).yields;
  const has = key=>city.buildings.includes(key);
  // Improvements within two hexes work the closest city; city id order breaks ties.
  let farms = 0, mines = 0, fisheries = 0, cropBonus = 0, materialBonus = 0;
  let mineralWorks = 0;
  for (const tile of getMap(state).tiles) {
    const holding = state.board[tile.id];
    if (holding?.owner !== city.seat || !holding.improvement || holding.pillaged || getWorkingCity(state,tile.id)?.id !== city.id) continue;
    if (holding.improvement==='fishery') fisheries++;
    if (['farm','orchard'].includes(holding.improvement)) farms++;
    if (['mine','lumberCamp','quarry'].includes(holding.improvement)) mines++;
    if (connectedDeposit(holding)) {
      if (['grain','citrus','fish'].includes(holding.resource)) cropBonus++;
      else materialBonus++;
      if (holding.resource==='iron' || holding.resource==='stone') mineralWorks++;
    }
  }
  const civics = knows(state, city.seat, 'civics');
  const steam = has('workshop') && knows(state, city.seat, 'steam');
  const trade = tradesBySea(state,city);
  const result = {
    food: 4 + work.food + cropBonus + fisheries * 2 + (adopted(state,city.seat,'conservation') && hasPark(state,city) ? 1 : 0) + farms * (knows(state,city.seat,'agriculturalScience') ? 3 : 2) + (has('granary') ? 2 : 0) + (knows(state, city.seat, 'agronomy') ? 2 : 0),
    production:universityYield(city,'production')+ 3 + work.production + materialBonus + (knows(state,city.seat,'metallurgy') ? 2*mineralWorks : 0) + (has('shipyard') ? 2 : 0) + Number(adopted(state,city.seat,'publicWorks')) + Math.floor(city.population / 2) + mines * 2 + (has('workshop') ? 2 : 0) + (knows(state, city.seat, 'industry') ? 2 : 0) + (steam ? 2 : 0) + (knows(state, city.seat, 'motorization') ? 2 : 0),
    capital: city.population + fisheries + (has('harbor') ? 2 : 0) + (civics ? 2 : 0) + (trade ? 2 : 0),
    influence: (has('monument') ? 3 : 0) + (civics ? 1 : 0)
  };
  const bonus=capitalBonus(state,city.seat,city);
  result.food+=bonus.food || 0;
  result.production+=bonus.production || 0;
  result.capital+=bonus.capital || 0;
  if (farms && adopted(state,city.seat,'irrigationDistricts')) result.food += 2;
  if (has('harbor') && adopted(state,city.seat,'harborCommission')) result.capital += 3;
  if (adopted(state,city.seat,'exposition')) result.influence += 2 * city.buildings.filter(id=>WONDERS[id]).length;
  if (has('workshop') && knows(state,city.seat,'mechanics')) result.production++;
  if (adopted(state,city.seat,'landRegistry')) result.capital++;
  if (city.population>=5 && adopted(state,city.seat,'regionalPlanning')) result.production++;
  const policy=state.players[city.seat].policy;
  if (policy==='contracts') { result.production+=2; result.food-=1; }
  if (policy==='relief') { result.food+=2; result.production-=1; }
  if (policy==='portDues') { if (has('harbor')) result.capital+=3; result.influence-=1; }
  if (policy==='grants') result.capital-=2;
  return result;
}
export function getPopulationReport(state, cityId) {
  const city = cityOrNull(state, cityId);
  return city ? foodForecast(city, getCityYield(state, cityId).food, extraHousing(state.players[city.seat])) : null;
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
  const stats = {territories,developments,landmarks,improvements,cities:count,population,buildings,units:(state.units||[]).filter(u=>u.seat===seat).length,
    score:state.legacyFinalScores?.[seat] ?? score,
    cultureIncome:cities.reduce((n,c)=>n+universityYield(c,'culture'),0)+Number(settled)+count+2*monuments+(adopted(state,seat,'charter') ? count : 0)
      +(adopted(state,seat,'conservation') ? cities.filter(c=>hasPark(state,c)).length : 0),
    scienceIncome:cities.reduce((n,c)=>n+universityYield(c,'science'),0)+2*Number(settled)+count+cities.reduce((sum,c)=>sum+getCitizenWorkforce(state,c.id).yields.science,0)+Math.floor(population/3)+(knows(state,seat,'radio') ? 2*count : 0)
      +(adopted(state,seat,'publicRadio') ? 2*count : 0),
    capitalIncome:3*Number(settled)+fisheries+2*cities.filter(c=>c.buildings.includes('harbor')).length+Math.floor(territories/2)+productive+population+(knows(state,seat,'civics') ? 2*count : 0)
      +2*cities.filter(c=>tradesBySea(state,c)).length,
    influenceIncome:2*Number(settled)+Math.floor(territories/3)+developments-productive+3*monuments+(knows(state,seat,'civics') ? count : 0)};
  const bonus=capitalBonus(state,seat,cities.find(city=>city.originalSeat===seat));
  stats.scienceIncome+=bonus.science || 0;
  stats.capitalIncome+=bonus.capital || 0;
  if (adopted(state,seat,'harborCommission')) stats.capitalIncome += 3 * cities.filter(c=>c.buildings.includes('harbor')).length;
  if (adopted(state,seat,'normalSchools')) stats.scienceIncome += 2 * cities.filter(c=>c.population>=3).length;
  if (adopted(state,seat,'exposition')) {
    const campuses=cities.reduce((n,c)=>n+c.buildings.filter(id=>WONDERS[id]).length,0);
    stats.cultureIncome += 2 * campuses;
    stats.influenceIncome += 2 * campuses;
  }
  if (knows(state,seat,'electricity')) stats.scienceIncome+=2*cities.filter(c=>c.buildings.includes('workshop')).length;
  if (adopted(state,seat,'landRegistry')) stats.capitalIncome+=count;
  if (adopted(state,seat,'publicLibraries')) stats.cultureIncome+=2*monuments;
  if (adopted(state,seat,'regionalPlanning')) stats.cultureIncome+=cities.filter(c=>c.population>=5).length;
  const policy=state.players[seat].policy;
  if (policy==='lectures') { stats.cultureIncome+=count; stats.scienceIncome-=count; }
  if (policy==='grants') { stats.scienceIncome+=2*count; stats.capitalIncome-=2*count; }
  if (policy==='portDues') {
    stats.capitalIncome+=3*cities.filter(c=>c.buildings.includes('harbor')).length;
    stats.influenceIncome=Math.max(0,stats.influenceIncome-count);
  }
  return stats;
}
function refreshScores(state) { state.players.forEach((p,i)=>{p.score=getStats(state,i).score;}); }
function record(state,seat,type,text,tile,detail={}) {
  state.log.push({round:state.round,seat,type,text,...(tile ? {tile}:{}),...detail});
  if (state.log.length>160) state.log.shift();
}
const DISTRICT_ORDER_COST=1;
function territoryOrder(state,seat,tile) {
  if (tile.terrain==='ocean' || wildAt(state,tile.id)) return null;
  const {owner,level}=state.board[tile.id];
  if (state.board[tile.id].facility || state.board[tile.id].wonder || state.board[tile.id].naturalWonder || state.cities.some(c=>c.queue?.site===tile.id)) return null;
  if (owner===seat) return level<3 ? {type:'develop',label:'Develop district',cost:{capital:5+level*3,influence:0}} : null;
  if (sameTeam(state,owner,seat)) return null;
  if (state.cities.some(c=>c.tile===tile.id) || state.units.some(u=>u.tile===tile.id && u.seat!==seat)) return null;
  if (owner===null) return {type:'claim',label:'Claim district',cost:{capital:4,influence:0}};
  return {type:'contest',label:'Contest district',cost:{capital:4,influence:5+level*2}};
}
export function getActions(state,seat,id,visible) {
  state=actingPerspective(state,seat);
  const tile=getMap(state).byId[id], player=state.players[seat];
  if (!tile || !player) return [];
  if (state.intel && !state.intel.visible.includes(id)) return [];
  if (!state.intel && (state.opening==='settlers' || state.enforceSight) && !(visible || getVisibleTiles(state,seat)).has(id)) return [];
  const order=territoryOrder(state,seat,tile);
  if (!order) return [];
  let reason='';
  if (state.phase!=='playing') reason='The campaign has ended.';
  else if (state.turn!==seat) reason='Wait for your turn.';
  else if (state.actionsLeft<DISTRICT_ORDER_COST) reason='You have used all district orders this turn.';
  else if (order.type!=='develop' && !getMap(state).neighbors(id).some(key=>state.board[key].owner===seat)) reason='Choose a district next to your territory.';
  else if (player.capital<order.cost.capital) reason='You need '+order.cost.capital+' capital.';
  else if (player.influence<order.cost.influence) reason='You need '+order.cost.influence+' influence.';
  if (!reason && state.intel?.districtChoices && !state.intel.districtChoices.includes(id)) return [];
  return [{...order,enabled:!reason,reason}];
}

// Inspect one owned district without issuing an order. Revalue just the
// changed holding through the same economy used at the end of the turn:
// Port concessions can absorb an extra point of influence at the zero floor.
export function getDevelopmentPreview(state,seat,id) {
  if (!Number.isInteger(seat) || state?.board?.[id]?.owner!==seat || (state.intel && state.intel.seat!==seat)) return null;
  const [order]=getActions(state,seat,id);
  if (order?.type!=='develop') return null;
  const holding=state.board[id], nextLevel=holding.level+1;
  const proposed={...state,board:{...state.board,[id]:{...holding,level:nextLevel}}};
  const before=getStats(state,seat), after=getStats(proposed,seat);
  return {
    currentLevel:holding.level, nextLevel,
    cost:{...order.cost,orders:DISTRICT_ORDER_COST}, enabled:order.enabled, reason:order.reason,
    delta:{capitalIncome:after.capitalIncome-before.capitalIncome,
      influenceIncome:after.influenceIncome-before.influenceIncome, score:after.score-before.score}
  };
}

function movementCost(state,unit, tileId) {
  const terrain=getMap(state).byId[tileId].terrain;
  const reconnaissance = unit.type==='scout' || unit.type==='cavalry';
  if (terrain==='hills' && reconnaissance && knows(state,unit.seat,'cartography')) return 1;
  if (unit.type==='skirmisher' && (terrain==='forest'||terrain==='hills')) return 1;
  return UNIT_TYPES[unit.type].domain==='sea' ? Number(terrain==='ocean') : terrainCost[terrain];
}
function bridgeTo(state,from,to) {
  return getMap(state).bridgesByTile?.[from]?.find(bridge=>bridge.to===to);
}
function routeStepCost(state,unit,from,to) {
  const ground=UNIT_TYPES[unit.type].domain!=='sea';
  const crossing=ground && bridgeTo(state,from,to);
  if (crossing?.kind==='ferry') return 2;
  const step=crossing ? 2 : movementCost(state,unit,to);
  if (step===2 && ground && state.board[from].owner===unit.seat && state.board[to].owner===unit.seat && knows(state,unit.seat,'railways')) return 1;
  return step;
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
  const map=getMap(state);
  const seen=(state.intel || state.opening==='settlers' || state.enforceSight) && getVisibleTiles(state,unit.seat);
  const costs=new Map([[unit.tile,0]]),parents=new Map(),queue=[unit.tile];
  const blocked=new Set(state.units.filter(u=>u.id!==unit.id).map(u=>u.tile));
  for (const c of state.cities) if (!sameTeam(state,c.seat,unit.seat)) blocked.add(c.tile);
  for (const group of [state.barbarians?.camps,state.barbarians?.parties]) for (const p of group || []) blocked.add(p.tile);
  for (let i=0;i<queue.length;i++) {
    const here=queue[i];
    const bridges=UNIT_TYPES[unit.type].domain!=='sea' && map.bridgesByTile?.[here];
    const nearby=map.neighbors(here);
    const directions=bridges ? [...nearby,...bridges.map(link=>link.to)] : nearby;
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
function active(state,unit) { return unit && seatMayOrder(state,unit.seat) && unit.moves>0; }
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
  if (state.board[tile.id].naturalWonder) return 'protected';
  if (!terrainCost[tile.terrain] || state.board[tile.id].facility || state.board[tile.id].wonder || state.cities.some(c=>c.queue?.site===tile.id)) return 'terrain';
  const owner = state.board[tile.id].owner;
  if (owner !== null && owner !== seat) return 'ownership';
  if (nearest && nearest.distance < 3) return 'spacing';
  if (state.intel?.unavailableSites?.includes(tile.id)) return 'unsuitable';
  return null;
}
function canSettle(state, seat, id) {
  return !settlementRestriction(state, seat, getMap(state).byId[id], nearestSettlement(state, id));
}
function settlementWonderProspects(state, seat, tileId) {
  const map=getMap(state),prospects=new Map();
  for(const workTile of map.neighbors(tileId)) {
    const holding=state.board[workTile];
    if(!terrainCost[map.byId[workTile].terrain] || holding.naturalWonder ||
      (holding.owner!==null && holding.owner!==seat) || wildAt(state,workTile) ||
      state.cities.some(city=>city.tile===workTile) ||
      state.units.some(unit=>unit.tile===workTile && unit.seat!==seat)) continue;
    for(const id of neighboringWonders(state.board,map,workTile)) {
      const current=prospects.get(id);
      if(current) current.districts++;
      else prospects.set(id,{id,name:NATURAL_WONDERS[id].name,effect:NATURAL_WONDERS[id].effect,bonus:[...NATURAL_WONDERS[id].bonus],districts:1});
    }
  }
  return [...prospects.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
export function getSettlementAssessment(state, unitId, tileId) {
  const unit = unitOrNull(state, unitId);
  const tile = getMap(state).byId[tileId];
  const charted=!state.intel || state.intel.explored.includes(tileId);
  const nearest = tile && charted ? nearestSettlement(state, tileId) : null;
  const assessment = {
    status: 'invalid', reason: '', canFoundThisTurn: false, canFoundNextTurn: false,
    reachable: false, nearestCity: nearest, distanceToNearestCity: nearest?.distance ?? null,
    terrainCost: tile && charted ? terrainCost[tile.terrain] ?? null : null, moveCost: null, movesAfter: null,
    naturalWonderProspects: []
  };
  if (!tile) return {...assessment, reason: 'Select a tile on the map.'};
  if (!charted) return {...assessment,reason:'Uncharted territory. Move closer to explore.'};
  if (unit?.type !== 'settler') return {...assessment, reason: 'Select a settler to survey this tile.'};
  if (state.phase !== 'playing') return {...assessment, reason: 'The campaign has ended.'};
  if (!seatMayOrder(state,unit.seat)) return {...assessment, reason: 'Wait for the settler’s turn.'};
  assessment.naturalWonderProspects=settlementWonderProspects(state,unit.seat,tileId);

  const cost = tileId === unit.tile ? 0 : findRoutes(state, unit).costs.get(tileId);
  assessment.reachable = cost !== undefined;
  assessment.moveCost = cost ?? null;
  assessment.movesAfter = assessment.reachable ? unit.moves - cost : null;

  const restriction = settlementRestriction(state, unit.seat, tile, nearest);
  if (restriction === 'protected') {
    assessment.reason='This protected site cannot host a city, improvement or campus.';
  } else if (restriction === 'terrain') {
    assessment.reason = tile.terrain === 'ocean' ? 'Cities need land. This tile is open water.' : 'Mountain terrain is impassable.';
  } else if (restriction === 'ownership') {
    const owner = state.board[tileId].owner;
    assessment.reason = FACTIONS[state.players[owner].faction].name+' owns this tile. Settle on friendly or neutral land.';
  } else if (restriction === 'unsuitable') {
    assessment.reason = 'This site is unavailable for settlement.';
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
export function getResourceLedger(state,seat) {
  const map=getMap(state);
  return resourceAccounts(state,seat,map.byId,map.neighbors);
}
export function getWorkingCity(state,id) {
  const map=getMap(state);
  return serviceCity(state,id,map.byId,map.neighbors);
}
function improvementAt(state,seat,id) {
  if(state.board[id].facility || state.board[id].naturalWonder || state.board[id].wonder || state.cities.some(c=>c.queue?.site===id)) return null;
  if (state.board[id].owner!==seat || state.board[id].improvement || state.cities.some(c=>c.tile===id)) return null;
  if (!getWorkingCity(state,id) || state.board[id].wonder || state.cities.some(city=>city.queue?.site===id)) return null;
  const deposit=RESOURCES[state.board[id].resource];
  if (deposit) return deposit.improvement;
  const terrain=getMap(state).byId[id].terrain;
  return isProductive(terrain) ? 'farm' : terrain==='forest' || terrain==='hills' ? 'mine' : null;
}
function unitImprovement(state,unit,tile) {
  const map=getMap(state);
  if (!unit.charges) return null;
  if (state.intel?.workSites) return state.intel.workSites[unit.id]?.[tile] ?? null;
  if (unit.type==='workboat') {
    if(unit.fishCargo)return null;
    const chart=state.waterways ? getVision(state,unit.seat).explored : null;
    return fisheryPort(state,unit.seat,tile,map.byId,map.neighbors,chart) ? 'fishery' : null;
  }
  return unit.type==='builder' ? improvementAt(state,unit.seat,tile) : null;
}
function attackTargets(state,unit) {
  const range=UNIT_TYPES[unit.type].range;
  if (!range) return [];
  // A land melee unit can contest a defended end of a bridge with a full crossing order.
  const sight=(state.intel || state.opening==='settlers' || state.enforceSight) && getVisibleTiles(state,unit.seat);
  const inRange=tile=>(!sight||sight.has(tile)) && (hexDistance(unit.tile,tile)<=range || (UNIT_TYPES[unit.type].captures && unit.moves>=2 && Boolean(bridgeTo(state,unit.tile,tile))));
  const occupied=state.units.filter(u=>!sameTeam(state,u.seat,unit.seat) && inRange(u.tile)).map(u=>u.tile);
  const cities=state.cities.filter(c=>!sameTeam(state,c.seat,unit.seat) && inRange(c.tile) && (UNIT_TYPES[unit.type].captures || c.hp>1)).map(c=>c.tile);
  const wilds=[...(state.barbarians?.camps||[]),...(state.barbarians?.parties||[])].filter(t=>inRange(t.tile) && (t.type!=="camp" || unit.type!=="scout" && (t.hp>1 || UNIT_TYPES[unit.type].captures)));
  return [...new Set([...occupied,...(unit.type==='scout'?[]:cities),...wilds.map(p=>p.tile)])];
}
export function getUpgradePlans(state,unitId,seat) {
  const unit=unitOrNull(state,unitId);
  if (!unit || unit.seat!==seat || (state.intel && state.intel.seat!==seat)) return [];
  const routes=advancementRoutes(unit.type,UNIT_TYPES);
  if (!routes.length) return [];
  const current=UNIT_TYPES[unit.type];
  const player=state.players[seat], era=getEra(state,seat);
  const sea=current.domain==='sea', owner=state.board[unit.tile]?.owner;
  const terrain=getMap(state).byId[unit.tile]?.terrain;
  const workingYard=sea && waterKind(getMap(state).byId[unit.tile]) && (owner==null || owner===seat) && state.cities.some(city=>
    city.seat===seat && city.portTile && city.buildings.includes('harbor') &&
    city.buildings.includes('shipyard') && hexDistance(city.portTile,unit.tile)<=1);
  return routes.map(route=>{
    const target=UNIT_TYPES[route.to], legalSite=sea ? workingYard : owner===seat && Boolean(terrainCost[terrain]);
    const eraReady=era.rank>=ERAS[target.era].rank;
    const techReady=!target.tech || knows(state,seat,target.tech);
    const civicReady=!target.civic || adopted(state,seat,target.civic);
    const qualified=eraReady && techReady && civicReady;
    const blockers=[];
    if (!qualified) blockers.push('Complete the required era and council projects.');
    if (!legalSite) blockers.push(sea ? 'Refit on friendly or neutral water within one hex of your shipyard.' : 'Move into your territory to upgrade.');
    if (player.capital<route.cost) blockers.push('Your treasury cannot cover this upgrade.');
    if (unit.moves<=0) blockers.push('This unit has spent its movement for the turn.');
    if (!seatMayOrder(state,seat)) blockers.push('Wait for your turn.');
    return {...route,era:target.era,tech:target.tech,civic:target.civic,eraReady,techReady,civicReady,
      future:advancementRoutes(route.to,UNIT_TYPES).map(p=>p.to),
      current:{strength:current.strength,range:current.range,maxMoves:unit.maxMoves,hp:unit.hp,maxHp:unit.maxHp},
      outcome:promotionOutcome(unit,current,target,knows(state,seat,'hydrography')),
      qualified,legalSite,station:sea?'shipyard':'territory',capital:player.capital,moves:unit.moves,enabled:!blockers.length,reason:blockers[0]||'',blockers};
  });
}
function fieldUpgrade(state,unit) {
  const plans=getUpgradePlans(state,unit.id,unit.seat);
  return plans.find(p=>p.enabled) || plans.find(p=>p.qualified) || null;
}
export function getRecoveryForecast(state,unitId,seat) {
  const unit=unitOrNull(state,unitId);
  if (!unit || unit.seat!==seat || (state.intel && state.intel.seat!==seat)) return null;
  const definition=UNIT_TYPES[unit.type];
  const forecast=recoveryAt(state,unit,definition,hexDistance);
  return {...forecast,nearest:nearestServiceStation(state,unit,definition,hexDistance)};
}
export function getUnitOptions(state,unitId) {
  const empty={moves:[],attacks:[],canFound:false,improvements:[],upgrade:null},unit=unitOrNull(state,unitId);
  if (!active(state,unit)) return empty;
  const improvement=unitImprovement(state,unit,unit.tile);
  return {moves:[...findRoutes(state,unit).parents.keys()],attacks:attackTargets(state,unit),upgrade:fieldUpgrade(state,unit),
    canFound:unit.type==='settler' && canSettle(state,unit.seat,unit.tile),improvements:improvement ? [improvement]:[]};
}
function productionUnlocked(state,seat,definition,era=getEra(state,seat)) {
  return (!definition.era || era.rank>=ERAS[definition.era].rank)
    && (!definition.tech || knows(state,seat,definition.tech))
    && (!definition.civic || adopted(state,seat,definition.civic));
}

export function getProductionOptions(state,cityId,{replace=false}={}) {
  const city=cityOrNull(state,cityId);
  if (!city || (state.intel && state.intel.seat!==city.seat)) return [];
  const rate=getCityYield(state,city.id).production;
  const era=getEra(state,city.seat), berth=getPortSite(state,city.id);
  const map=getMap(state);
  const hasCoast=city.buildings.includes('harbor') || berth || findPortSite(
    state,city,map.byId,map.neighbors,getVision(state,city.seat).explored,true);
  const available=Object.entries(PRODUCTS).filter(([item,def])=>
    (item!==SCIENCE_PROJECT.id || allowsScience(state)) && productionUnlocked(state,city.seat,def,era) &&
    (hasCoast || !(Object.hasOwn(PORT_BUILDINGS,item) || def.domain==='sea')));
  return available.map(([item,def])=>{
    const kind=item===SCIENCE_PROJECT.id ? 'project' : Object.hasOwn(UNIT_TYPES,item) ? 'unit':'building';
    let reason='';
    if (state.phase!=='playing') reason='The campaign has ended.';
    else if (!seatMayOrder(state,city.seat)) reason='Wait for the city owner’s turn.';
    else if (city.queue && (!replace || city.queue.item===item)) reason='This city already has a project in progress.';
    else if (city.buildings.includes(item)) reason='This city already has that building.';
    else if (WONDERS[item] && campusStatus(state,item)==='complete') reason='This university has already opened.';
    else if (WONDERS[item] && state.cities.some(c=>c.seat===city.seat && c.queue?.item===item)) reason='One of your cities already holds this charter.';
    else if (item==='harbor' && !berth) reason='Settle on the shore or claim a shore district connected to this city within two hexes.';
    else if ((item==='shipyard' || def.domain==='sea') && !city.buildings.includes('harbor')) reason='Build a harbor in this city first.';
    else if ((item==='frigate' || def.shipyard) && !city.buildings.includes('shipyard')) reason='Build a shipyard in this city first.';
    else if (WONDERS[item] && state.players[city.seat].capital+(replace ? city.queue?.grant || 0 : 0)<def.grant) reason='You need '+def.grant+' capital.';
    else if (WONDERS[item] && !getWonderSites(state,city.id,item).length) reason='Claim an empty land tile within two hexes of the city.';
    const gold=purchasePrice(city,item,def.required);
    const current=city.queue?.item===item;
    const buyReason=kind==='project' ? 'Orbital Survey requires city production.' : WONDERS[item] ? 'University wonders require city production.' :
      (current && state.phase==='playing' && seatMayOrder(state,city.seat) ? '' : reason) ||
      (!gold ? 'This project is ready for completion.' : '') ||
      (state.players[city.seat].capital+(replace && !current ? city.queue?.grant || 0 : 0)<gold ? 'Not enough gold.' : '') ||
      (kind==='unit' && !deploymentTile(state,city,item) ? 'No deployment tile is available. Move a unit before buying.' : '');
    return {gold,buyReason,buyEnabled:!buyReason,item,label:def.name,kind,era:def.era || null,saved:parkedProduction(city,item),turns:Math.ceil((def.required-parkedProduction(city,item))/rate),required:def.required,enabled:!reason,reason};
  });
}
const SCIENCE = {bank:'science', income:'scienceIncome', known:'technologies', focus:'research',
  order:'research', event:'discovery', verb:'discovered'};
const CULTURE = {bank:'culture', income:'cultureIncome', known:'civics', focus:'civic',
  order:'civic', event:'adoption', verb:'adopted'};

function councilOptions(state, seat, track) {
  const player = state.players[seat];
  if (!player) return [];
  const known = player[track.known] || [];
  const bank = player[track.bank] || 0;
  const income = getStats(state, seat)[track.income];
  const tree=councilTree(state,track.focus);
  return Object.entries(tree).filter(([item])=>item!=='rocketry' || allowsScience(state)).map(([item, project]) => {
    const completed = known.includes(item);
    const active = player[track.focus] === item;
    const missing = project.requires.filter(key => !known.includes(key));
    let reason = "";
    if (state.phase !== "playing") reason = "The campaign has ended.";
    else if (!seatMayOrder(state,seat)) reason = "Wait for your turn.";
    else if (completed) reason = "Your faction has already completed this project.";
    else if (active) reason = "This is your current project.";
    else if (missing.length) reason = "Requires " + missing.map(key=>tree[key].name).join(" + ") + ".";
    const cost=councilProjectCost(state,track.focus,tree,item);
    const remaining = Math.max(0, cost - bank);
    const turns = completed || remaining === 0 ? 0 : income > 0 ? Math.ceil(remaining / income) : null;
    return {item, label: project.name, description: project.description, cost, remaining, era: project.era,
      requires: project.requires, ...(project.tier ? {tier:project.tier} : {}), locked: missing.length>0, completed, active, turns, enabled: !reason, reason};
  });
}
export function getResearchOptions(state, seat) { return councilOptions(state,seat,SCIENCE); }
export function getCivicOptions(state, seat) { return councilOptions(state,seat,CULTURE); }

function finishProject(state, seat, track) {
  const player = state.players[seat], item = player[track.focus];
  if (!item) return;
  const tree=councilTree(state,track.focus);
  const cost=councilProjectCost(state,track.focus,tree,item);
  if (player[track.bank] < cost) return;
  player[track.bank] -= cost;
  player[track.known] = [...player[track.known], item];
  player[track.focus] = null;
  record(state, seat, track.event, FACTIONS[state.players[seat].faction].name+' '+track.verb+' '+tree[item].name+'.', null, {item});
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
  feedCity(city, foodForecast(city,yieldNow.food,extraHousing(state.players[city.seat])));
  if (city.population!==previousPopulation) {
    const verb=city.population>previousPopulation?' grew to ':' fell to ';
    record(state,city.seat,'population',city.name+verb+city.population+' residents.',city.tile,{city:city.id});
  }
  const queue=city.queue;
  if (!queue) return;
  queue.progress=Math.min(queue.required,queue.progress+yieldNow.production);
  if (queue.progress>=queue.required) completeCityProject(state,city);
}
function queueCityProject(state,city,option,chosenSite) {
  if (option.kind==='project' && chosenSite!=null) throw new Error('Orbital Survey launches from the city.');
  let site;
  if (WONDERS[option.item]) {
    const candidate=getWonderSites(state,city.id,option.item).find(s=>s.id===chosenSite);
    if (!candidate) throw new Error('Choose a surveyed campus site.');
    site=candidate.id;
    state.players[city.seat].capital-=WONDERS[option.item].grant;
    state.wonderRegistry={...state.wonderRegistry,[option.item]:'commissioned'};
  }
  if (!WONDERS[option.item] && option.kind==='building') {
    const sites=getProjectSites(state,city.id,option.item);
    const selected=chosenSite==null ? sites[0] : sites.find(s=>s.id===chosenSite);
    if (!selected) throw new Error('Choose an available construction tile.');
    site=selected.id;
  } else if (option.kind==='unit' && chosenSite!=null) throw new Error('Units deploy from the city.');
  const berth=option.item==='harbor' ? site : null;
  city.queue={item:option.item,required:option.required,progress:resumeWork(city,option.item),...(site ? {site} : {}),...(WONDERS[option.item] ? {grant:WONDERS[option.item].grant} : {}),...(berth ? {portTile:berth} : {})};
}
function deploymentTile(state,city,item) {
  const map=getMap(state);
  const vessel=UNIT_TYPES[item].domain==='sea';
  const origin=vessel ? city.portTile : city.tile;
  if (!origin) return null;
  return [origin,...map.neighbors(origin)].find(id=>(vessel ? waterKind(map.byId[id]) : terrainCost[map.byId[id].terrain]) &&
    !wildAt(state,id) && !state.units.some(u=>u.tile===id) && !state.cities.some(c=>c.tile===id && c.seat!==city.seat) &&
    (state.board[id].owner===null || state.board[id].owner===city.seat));
}
function completeCityProject(state,city) {
  if(city.queue.item===SCIENCE_PROJECT.id) {
    city.queue=null;
    advanceProduction(city);
    record(state,city.seat,'complete',city.name+' completed Orbital Survey.',city.tile,{item:SCIENCE_PROJECT.id,city:city.id});
    finish(state,membersOfTeam(state,city.seat),'science');
    return;
  }
  const queue=city.queue,map=getMap(state);
  if (Object.hasOwn(UNIT_TYPES,queue.item)) {
    const spawnTile=deploymentTile(state,city,queue.item);
    if (!spawnTile) return;
    const recruit=spawn(state,city.seat,queue.item,spawnTile);
    recruit.moves=0;
    if(UNIT_TYPES[queue.item].domain==='sea' && state.waterways)recruit.launchedFrom=city.id;
  } else {
    if (queue.item==='harbor') {
      const tile = queue.portTile || getPortSite(state,city.id);
      if (!tile) return;
      city.portTile = tile;
    }
    if (WONDERS[queue.item] && queue.site) {
      const terrain=map.byId[queue.site].terrain;
      state.board[queue.site]={...state.board[queue.site],wonder:queue.item,wonderCity:city.id};
      if (WONDERS[queue.item].terrain.includes(terrain)) city.campusHonors=[...(city.campusHonors||[]),queue.item];
    }
    if(WONDERS[queue.item]) settleCampusRace(state,city,queue.item,record);
    if (!WONDERS[queue.item]) {
      const site=queue.site || (queue.item==='harbor' ? city.portTile : city.tile);
      city.buildingSites={...city.buildingSites,[queue.item]:site};
      if (site!==city.tile && site!==city.portTile) {
        state.board[site]={...state.board[site],facility:queue.item,facilityCity:city.id};
      }
    }
    city.buildings.push(queue.item);
    if (queue.item==='walls') {city.maxHp+=50; city.hp=Math.min(city.maxHp,city.hp+50);}
  }
  record(state,city.seat,'complete',city.name+' completed '+PRODUCTS[queue.item].name+'.',city.tile,{item:queue.item,city:city.id});
  city.queue=null;
  advanceProduction(city);
}
function membersOfTeam(state,seat) {
  return state.players.flatMap((_,other)=>sameTeam(state,seat,other) ? [other] : []);
}
function controlsOriginalCapitals(state,seat) {
  // An unfounded civilization can still establish its capital later.
  return state.players.every((player,founder)=>{
    const capital=state.cities.find(city=>city.originalSeat===founder);
    return capital ? sameTeam(state,capital.seat,seat) : Boolean(state.victoryMode && player.eliminated);
  });
}
function civicLeaders(state) {
  const scores=new Map();
  state.players.forEach((player,seat)=>{
    if (player.eliminated) return;
    const team=getTeamId(state,seat);
    scores.set(team,(scores.get(team) ?? 0)+player.score);
  });
  const top=Math.max(...scores.values());
  const winners=state.players.flatMap((_,seat)=>scores.get(getTeamId(state,seat))===top ? [seat] : []);
  return {top,winners};
}
function finish(state,winners,reason,score) {
  state.phase='finished';state.winners=winners;state.actionsLeft=0;state.victoryReason=reason;
  if (reason==='science') {
    const winner=winners[0];
    const name=state.teams ? teamLabel(getTeamId(state,winner)) : FACTIONS[state.players[winner].faction].name;
    record(state,winner,'finish',name+' won a science victory.');
    return;
  }
  if (reason==='practice') {
    const result=winners.length ? 'Practice goal reached' : 'Practice complete';
    record(state,0,'finish',result+' with '+state.players[0].score+' civic points.');
    return;
  }
  if (state.teams) {
    const teams=[...new Set(winners.map(seat=>getTeamId(state,seat)))];
    const names=teams.map(teamLabel).join(' and ');
    const result=reason==='survival' ? ' is the last team standing.' : reason==='domination' ? ' controls every original capital.' :
      (teams.length>1 ? ' shared victory' : ' won')+' with '+score+' civic points.';
    record(state,winners[0],'finish',names+result);
    return;
  }
  const names=winners.map(i=>FACTIONS[state.players[i].faction].name).join(' and ');
  const message=reason==='survival' ? names+' is the last civilization standing.' : reason==='domination' ? names+' controls every original capital.' : names+(winners.length===1 ? ' won' : ' shared victory')+' with '+state.players[winners[0]].score+' civic points.';
  record(state,winners[0],'finish',message);
}
function settleSeatEconomy(state,seat) {
  const map=getMap(state);
  const income=getStats(state,seat),player=state.players[seat];
  bankHarvest(state,seat,map.byId,map.neighbors);
  player.capital+=income.capitalIncome;player.influence+=income.influenceIncome;
  const borders = getCityExpansions(state,seat);
  for (const city of state.cities) if (city.seat===seat) {
    const parcel=advanceCityBorder(state,city,borders.get(city.id));
    if (parcel) record(state,seat,'border','The city incorporated a district.',parcel,{city:city.id});
    produceCityTurn(state,city);
    if (state.phase==='finished') {refreshScores(state); return;}
  }
  player.science += income.scienceIncome;
  player.culture += income.cultureIncome;
  finishProject(state, seat, SCIENCE);
  finishProject(state, seat, CULTURE);
  refreshScores(state);
  record(state,seat,'end',FACTIONS[state.players[seat].faction].name+' ended its turn.');
}
function startNextRound(state) {
  const map=getMap(state);
  if (!state.victoryMode) {
    const {top,winners}=civicLeaders(state);
    const targetReached=top>=getScoreTarget(state);
    if (state.round>=MAX_ROUNDS || targetReached) {
      if (state.practice) finish(state,targetReached ? [0] : [],'practice');
      else finish(state,winners,'civic',top);
      return false;
    }
  }
  state.round++;
  barbarianRound(state,map,map.neighbors,hexDistance,UNIT_TYPES,record);
  return true;
}
function refreshSeat(state,next) {
  const towns=state.cities.filter(c=>c.seat===next);
  const recovery=adopted(state,next,'mutualAid') ? 12 : 6;
  for (const city of towns) city.hp=Math.min(city.maxHp,city.hp+recovery);
  for (const unit of state.units) if (unit.seat===next) {
    const def=UNIT_TYPES[unit.type];
    if (def.domain==='sea' && knows(state,next,'hydrography')) unit.maxMoves=def.moves+1;
    unit.moves=unit.maxMoves;
    unit.hp=recoveryAt(state,unit,def,hexDistance).hpAfter;
    if (unit.resting) delete unit.resting;
  }
}
function advanceTeamIfReady(state) {
  let active=activeTeamSeats(state);
  if (!active.length) {
    const next=nextTeamPhase(state);
    if (!next || (next.wrap && !startNextRound(state))) return;
    state.teamPhase=newTeamPhase(state,next.team,id=>ACTIONS_PER_TURN+Number(adopted(state,id,'federation')));
    active=activeTeamSeats(state);
    for (const id of active) refreshSeat(state,id);
  }
  state.turn=active[0];
  state.actionsLeft=state.teamPhase.orders[state.turn];
}
function endTurn(state,seat) {
  settleSeatEconomy(state,seat);
  if (state.phase==='finished') return;
  if (state.teamPhase) {
    state.teamPhase.readySeats.push(seat);
    state.teamPhase.orders[seat]=0;
    advanceTeamIfReady(state);
    return;
  }
  let next=(seat+1)%state.players.length;
  while (state.players[next].eliminated && next!==seat) next=(next+1)%state.players.length;
  const count=state.players.length;
  const roundPosition=id=>(id-(state.firstSeat ?? 0)+count)%count;
  if (roundPosition(next)<=roundPosition(seat)) {
    if (!startNextRound(state)) return;
  }
  state.turn=next;state.actionsLeft=ACTIONS_PER_TURN+Number(adopted(state,next,'federation'));
  refreshSeat(state,next);
}
// Compute spotter-assisted forecasts on the authority without disclosing rival
// research or a city's private construction queue to the attacking client.
export function campaignView(state, seat) {
  if(!state || state.intel?.seat===seat) return state;
  state=actingPerspective(state,seat);
  const view=projectForSeat(state,seat), forecasts={}, unavailableSites=[], portSites={}, workSites={}, districtChoices=[];
  const harborChoices={};
  for(const city of view.cities) if(city.seat===seat) {
    const map=getMap(state),visible=(state.opening==='settlers'||state.enforceSight) ? new Set(view.intel.visible) : null;
    const berths=harborSites(state,city,map.byId,map.neighbors,visible);
    harborChoices[city.id]=berths;
    portSites[city.id]=berths[0] || null;
  }
  if(state.phase==='playing' && state.turn===seat) {
    const visible=new Set(view.intel.visible);
    if (state.actionsLeft) {
      for (const tile of visible) if (getActions(state,seat,tile,visible)[0]?.enabled) districtChoices.push(tile);
    }
    for(const unit of view.units) {
      if(unit.seat!==seat || !unit.moves)continue;
      if(unit.charges) {
        const sites={};
        for (const tile of [unit.tile,...findRoutes(view,unit).parents.keys()]) {
          const allowed=unitImprovement(state,unit,tile);
          if (allowed) sites[tile]=allowed;
        }
        workSites[unit.id]=sites;
      }
      if(unit.type==='settler' && !canSettle(state,seat,unit.tile)) unavailableSites.push(unit.tile);
      if(!UNIT_TYPES[unit.type].range)continue;
      for(const target of attackTargets(state,unit)) {
        if(!visible.has(target))continue;
        const forecast=combatPreview(state,unit.id,target);
        if(forecast)(forecasts[unit.id]??={})[target]=forecast;
      }
    }
  }
  return {...view,intel:{...view.intel,forecasts,unavailableSites,portSites,harborSites:harborChoices,workSites,districtChoices}};
}

export function combatPreview(state, unitId, target) {
  if(state.intel) return state.intel.forecasts?.[unitId]?.[target] ?? null;
  return calculateCombatPreview(state,unitId,target);
}

function calculateCombatPreview(state,unitId,target) {
  const unit = unitOrNull(state, unitId);
  if (!active(state, unit) || !attackTargets(state, unit).includes(target)) return null;

  const wild=wildAt(state,target);
  if (wild) return wildForecast(unit,UNIT_TYPES[unit.type],wild);

  // A garrison absorbs the hit before the city can be damaged.
  const defender = state.units.find(other => other.tile === target && !sameTeam(state,other.seat,unit.seat));
  const town = state.cities.find(city => city.tile === target && !sameTeam(state,city.seat,unit.seat));
  const opponent = defender || town;
  const canCapture = UNIT_TYPES[unit.type].captures === true;
  const mode=attackMode(UNIT_TYPES[unit.type]);
  const melee=mode==='melee';
  const walls = !!town?.buildings.includes('walls');
  const terrain = getMap(state).byId[target].terrain;
  const terrainDefense = terrain === 'hills' || terrain === 'forest' ? 4 : 0;
  const strength = Math.round(UNIT_TYPES[unit.type].strength * (0.75 + 0.25 * unit.hp / unit.maxHp));
  const attackBonus = (knows(state, unit.seat, 'tactics') ? 7 : 0)
    + (UNIT_TYPES[unit.type].range > 1 && knows(state, unit.seat, 'ballistics') ? 5 : 0);
  const role=matchup(unit,defender,town,state,hexDistance,UNIT_TYPES);
  const position=defender?.fortified && fieldPosition(state,defender,UNIT_TYPES[defender.type],terrain);
  if (position) role.notes.push(position.benefit);
  let damage = Math.min(opponent.hp, Math.max(1, strength + role.damage + attackBonus - terrainDefense - (position?.guard || 0) - (walls ? 7 : 0)));
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
    attackMode:mode, defenderType: defender ? 'unit' : 'city', defenderId: opponent.id, roleNotes:role.notes,
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
  const garrison = isUnit && state.cities.find(c => c.tile === target && sameTeam(state,c.seat,defender.seat));
  const recordResult = prepareBattle(state, unit, defender, result, {garrison:garrison?.name});
  const name = isUnit ? UNIT_TYPES[defender.type].name+' in '+getMap(state).byId[target].name : defender.name;
  defender.hp = result.defenderHpAfter;
  if (result.capture) {
    defender.seat = unit.seat;
    defender.borderProgress = 0;
    const lostCharter=WONDERS[defender.queue?.item];
    defender.queue = null;
    delete defender.parkedProduction;
    advanceProduction(defender);
    if(lostCharter) updateCampusRegistry(state);
    for (const [id,holding] of Object.entries(state.board)) {
      if (holding.wonderCity===defender.id || holding.facilityCity===defender.id) state.board[id]={...holding,owner:unit.seat};
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
  if (state.practice) { recordResult(); return; }
  let elimination=false;
  if (state.opening==='settlers') {
    for (const [seat,player] of state.players.entries()) {
      if (player.eliminated || state.cities.some(c=>c.seat===seat) || state.units.some(u=>u.seat===seat && u.type==='settler')) continue;
      player.eliminated=true;elimination=true;
      state.units=state.units.filter(u=>u.seat!==seat);
      for (const [id,h] of Object.entries(state.board)) if(h.owner===seat) state.board[id]={...h,owner:null,level:0};
    }
  }
  const remaining=state.players.map((p,i)=>p.eliminated ? -1 : i).filter(i=>i>=0);
  const lastTeam=remaining.length>0 && remaining.every(seat=>sameTeam(state,seat,remaining[0]));
  // Losing an unfounded settler can settle the last outstanding capital. The
  // alliance holding the actual capitals may even be a third party in combat.
  const holder=state.victoryMode && elimination && !lastTeam
    ? state.cities.find(city=>city.originalSeat!=null)?.seat : result.capture ? unit.seat : null;
  if (allowsConquest(state) && holder!=null && controlsOriginalCapitals(state,holder)) {
    refreshScores(state);
    finish(state,membersOfTeam(state,holder),'domination');
  } else if (allowsConquest(state) && state.opening==='settlers' && lastTeam) {
    refreshScores(state);
    finish(state,membersOfTeam(state,remaining[0]),'survival');
  }
  recordResult();
}
function unitOrder(state,seat,action) {
  const unit=unitOrNull(state,action.unit);
  if (!unit || unit.seat!==seat) throw new Error('Choose one of your units.');
  if (!unit.moves) throw new Error('This unit has spent its movement for the turn.');
  const id=unit.tile, label=UNIT_TYPES[unit.type].name;
  if (unit.fortified && action.type!=='fortify') delete unit.fortified;
  if (action.type==='fortify') {
    holdGround(state,unit,UNIT_TYPES[unit.type],getMap(state).byId[id].terrain);
    record(state,seat,'fortify','The unit prepared a defensive position.',id,{unit:unit.id});
  } else if (action.type==='move') {
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
  } else if (action.type==='haulFish' || action.type==='landCatch') {
    runFishingTask(state,unit,action,getMap(state).byId);
    record(state,seat,action.type,action.type==='haulFish'?'Fishing crew loaded a catch.':'The harbor received 3 food and 1 stored fish.',id,{unit:unit.id});
  } else if (action.type==='recover') {
    if (!recoveryAt(state,unit,UNIT_TYPES[unit.type],hexDistance).canRest)
      throw new Error('Choose a wounded unit with movement on a valid recovery site.');
    unit.resting=true;
    unit.moves=0;
    record(state,seat,'recover','The unit is resting until its next turn.',id,{unit:unit.id});
  } else if (action.type==='upgrade') {
    const upgrade=action.item===undefined ? fieldUpgrade(state,unit) :
      getUpgradePlans(state,unit.id,unit.seat).find(plan=>plan.to===action.item);
    if (!upgrade?.enabled) throw new Error(upgrade?.reason || 'No field upgrade is available.');
    const def=UNIT_TYPES[upgrade.to];
    const {hp,maxHp,moves,maxMoves}=upgrade.outcome;
    Object.assign(unit,{type:upgrade.to,hp,maxHp,moves,maxMoves});
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
    if (first && (state.teams || state.victoryMode) && allowsConquest(state) && controlsOriginalCapitals(state,seat)) {
      refreshScores(state);
      finish(state,membersOfTeam(state,seat),'domination');
    }
  } else {
    const item=unitImprovement(state,unit,id);
    if (!item || item!==action.item) throw new Error(unit.type==='workboat'
      ? 'Build a fishery within two connected sea steps or three charted inland water steps of your harbor.'
      : 'Build a suitable improvement on one of your unimproved districts.');
    const port=item==='fishery' ? fisheryPort(state,seat,id,getMap(state).byId,getMap(state).neighbors,
      state.waterways ? getVision(state,seat).explored : null) : null;
    state.board[id]={...state.board[id],improvement:item,...(port ? {owner:seat,portCity:port.id} : {})};
    unit.moves=0;unit.charges--;
    if (!unit.charges) state.units=state.units.filter(u=>u.id!==unit.id);
    record(state,seat,'improve',label+' built a '+IMPROVEMENTS[item].name.toLowerCase()+' in '+getMap(state).byId[id].name+'.',id,{unit:unit.id,item});
  }
}
export function applyAction(source,seat,action) {
  const current=migrateGame(source);
  if (!current.teamPhase) return rememberVision(resolveOrder(current,seat,action),current);
  if (!seatMayOrder(current,seat)) throw new Error('Wait for your turn.');
  const phase=current.teamPhase;
  const actor=actingPerspective(current,seat);
  const next=resolveOrder({...actor,teamPhase:{...phase,orders:[...phase.orders],
    sequence:[...phase.sequence],readySeats:[...phase.readySeats]}},seat,action);
  if (action.type!=='end' && next.phase==='playing') {
    next.teamPhase.orders[seat]=next.actionsLeft;
    next.teamPhase.sequence[seat]++;
    advanceTeamIfReady(next);
  }
  return rememberVision(next,current);
}
function resolveOrder(source,seat,action) {
  const state=migrateGame(source);
  if (state.phase!=='playing') throw new Error('The campaign has ended.');
  if (!Number.isInteger(seat) || seat!==state.turn) throw new Error('Wait for your turn.');
  if (!action || typeof action!=='object') throw new Error('Choose an action.');
  const next=cloneGame(state);
  if (action.type==='end') {endTurn(next,seat);return next;}
  if (action.type==='delegation') {
    sendDelegation(next,seat,action.target,getVisibleTiles(next,seat));
    record(next,seat,'delegation','Diplomatic delegation dispatched.',null,{target:action.target});
  } else if (action.type==='shipment') {
    shipGoods(next,seat,action);
    record(next,seat,'shipment','Resource shipment dispatched.');
  } else if (action.type==='research' || action.type==='civic') {
    selectProject(next, seat, action.item, action.type==='research' ? SCIENCE : CULTURE);
  } else if (action.type==='policy') {
    const name=ratifyPolicy(next,seat,action.item);
    record(next,seat,'policy','Ruling policy · '+name,null,{item:action.item});
  } else if (action.type==='focus') {
    const city=cityOrNull(next,action.city);
    if(!city || city.seat!==seat) throw new Error('Choose one of your cities.');
    if(!Object.hasOwn(CITY_FOCUS,action.item)) throw new Error('Choose a valid citizen focus.');
    city.focus=action.item;
    city.focusRound=state.round;
  } else if (['produce','switchProduction','buyProduction'].includes(action.type)) {
    const city=cityOrNull(next,action.city);
    if (!city || city.seat!==seat) throw new Error('Choose one of your cities.');
    const buying=action.type==='buyProduction';
    const finishing=buying && city.queue?.item===action.item;
    const replacing=action.type==='switchProduction' || (buying && city.queue && !finishing);
    if (buying || replacing || action.expected!=null) verifyProduction(city,action.expected);
    if (replacing && !city.queue) throw new Error('This city has no project to switch.');
    const option=getProductionOptions(next,city.id,{replace:replacing}).find(o=>o.item===action.item);
    if (buying) {
      if (!option?.buyEnabled) throw new Error(option?.buyReason || 'Choose a purchasable project.');
      if (finishing && action.site!=null && action.site!==city.queue.site) throw new Error('This project already has a construction tile.');
      if (action.gold!==option.gold) throw new Error('The purchase price changed. Review the new quote.');
    } else if (!option?.enabled) throw new Error(option?.reason || 'Choose an available production project.');
    if (replacing) {
      parkProject(city);
      if (city.queue.grant) next.players[seat].capital+=city.queue.grant;
      city.queue=null;
      updateCampusRegistry(next);
    }
    if (!finishing) queueCityProject(next,city,option,action.site);
    if (buying) {
      next.players[seat].capital-=option.gold;
      city.queue.progress=city.queue.required;
      completeCityProject(next,city);
      if (city.queue) throw new Error('No deployment tile is available. Move a unit before buying.');
      record(next,seat,'purchase','Project purchased.',city.tile,{city:city.id,item:option.item,gold:option.gold});
    } else {
      advanceProduction(city);
      record(next,seat,'produce',city.name+' started production of '+option.label+'.',city.tile,{city:city.id,item:option.item});
    }
  } else if (action.type==='fortify') {
    unitOrder(next,seat,action);
  } else if (['move','attack','found','improve','upgrade','survey','recover','haulFish','landCatch'].includes(action.type)) {
    unitOrder(next,seat,action);
  } else {
    if (typeof action.tile!=='string') throw new Error('Choose a district.');
    const [order]=getActions(next,seat,action.tile);
    if (!order || action.type!==order.type) throw new Error('That order is unavailable in this district.');
    if (!order.enabled) throw new Error(order.reason);
    const tile=getMap(state).byId[action.tile],prior=next.board[tile.id],player=next.players[seat];
    player.capital-=order.cost.capital;player.influence-=order.cost.influence;
    next.board[tile.id]={...prior,owner:seat,level:order.type==='develop' ? prior.level+1:prior.level};
    next.actionsLeft-=DISTRICT_ORDER_COST;
    const verb={develop:'developed',contest:'took control of',claim:'claimed'}[order.type];
    record(next,seat,order.type,FACTIONS[state.players[seat].faction].name+' '+verb+' '+tile.name+'.',tile.id);
  }
  refreshScores(next);
  return next;
}
function botProject(state,city,difficulty) {
  const units=state.units.filter(u=>u.seat===city.seat);
  const cities=state.cities.filter(c=>c.seat===city.seat);
  const count=type=>units.filter(u=>u.type===type).length+cities.filter(c=>c.queue?.item===type).length;
  const choices=[];
  const survey=Array.isArray(state.intel.visibleBerths), region=getMap(state);
  const vacant=!city.buildings.includes('harbor') && survey ? harborSites(state,city,region.byId,region.neighbors,new Set(state.intel.visible)) : [];
  const surveyedPorts=vacant.map(id=>({id,basin:fleetBasin(state,city,id,region)}))
    .filter(p=>p.basin.available.length).sort((a,b)=>b.basin.score-a.basin.score);
  let preferredBerth=surveyedPorts[0]?.id;
  if (allowsScience(state) && !cities.some(c=>c.queue?.item===SCIENCE_PROJECT.id)) choices.push(SCIENCE_PROJECT.id);
  const rivals=state.units.filter(unit=>!sameTeam(state,city.seat,unit.seat));
  const hostileCities=state.cities.filter(other=>!sameTeam(state,city.seat,other.seat));
  // A bombardment needs one healthy ground formation to occupy the city.
  if (survey && difficulty!=='easy' && allowsConquest(state) &&
      !units.some(readyToOccupy) && !cities.some(own=>UNIT_TYPES[own.queue?.item]?.captures)) {
    const [target]=citiesUnderNavalFire(state,city.seat);
    if (target) {
      const distance=own=>hexDistance(own.tile,target.tile);
      const nearest=cities.reduce((best,own)=>distance(own)<distance(best)?own:best);
      if (city.id===nearest.id) choices.push('armor','cavalry','riflemen','melee');
    }
  }
  if(difficulty==='easy') {
    const danger=rivals.some(unit=>UNIT_TYPES[unit.type].strength && hexDistance(unit.tile,city.tile)<=2);
    if(danger && !count('melee'))choices.push('melee');
    choices.push('granary','monument');
    if(!count('melee'))choices.push('melee');
    choices.push('workshop');
  }
  if(difficulty==='hard') {
    const near=rivals.some(u=>UNIT_TYPES[u.type].strength && hexDistance(u.tile,city.tile)<=4) ||
      state.barbarians?.parties.some(p=>p.type==='raider' && hexDistance(p.tile,city.tile)<=3);
    if(near && !count('melee'))choices.push('melee');
    if(near && !count('ranged'))choices.push('ranged');
    if(cities.length<2 && !count('settler') && (count('melee') || count('ranged'))) {
      const map=getMap(state),charted=new Set(state.intel.explored);
      const site=state.intel.visible.some(id=>hexDistance(city.tile,id)<=5 && canSettle(state,city.seat,id) &&
        !rivals.some(unit=>UNIT_TYPES[unit.type].strength && hexDistance(unit.tile,id)<=2) &&
        map.neighbors(id).filter(near=>charted.has(near) && terrainCost[map.byId[near].terrain] &&
          state.board[near].owner===null && !state.board[near].naturalWonder).length>=3);
      if(site)choices.push('settler');
    }
    if(!count('melee'))choices.push('melee');
    if(!city.buildings.includes('workshop'))choices.push('workshop');
  }
  if (state.opening==='settlers' && count('scout')===0 && state.round<8) choices.push('scout');
  if (preferredBerth && !rivals.some(u=>UNIT_TYPES[u.type].strength>0 && hexDistance(u.tile,city.tile)<=2)) choices.push('harbor');
  const forecast=getPopulationReport(state,city.id);
  if (forecast.housingLimited && !city.buildings.includes('granary')) choices.push('granary');
  if (forecast.housingLimited && !city.buildings.includes('neighborhood')) choices.push('neighborhood');
  const defensible=units.some(u=>UNIT_TYPES[u.type]?.strength>0 && UNIT_TYPES[u.type]?.domain!=='sea')
    && !rivals.some(u=>UNIT_TYPES[u.type]?.strength>0 && hexDistance(u.tile,city.tile)<=2);
  if (!choices.length && defensible && state.players[city.seat].capital>=12 && (state.round>=5 || cities.length>1)) {
    const preferences=[
      ['ucla','berkeley','stanford','caltech'],['stanford','caltech','ucla','berkeley'],
      ['berkeley','ucla','caltech','stanford'],['caltech','stanford','berkeley','ucla']
    ][state.players[city.seat].faction%4];
    const available=getProductionOptions(state,city.id);
    const university=preferences.find(item=>available.some(o=>o.item===item && o.enabled));
    if(university && !cities.some(c=>WONDERS[c.queue?.item])) {
      const site=getWonderSites(state,city.id,university)[0];
      if(site) return {type:'produce',city:city.id,item:university,site:site.id};
    }
  }
  if(!city.buildings.includes('harbor') && !survey) {
    const map=getMap(state);
    const berth=findPortSite(state,city,map.byId,map.neighbors,new Set(state.intel.visible),false,
      id=>observedCoast(state,city.seat,id));
    if(berth){preferredBerth=berth;choices.push('harbor');}
  }
  if (city.buildings.includes('harbor')) {
    const worked=Object.values(state.board).filter(tile=>tile.portCity===city.id).length;
    const basin=survey ? fleetBasin(state,city,city.portTile,region) : null;
    const countFleet=basin?.count || count;
    if (worked<2 && !countFleet('workboat') && (!basin || basin.available.some(id=>basin.tiles.get(id)<=2))) choices.push('workboat');
    const haveYard=city.buildings.includes('shipyard');
    const hullLimit=basin && haveYard && basin.tiles.size>=8 && state.round>=14 ? 2 : 1;
    if (!countFleet('cutter') && (!basin || (!basin.armed && basin.tiles.size>=4))) choices.push('cutter');
    if (haveYard && (!basin || (basin.tiles.size>=8 && basin.armed<hullLimit))) {
      if (!count('destroyer') && (state.round>=14 || rivals.some(u=>UNIT_TYPES[u.type].domain==='sea'))) choices.push('destroyer');
      if (!count('ironclad') && hostileCities.length) choices.push('ironclad');
      if (!count('frigate')) choices.push('frigate');
    } else if (knows(state,city.seat,'steam') && (!basin || basin.tiles.size>=8)) choices.push('shipyard');
  }
  if (count('builder')===0) choices.push('builder');
  const charted=new Set(state.intel.explored),map=getMap(state);
  const nearby=map.neighbors(city.tile).filter(id=>charted.has(id)).map(id=>map.byId[id].terrain);
  choices.push(...formationChoices(state,city,units,count,nearby));
  for (const type of ['armor','artillery','riflemen','cavalry']) {
    if (knows(state,city.seat,UNIT_TYPES[type].tech) && !count(type)) choices.push(type);
  }
  if (count('ranged')<Math.max(1,cities.length-1)) choices.push('ranged');
  if (count('melee')<2) choices.push('melee');
  if (cities.length<3 && count('settler')===0) choices.push('settler');
  if (city.buildings.includes('harbor') && !survey) choices.push('shipyard');
  choices.push('workshop','walls','monument','granary');
  if (count('melee')<4) choices.push('melee');
  const enabled=new Set(getProductionOptions(state,city.id).filter(o=>o.enabled).map(o=>o.item));
  const option=choices.find(key=>enabled.has(key));
  if (!option) return null;
  const order={type:'produce',city:city.id,item:option};
  if (Object.hasOwn(BUILDINGS,option)) {
    const sites=getProjectSites(state,city.id,option);
    // Keep at least one vacant campus parcel while placing civic works in town.
    const chosen=option==='harbor' ? sites.find(s=>s.id===preferredBerth) : sites.length>=3 ? sites[1] : sites[0];
    if (chosen) order.site=chosen.id;
  }
  return order;
}
// March toward terrain the faction has yet to chart. Only revealed terrain
// contributes movement costs; the shape of the hex grid is public geography.
function exploreFrontier(state,unit,moves) {
  const explored=new Set(state.intel.explored);
  const newlyVisible=id=>sightFrom(state,id).reduce((total,tile)=>total+Number(!explored.has(tile)),0);
  let best=unit.tile, gain=newlyVisible(best);
  for (const tile of moves) {
    const count=newlyVisible(tile);
    if (count>gain) {best=tile;gain=count;}
  }
  if (best!==unit.tile) return {type:'move',unit:unit.id,tile:best};
  // A unit behind its own lines can still walk to a reachable chart edge.
  const frontier=[...explored].filter(id=>movementCost(state,unit,id) && getMap(state).neighbors(id).some(tile=>!explored.has(tile)));
  if(!frontier.length) return null;
  const distance=id=>Math.min(...frontier.map(tile=>hexDistance(id,tile)));
  const closer=moves.reduce((best,tile)=>distance(tile)<distance(best)?tile:best,unit.tile);
  return closer===unit.tile ? null : {type:'move',unit:unit.id,tile:closer};
}
// Building a harbor and improving fishing water both require an unreserved
// berth. Only look at the surveyed shoreline and plausible host sites, never
// at a rival city's private berth or construction queue.
function observedCoast(state,seat,id) {
  if (Array.isArray(state.intel.visibleBerths)) return state.intel.visible.includes(id) && !state.intel.visibleBerths.includes(id);
  const map=getMap(state),seen=new Set([id]),charted=new Set(state.intel.explored),visible=new Set(state.intel.visible);
  const towns=state.cities.filter(city=>city.seat===seat);
  let ring=[id];
  for(let distance=1;distance<=3;distance++){
    const next=[];
    for(const here of ring)for(const tile of map.neighbors(here)){
      if(seen.has(tile))continue;
      seen.add(tile);
      if(!charted.has(tile))return false;
      if(['ocean','mountains'].includes(map.byId[tile].terrain))continue;
      if(!visible.has(tile) && !towns.some(city=>hexDistance(city.tile,tile)<3))return false;
      if(state.cities.some(city=>city.seat!==seat && city.tile===tile))return false;
      next.push(tile);
    }
    ring=next;
  }
  return true;
}

function surveyedFishery(state,unit,id) {
  return observedCoast(state,unit.seat,id) && unitImprovement(state,unit,id);
}

function readyToOccupy(unit) {
  // Even a walled city's strongest return strike deals 24 damage.
  return UNIT_TYPES[unit.type].captures && unit.hp>24;
}

function citiesUnderNavalFire(state,seat) {
  const ships=state.units.filter(unit=>unit.seat===seat && UNIT_TYPES[unit.type].domain==='sea' && UNIT_TYPES[unit.type].strength>0);
  return state.cities.filter(city=>!sameTeam(state,seat,city.seat) &&
    ships.some(ship=>hexDistance(ship.tile,city.tile)<=UNIT_TYPES[ship.type].range))
    .sort((a,b)=>Number(b.originalSeat!=null)-Number(a.originalSeat!=null));
}

// Trace a short overland approach backward from the observed city. A river
// detour can take infantry farther away by hex distance while saving turns.
function shoreApproach(state,unit,target,moves,charted,occupied) {
  const map=getMap(state),costs=new Map([[target,0]]),queue=[target];
  for (let i=0;i<queue.length;i++) {
    const here=queue[i],bridges=map.bridgesByTile?.[here] || [];
    const incoming=[...map.neighbors(here),...bridges.map(bridge=>bridge.to)];
    for (const from of incoming) {
      if (!charted.has(from) || !movementCost(state,unit,from) || (occupied.has(from) && from!==unit.tile)) continue;
      const step=routeStepCost(state,unit,from,here),cost=costs.get(here)+step;
      if (!step || cost>18 || cost>=(costs.get(from)??Infinity)) continue;
      costs.set(from,cost);
      queue.push(from);
    }
  }
  const distance=id=>costs.get(id)??Infinity;
  const next=moves.reduce((best,id)=>distance(id)<distance(best)?id:best,unit.tile);
  if (next!==unit.tile && costs.has(unit.tile)) return {tile:next,cost:costs.get(unit.tile)};
}

function shoreAssault(state,plans) {
  const seat=state.turn;
  const troops=plans.filter(([unit])=>readyToOccupy(unit));
  if (!troops.length) return {};
  const targets=citiesUnderNavalFire(state,seat);
  if (!targets.length) return {};
  const charted=new Set(state.intel.explored);
  const pieces=[...state.units,...state.cities,...(state.barbarians?.camps||[]),...(state.barbarians?.parties||[])];
  const occupied=new Set(pieces.map(piece=>piece.tile));
  let advance,bestCost=Infinity;
  for (const city of targets) {
    for (const [unit,options] of troops) {
      if (options.attacks.includes(city.tile)) {
        if (calculateCombatPreview(state,unit.id,city.tile).capture) return {attack:{type:'attack',unit:unit.id,tile:city.tile}};
        const battery=plans.find(([ship,orders])=>UNIT_TYPES[ship.type].domain==='sea' && orders.attacks.includes(city.tile));
        if (battery) return {attack:{type:'attack',unit:battery[0].id,tile:city.tile}};
        continue;
      }
      if (!options.moves.length || hexDistance(unit.tile,city.tile)>12) continue;
      const garrison=state.cities.some(home=>home.seat===seat && home.tile===unit.tile);
      if (garrison && state.units.some(enemy=>!sameTeam(state,seat,enemy.seat) && UNIT_TYPES[enemy.type].strength && hexDistance(enemy.tile,unit.tile)<=2)) continue;
      const approach=shoreApproach(state,unit,city.tile,options.moves,charted,occupied);
      if (approach && approach.cost<bestCost) {
        bestCost=approach.cost;
        advance={type:'move',unit:unit.id,tile:approach.tile};
      }
    }
  }
  return {advance};
}

function botMovement(state,unit,options,difficulty) {
  const map=getMap(state);
  if (!options.moves.length) return null;
  const settle=unit.type==='settler', builder=unit.type==='builder';
  const candidates=[unit.tile,...options.moves];
  const explored=new Set(state.intel.explored);
  let goals;
  const hostile=other=>!sameTeam(state,unit.seat,other.seat);
  if(difficulty==='easy' && UNIT_TYPES[unit.type].strength>0 && unit.type!=='scout') {
    const towns=state.cities.filter(c=>c.seat===unit.seat);
    if(towns.length) {
      const distance=tile=>Math.min(...towns.map(c=>hexDistance(c.tile,tile)));
      if(distance(unit.tile)>3){
        const best=options.moves.reduce((prior,tile)=>distance(tile)<distance(prior)?tile:prior,unit.tile);
        return best===unit.tile ? null : {type:'move',unit:unit.id,tile:best};
      }
      options={...options,moves:options.moves.filter(tile=>distance(tile)<=3)};
      if(!options.moves.length)return null;
    }
  }
  if(UNIT_TYPES[unit.type].domain==='sea' && Array.isArray(state.intel.visibleBerths)){
    return flotillaMove(state,unit,options.moves,map,UNIT_TYPES,hexDistance,sameTeam,id=>surveyedFishery(state,unit,id));
  }
  if (unit.type==='signals') return signalPosition(state,unit,options.moves,UNIT_TYPES,hexDistance);
  if (unit.type==='scout') return exploreFrontier(state,unit,options.moves);
  if (settle) goals=state.intel.visible.filter(id=>canSettle(state,unit.seat,id));
  else if (unit.type==='workboat') {
    const site=options.moves.find(id=>surveyedFishery(state,unit,id));
    return site ? {type:'move',unit:unit.id,tile:site} : null;
  } else if (builder) {
    const eligible=map.tiles.filter(t=>explored.has(t.id) && improvementAt(state,unit.seat,t.id));
    const rich=eligible.filter(t=>state.board[t.id].resource);
    goals=(rich.length?rich:eligible).map(t=>t.id);
  }
  else if (UNIT_TYPES[unit.type].domain==='sea') {
    const range=UNIT_TYPES[unit.type].range;
    goals=[...state.units,...state.cities].filter(target=>hostile(target) && (
      movementCost(state,unit,target.tile) || (map.tiles.some(t=>explored.has(t.id) && t.terrain==='ocean' && hexDistance(t.id,target.tile)<=range))
    )).map(target=>target.tile);
  } else goals=state.cities.filter(hostile).map(c=>c.tile);
  if (!goals.length) return builder ? null : exploreFrontier(state,unit,options.moves);
  const costs=findRoutes(state,unit).costs;
  function value(tile) {
    const distance=Math.min(...goals.map(g=>hexDistance(g,tile)));
    if (settle && distance===0) {
      const territory=map.neighbors(tile).filter(k=>explored.has(k) && terrainCost[map.byId[k].terrain] && state.board[k].owner===null).length;
      return 20+territory*0.3+(map.byId[tile].landmark ? 1:0)-costs.get(tile)*0.2;
    }
    if (!builder && !settle) {
      const inRange=state.units.some(u=>hostile(u) && hexDistance(u.tile,tile)<=UNIT_TYPES[unit.type].range) ||
        state.cities.some(c=>hostile(c) && hexDistance(c.tile,tile)<=UNIT_TYPES[unit.type].range);
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
function botDistrict(state,difficulty) {
  const map=getMap(state);
  if (!state.actionsLeft) return null;
  let choice=null,best=-Infinity,bestIndex=Infinity;
  const explored=new Set(state.intel.explored);
  const visible=new Set(state.intel.visible);
  const activeCharter=Object.values(state.wonderRegistry||{}).includes('commissioned');
  for (const id of state.intel.visible) {
    const tile=map.byId[id];
    const [order]=getActions(state,state.turn,tile.id);
    if (!order?.enabled) continue;
    const parcel=state.board[id];
    // Both ordinary buildings and universities can reserve an unimproved plot.
    // Their location is private, so treat all plausible rival sites alike.
    if(order.type==='contest' && (state.researchPace>=1 || activeCharter) && !parcel.improvement && !parcel.resource &&
      !['ocean','mountains'].includes(tile.terrain)){
      const unknown=sightFrom(state,id).some(other=>!visible.has(other));
      if(unknown || state.cities.some(city=>city.seat===parcel.owner && hexDistance(city.tile,id)<=2))continue;
    }
    const frontier=map.neighbors(tile.id).filter(id=>explored.has(id) && terrainCost[map.byId[id].terrain] && state.board[id].owner===null).length;
    const variety=((tile.q*67+tile.r*31+state.round*19+state.turn*11+state.actionsLeft*7)%29)/29;
    let value=order.type==='develop' ? 0.5 : 2+Number(Boolean(tile.landmark))*3+frontier*0.1+(order.type==='contest'?1.5:0);
    if(difficulty==='easy' && order.type==='develop' && state.board[id].level===0)value+=2.8;
    if(difficulty==='hard' && order.type!=='develop'){
      value+=Number(Boolean(state.board[id].resource))*2;
      if(order.type==='contest')value+=2+state.board[id].level;
    }
    const rating=value+variety,index=tile.r*map.columns+tile.q;
    if (rating>best || (rating===best && index<bestIndex)) {
      best=rating;bestIndex=index;choice={type:order.type,tile:tile.id};
    }
  }
  return choice;
}
export function chooseBotAction(source,difficulty=source.difficulty || 'normal',seat=source.turn) {
  if(source.intel)return chooseBotActionFromView(source,difficulty);
  const current=migrateGame(source);
  if (!seatMayOrder(current,seat)) throw new Error('Wait for your turn.');
  return chooseBotActionFromView(projectForSeat(actingPerspective(current,seat),seat),difficulty);
}

// Score orders from the observations themselves. The presentation projection
// also contains authority-generated legal-site lists and precise forecasts,
// which can depend on a rival's unobserved queue, berth or military research.
export function chooseBotActionFromView(view,difficulty=view.difficulty || 'normal') {
  const seat=view.turn;
  if(view.phase!=='playing')throw new Error('The campaign has ended.');
  if(view.intel?.seat!==seat)throw new Error('The active seat needs its own observations.');
  if(!validDifficulty(difficulty))throw new Error('Choose a valid AI difficulty.');
  const {visible,explored,hasFoundedCapital,teamSurveyed}=view.intel;
  const observedBerths=Array.isArray(view.intel.visibleBerths) ? {visibleBerths:view.intel.visibleBerths.filter(id=>visible.includes(id))} : {};
  const state={...view,intel:{seat,visible,explored,hasFoundedCapital,teamSurveyed,...observedBerths}};
  const player = state.players[seat];
  if (!state.cities.some(c=>c.seat===seat)) {
    const pioneer=state.units.find(u=>u.type==='settler' && u.seat===seat && u.moves>0);
    if (pioneer && canSettle(state,seat,pioneer.tile)) return {type:'found',unit:pioneer.id};
  }
  if (state.victoryMode && allowsConquest(state)) {
    const capitals=state.cities.filter(city=>city.originalSeat!=null && !sameTeam(state,seat,city.seat));
    for (const unit of state.units) {
      if (unit.seat!==seat || !unit.moves || !UNIT_TYPES[unit.type].captures) continue;
      for (const city of capitals) {
        if (hexDistance(unit.tile,city.tile)<=UNIT_TYPES[unit.type].range && calculateCombatPreview(state,unit.id,city.tile)?.capture) {
          return {type:'attack',unit:unit.id,tile:city.tile};
        }
      }
    }
  }
  const technologyTree=councilTree(state,'research');
  if (!player.research && player.technologies.length < Object.keys(technologyTree).length) {
    const threatened = state.cities.some(city => city.seat === seat && state.units.some(
      unit => !sameTeam(state,seat,unit.seat) && UNIT_TYPES[unit.type].range > 0 && hexDistance(unit.tile, city.tile) <= 2));
    const modernRival=state.victoryMode!=='science' && (view.intel.diplomacy || []).some(row=>row.delegation?.era==='modern');
    const project=nextTechnology(state,seat,threatened || modernRival,technologyTree);
    if (project) return {type: 'research', item: project};
  }
  if (!player.civic && player.civics.length < Object.keys(councilTree(state,'civic')).length) {
    const project=councilAgenda(state,seat);
    if (project) return {type:'civic',item:project};
  }
  const available=state.units.filter(u=>u.seat===seat && u.moves>0);
  const plans=available.map(u=>[u,getUnitOptions(state,u.id)]);
  const assault=difficulty!=='easy' && state.waterways && allowsConquest(state) ? shoreAssault(state,plans) : {};
  if(assault.attack)return assault.attack;
  let combinedAttack=null,bestValue=-Infinity;
  for (const [unit,options] of plans) {
    if (options.canFound) return {type:'found',unit:unit.id};
    if(unit.type==='workboat' && Array.isArray(state.intel.visibleBerths)){
      const task=fishingTask(state,unit,getMap(state).byId);
      if(task && (task.type==='landCatch' || unit.charges<2 || !options.improvements.length))
        return {type:task.type,unit:unit.id};
    }
    if (options.improvements.length && (unit.type!=='workboat' || surveyedFishery(state,unit,unit.tile))) return {type:'improve',unit:unit.id,item:options.improvements[0]};
    if (options.attacks.length) {
      if(difficulty==='easy')return {type:'attack',unit:unit.id,tile:options.attacks[0]};
      for(const tile of options.attacks) {
        const result=calculateCombatPreview(state,unit.id,tile);
        let value=Number(result.capture)*500+Number(result.defeated)*80+result.damage-result.retaliation
          -Number(result.attackerDefeated)*40-result.defenderHpAfterHit*.1;
        if(difficulty==='hard') {
          // Clear a garrison with a ranged formation before committing infantry.
          if(result.attackerDefeated && !result.defeated && !result.capture)continue;
          if(result.defeated && state.cities.some(c=>c.tile===tile))value+=60;
          if(result.defenderType==='city' && !UNIT_TYPES[unit.type].captures && !result.damage)continue;
          if(UNIT_TYPES[unit.type].range>1 && result.damage>0)value+=10;
        }
        if(value>bestValue){bestValue=value;combinedAttack={type:'attack',unit:unit.id,tile};}
      }
      if(difficulty!=='hard' && combinedAttack)return combinedAttack;
    }
  }
  if(combinedAttack)return combinedAttack;
  if(assault.advance)return assault.advance;
  if (state.campaignVariety===1 && difficulty!=='easy') {
    const guard=available.find(unit=>!unit.fortified && unit.moves===unit.maxMoves &&
      fieldPosition(state,unit,UNIT_TYPES[unit.type],getMap(state).byId[unit.tile].terrain) &&
      state.cities.some(city=>city.seat===seat && city.tile===unit.tile) &&
      state.units.some(other=>!sameTeam(state,seat,other.seat) && UNIT_TYPES[other.type].strength && hexDistance(other.tile,unit.tile)<=2));
    if (guard) return {type:'fortify',unit:guard.id};
  }
  // A fully trained unit waits in its city when no legal deployment space
  // remains. Bank that work if this government can launch from the same city.
  if (state.researchPace>=1 && allowsScience(state) && player.technologies.includes('rocketry')) {
    const cities=state.cities.filter(city=>city.seat===seat);
    const stalled=cities.find(city=>city.queue && Object.hasOwn(UNIT_TYPES,city.queue.item) && city.queue.progress>=city.queue.required);
    if(stalled && !cities.some(city=>city.queue?.item===SCIENCE_PROJECT.id)) {
      return {type:'switchProduction',city:stalled.id,item:SCIENCE_PROJECT.id,expected:revisionOf(stalled)};
    }
  }
  const policy=proposePolicy(state,seat,getPopulationReport);
  if (policy) return policy;
  const shipment=planShipment(state,seat);
  if(shipment)return shipment;
  for (const city of state.cities) if (city.seat===seat && city.focusRound!==state.round) {
    const food=getPopulationReport(state,city.id);
    const focus=food.surplus<0 ? 'food' : food.housingLimited ? 'industry' :
      (city.population>=3 && player.research ? 'science' : 'balanced');
    if ((city.focus || 'balanced')!==focus) return {type:'focus',city:city.id,item:focus};
  }
  const veteran=plans.find(([,options])=>options.upgrade?.enabled && player.capital >= options.upgrade.cost + 8);
  if (veteran) return {type:'upgrade',unit:veteran[0].id,item:veteran[1].upgrade.to};
  for (const city of state.cities) if (city.seat===seat && !city.queue) {
    const order=botProject(state,city,difficulty);
    if (order) return order;
  }
  for (const [unit,options] of plans) {
    const move=botMovement(state,unit,options,difficulty);
    if (move) return move;
  }
  const envoy=proposeDelegation(view.intel.diplomacy || [],state.round,player.influence,difficulty);
  if (envoy) return envoy;
  return botDistrict(state,difficulty) || {type:'end'};
}
