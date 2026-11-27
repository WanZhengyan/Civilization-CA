import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,getMap,campaignView,applyAction,getActions,getUnitOptions,getSettlementAssessment,getWonderSites,getPortSite,getCityYield,getCitizenWorkforce,getStats,migrateGame} from '../docs/rules.js';
import {NATURAL_WONDERS,discoveredNaturalWonders} from '../docs/natural-wonders.js';
import {rememberVision} from '../docs/vision.js';
import {fisheryPort} from '../docs/maritime.js';
import {getAtlasPlace} from '../docs/atlas.js';
import {translate} from '../docs/i18n.js';

const sites=s=>Object.entries(s.board).filter(([,cell])=>cell.naturalWonder).map(([tile,cell])=>[tile,cell.naturalWonder]);

test('all six protected landscapes vary locally with the seed and preserve viable, separated openings',()=>{
  const locations=new Map();
  for(const region of ['la','sf','sd'])for(let seed=0;seed<60;seed++){
    const s=createGame(undefined,region,{seed}),map=getMap(s);
    assert.deepEqual(sites(s),sites(createGame(undefined,region,{seed})));
    assert.equal(sites(s).length,2);
    for(const [tile,id] of sites(s)){
      const def=NATURAL_WONDERS[id];
      assert.equal(def.region,region);
      assert.equal(map.byId[tile].naturalWonder,undefined);
      assert.equal(s.board[tile].resource,undefined);
      assert.ok(!s.units.some(u=>u.tile===tile) && !s.barbarians.camps.some(c=>c.tile===tile));
      assert.ok(map.neighbors(tile).some(n=>!['ocean','mountains'].includes(map.byId[n].terrain)));
      assert.equal(getAtlasPlace(map.byId[tile],s.board[tile]).name,def.name);
      if(!locations.has(id))locations.set(id,new Set());
      locations.get(id).add(tile);
    }
    for(const u of s.units)assert.ok(map.neighbors(u.tile).some(n=>s.board[n].resource && map.byId[n].terrain!=='ocean'));
  }
  assert.equal(locations.size,6);
  for(const locationsOfSite of locations.values())assert.ok(locationsOfSite.size>=2);
});

test('discovery uses sight without a resource survey, stays in the journal and is private to each seat',()=>{
  const state=createGame(['West','East'],'la',{seed:16}),map=getMap(state),[site,id]=sites(state)[0];
  const far=map.tiles.find(t=>t.q<3 && t.r!==3 && !['ocean','mountains'].includes(t.terrain)).id;
  state.units.forEach(u=>u.tile=far);state.cities=[];state.exploration=undefined;state.log=[];
  const initial=rememberVision(state);
  assert.equal(campaignView(initial,0).board[site].naturalWonder,undefined);
  const closer=structuredClone(initial);closer.units[0].tile=site;
  const discovered=rememberVision(closer,initial);
  const own=campaignView(discovered,0),other=campaignView(discovered,1);
  assert.equal(own.board[site].naturalWonder,id);
  assert.equal(other.board[site].naturalWonder,undefined);
  assert.ok(own.log.some(e=>e.wonder===id));
  assert.ok(!other.log.some(e=>e.wonder===id));
  const departed=structuredClone(discovered);departed.units[0].tile=far;
  const after=rememberVision(departed,discovered),memory=campaignView(after,0);
  assert.ok(!memory.intel.visible.includes(site));
  assert.ok(discoveredNaturalWonders(memory).some(w=>w.id===id && w.tile===site));
  assert.equal(memory.log.filter(e=>e.wonder===id).length,1);
  assert.equal(discoveredNaturalWonders(own).find(w=>w.id===id).name,NATURAL_WONDERS[id].name);
  assert.equal(discoveredNaturalWonders(other).some(w=>w.id===id),false);
  assert.deepEqual(discoveredNaturalWonders(state),[]);
});

test('protected sites reject settlements, improvements, harbors, fisheries and university placement',()=>{
  const s=createGame(['A','B'],'la',{seed:56}),[site]=sites(s).find(([,id])=>id==='laBrea');
  const unit=s.units[0];unit.tile=site;
  assert.equal(getUnitOptions(s,unit.id).canFound,false);
  assert.match(getSettlementAssessment(s,unit.id,site).reason,/protected/);
  assert.throws(()=>applyAction(s,0,{type:'found',unit:unit.id}));
  assert.deepEqual(getActions(s,0,site),[]);
  unit.type='builder';unit.charges=3;s.board[site].owner=0;
  assert.deepEqual(getUnitOptions(s,unit.id).improvements,[]);
  const city={id:'c',seat:0,name:'Test',tile:getMap(s).neighbors(site)[0],population:1,buildings:[]};
  s.cities=[city];assert.ok(!getWonderSites(s,city.id,'ucla').some(t=>t.id===site));
  const sd=createGame(['A','B'],'sd',{seed:56}),map=getMap(sd);
  const [pools]=sites(sd).find(([,id])=>id==='cabrilloTidePools');
  const shore=map.neighbors(pools).find(n=>!['ocean','mountains'].includes(map.byId[n].terrain));
  sd.cities=[{...city,tile:shore}];sd.board[shore].owner=0;
  assert.notEqual(getPortSite(sd,'c'),pools);
  assert.equal(fisheryPort(sd,0,pools,map.byId,map.neighbors),null);
});

test('only worked neighboring districts earn the bonus and room and authority yields agree',()=>{
  const s=createGame(['A','B'],'la',{seed:44}),map=getMap(s),[site]=sites(s).find(([,id])=>id==='laBrea');
  const job=map.neighbors(site).find(n=>map.byId[n].terrain==='urban');
  const center=map.neighbors(job).find(n=>n!==site && map.byId[n].terrain==='urban');
  s.cities=[{id:'capital',name:'Test',seat:0,tile:center,population:1,buildings:[],food:0}];
  s.board[center].owner=0;s.board[job].owner=0;
  s.units=[{...s.units[0],tile:site}];
  const active=rememberVision(s),baseline=structuredClone(active);
  delete baseline.board[site].naturalWonder;
  assert.equal(getCitizenWorkforce(active,'capital','science').workedTiles[0].id,job);
  assert.equal(getStats(active,0).scienceIncome,getStats(baseline,0).scienceIncome+2);
  assert.deepEqual(getCityYield(active,'capital'),getCityYield(campaignView(active,0),'capital'));
  assert.equal(getStats(campaignView(active,0),0).scienceIncome,getStats(active,0).scienceIncome);
  active.board[job].owner=null;
  assert.ok(!getCitizenWorkforce(active,'capital','science').workedTiles.some(t=>t.naturalWonders));
});

test('older saves keep their geography and both languages explain every discoverable site and effect',()=>{
  const s=createGame(['A','B'],'sf',{seed:70});
  for(const [tile] of sites(s))delete s.board[tile].naturalWonder;
  delete s.naturalWonderVersion;
  const restored=migrateGame(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(sites(restored),[]);
  assert.equal(campaignView(restored,0).naturalWonderVersion,undefined);
  assert.equal(campaignView(createGame(['A','B'],'sd',{seed:9}),0).naturalWonderVersion,1);
  for(const w of Object.values(NATURAL_WONDERS)){
    for(const text of [w.name,w.effect,w.description,'Discovered '+w.name+'.']){
      assert.notEqual(translate(text,'zh-CN'),text);
    }
  }
});
