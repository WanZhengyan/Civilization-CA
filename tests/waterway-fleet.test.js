import test from 'node:test';
import assert from 'node:assert/strict';
import {waterKind,waterDistances} from '../docs/water-navigation.js';
import {fisheryPort,harborSites} from '../docs/maritime.js';
const chart={sea:{terrain:'ocean'},mouth:{terrain:'ocean',waterway:'river'},bend:{terrain:'ocean',waterway:'river'},lake:{terrain:'ocean',waterway:'lake'},town:{terrain:'plains'},shore:{terrain:'coast'},pond:{terrain:'ocean',waterway:'lake'}};
const edges={sea:['mouth','shore'],mouth:['sea','bend','town'],bend:['mouth','lake'],lake:['bend','town'],town:['mouth','lake','pond'],shore:['sea'],pond:['town']};
const neighbors=id=>edges[id];
function fixture(){
  const board=Object.fromEntries(Object.keys(chart).map(id=>[id,{owner:null}]));
  board.town.owner=0;board.shore.owner=1;
  return {board,cities:[{id:'riverport',seat:0,tile:'town',buildings:['harbor'],portTile:'mouth'}]};
}
test('harbors may launch on a river or lake, and boats cannot cross an intervening bank',()=>{
  const s=fixture(),city=s.cities[0];
  assert.equal(waterKind(chart.sea),'sea');assert.equal(waterKind(chart.town),null);
  assert.equal(waterDistances('sea',chart,neighbors).get('lake'),3);
  assert.ok(!waterDistances('sea',chart,neighbors).has('pond'));
  assert.deepEqual([...waterDistances('sea',chart,neighbors,5,new Set(['sea','lake'])).keys()],['sea']);
  const planned={...city,buildings:[],portTile:null};
  assert.deepEqual(harborSites({...s,cities:[planned]},planned,chart,neighbors).sort(),['lake','mouth','pond']);
  assert.equal(fisheryPort(s,0,'pond',chart,neighbors),null);
});

test('inland crews work three charted water steps from port, versus two at sea',()=>{
 const s=fixture();s.cities[0].portTile='sea';
 assert.equal(fisheryPort(s,0,'lake',chart,neighbors)?.id,'riverport');
 assert.equal(fisheryPort(s,0,'lake',chart,neighbors,new Set(['sea','lake','bend'])),null);
 assert.equal(fisheryPort(s,0,'lake',{...chart,lake:{terrain:'ocean'}},neighbors),null);
 s.board.lake.owner=1;assert.equal(fisheryPort(s,0,'lake',chart,neighbors),null);
 s.board.lake.owner=null;s.board.lake.naturalWonder='protected';assert.equal(fisheryPort(s,0,'lake',chart,neighbors),null);
});

import {fishingTask,runFishingTask} from '../docs/maritime.js';
test('a crew carries exactly one catch to an owned dock and credits food and fish once',()=>{
 const s=fixture(),home=s.cities[0];home.food=4;s.players=[{surveyEnabled:true,stockpile:{fish:2}}];
 const u={type:'workboat',seat:0,tile:'lake',moves:3,charges:1};s.board.lake.resource='fish';
 const haul=fishingTask(s,u,chart);assert.equal(haul.type,'haulFish');
 runFishingTask(s,u,haul,chart);assert.equal(u.moves,0);assert.equal(u.charges,1);
 assert.throws(()=>runFishingTask(s,u,haul,chart));assert.equal(fishingTask(s,u,chart),null);
 u.tile=home.portTile;u.moves=3;runFishingTask(s,u,{type:'landCatch'},chart);
 assert.equal(u.moves,0);assert.equal(home.food,7);assert.equal(s.players[0].stockpile.fish,3);
 assert.throws(()=>runFishingTask(s,u,{type:'landCatch'},chart));
 u.fishCargo=true;home.seat=1;assert.equal(fishingTask(s,u,chart),null);
});

import {fleetBasin} from '../docs/naval-plan.js';
import {createGame} from '../docs/rules.js';
import {projectForSeat} from '../docs/vision.js';
test('harbor planning uses only charted water and includes only the locations of visible docks',()=>{
 const s=fixture();s.intel={explored:['mouth','bend','lake','town'],visible:['mouth','bend','lake'],visibleBerths:['mouth']};
 s.units=[{type:'cutter',seat:0,tile:'pond'}];
 const map={byId:chart,neighbors};
 const first=fleetBasin(s,s.cities[0],'mouth',map);
 assert.equal(first.count('cutter'),0);assert.deepEqual(first.available.sort(),['bend','lake']);
 const elsewhere={...chart,pond:{terrain:'plains'},sea:{terrain:'ocean',waterway:'lake'}};
 const hidden=fleetBasin({...s,units:[...s.units,{type:'frigate',seat:1,tile:'pond'}]},s.cities[0],'mouth',{byId:elsewhere,neighbors});
 assert.equal(hidden.score,first.score);assert.deepEqual([...hidden.tiles],[...first.tiles]);
 const actual=createGame([{name:'A'},{name:'B'}],'la',{seed:141});
 actual.waterways={};const a=actual.units[0].tile,b=actual.units[1].tile;
 actual.cities=[{id:'secret',name:'Secret port',tile:b,seat:1,buildings:['harbor'],portTile:a,queue:{portTile:b}}];
 const view=projectForSeat(actual,0);
 assert.deepEqual(view.intel.visibleBerths,[a]);assert.ok(!view.cities.some(c=>c.name==='Secret port'));
});

import {sailTo,flotillaMove} from '../docs/naval-plan.js';
test('crews return along charted bends and skip disconnected ponds and invisible enemy positions',()=>{
 const s=fixture();const u={id:'crew',seat:0,type:'workboat',tile:'lake',fishCargo:true};
 s.units=[u];s.intel={explored:Object.keys(chart),visible:Object.keys(chart),visibleBerths:['mouth']};
 const map={byId:chart,neighbors};
 assert.deepEqual(sailTo(s,u,['bend'],['mouth'],map),{type:'move',unit:'crew',tile:'bend'});
 assert.equal(sailTo(s,u,['bend'],['pond'],map),null);
 const order=flotillaMove(s,u,['bend'],map,{},()=>0,()=>false,()=>false);
 assert.deepEqual(order,{type:'move',unit:'crew',tile:'bend'});
 s.intel.explored=['lake','bend','mouth'];
 const different={...map,byId:{...chart,pond:{terrain:'plains'},sea:{terrain:'mountains'}}};
 assert.deepEqual(flotillaMove(s,u,['bend'],different,{},()=>0,()=>false,()=>false),order);
});

import {fishingGuide,inlandGuide} from '../docs/maritime-guide.js';
import {translate} from '../docs/i18n.js';
test('the English and Chinese field guide names both cargo orders and the inland fishery radius',()=>{
 for(const text of [...fishingGuide,...inlandGuide,'Load a catch','Land the catch','Marked berth','Catch aboard'])
   assert.notEqual(translate(text,'zh-CN'),text);
 assert.match(fishingGuide[1],/three on a charted river or lake/);
 assert.match(translate(fishingGuide[1],'zh-CN'),/3 粮食/);
});

test('refitting the locally assigned cutter still occupies a hull slot after it sails upriver',()=>{
 const s=fixture(),port=s.cities[0];s.intel={explored:['mouth','bend'],visible:['mouth','bend'],visibleBerths:['mouth']};
 s.units=[{type:'frigate',seat:0,tile:'lake',launchedFrom:port.id},{type:'cutter',seat:1,tile:'bend'}];
 let basin=fleetBasin(s,port,'mouth',{byId:chart,neighbors});
 assert.equal(basin.count('cutter'),0);assert.equal(basin.armed,1);
 port.queue={item:'destroyer'};basin=fleetBasin(s,port,'mouth',{byId:chart,neighbors});
 assert.equal(basin.armed,2);
});
