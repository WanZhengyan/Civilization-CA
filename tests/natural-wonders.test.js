import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,getMap,campaignView,applyAction,getActions,getUnitOptions,getSettlementAssessment,getWonderSites,getPortSite,getCityYield,getCitizenWorkforce,getStats,migrateGame} from '../docs/rules.js';
import {NATURAL_WONDERS,discoveredNaturalWonders,placeNaturalWonders} from '../docs/natural-wonders.js';
import {rememberVision} from '../docs/vision.js';
import {fisheryPort} from '../docs/maritime.js';
import {getAtlasPlace} from '../docs/atlas.js';
import {translate} from '../docs/i18n.js';

const sites=s=>Object.entries(s.board).filter(([,cell])=>cell.naturalWonder).map(([tile,cell])=>[tile,cell.naturalWonder]);

test('all nine protected landscapes vary locally with the seed and preserve viable, separated openings',()=>{
  const locations=new Map();
  for(const region of ['la','sf','sd'])for(let seed=0;seed<60;seed++){
    const s=createGame(undefined,region,{seed}),map=getMap(s);
    const occupied=new Set([...s.cities,...s.units,...s.barbarians.camps,...s.barbarians.parties].map(piece=>piece.tile));
    assert.deepEqual(sites(s),sites(createGame(undefined,region,{seed})));
    assert.equal(sites(s).length,3);
    for(const [tile,id] of sites(s)){
      const def=NATURAL_WONDERS[id];
      assert.equal(def.region,region);
      assert.equal(map.byId[tile].naturalWonder,undefined);
      assert.equal(s.board[tile].resource,undefined);
      assert.ok(!s.units.some(u=>u.tile===tile) && !s.barbarians.camps.some(c=>c.tile===tile));
      assert.ok(map.neighbors(tile).some(n=>!['ocean','mountains'].includes(map.byId[n].terrain) && !map.byId[n].landmark &&
        !occupied.has(n) && !s.board[n].naturalWonder && !s.board[n].resource && !s.board[n].fieldStation),id+' needs a construction parcel');
      assert.equal(getAtlasPlace(map.byId[tile],s.board[tile]).name,def.name);
      if(!locations.has(id))locations.set(id,new Set());
      locations.get(id).add(tile);
    }
    for(const u of s.units)assert.ok(map.neighbors(u.tile).some(n=>s.board[n].resource && map.byId[n].terrain!=='ocean'));
  }
  assert.equal(locations.size,9);
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

test('settlement survey previews only discovered natural-wonder districts and matches the city actually founded',()=>{
  const raw=createGame(undefined,'la',{seed:51}),view=campaignView(raw,0);
  const settler=view.units.find(unit=>unit.seat===0 && unit.type==='settler');
  const assessment=getSettlementAssessment(view,settler.id,settler.tile);
  assert.deepEqual(assessment.naturalWonderProspects,[{
    id:'topanga',name:'Topanga Canyon',
    effect:'Each adjacent worked district gains 1 production and 1 science.',
    bonus:[0,1,1],districts:2
  }]);
  const founded=applyAction(raw,0,{type:'found',unit:settler.id});
  const city=founded.cities.find(candidate=>candidate.seat===0);
  const eligible=getCitizenWorkforce(founded,city.id).eligibleTiles
    .filter(tile=>tile.naturalWonders?.includes('topanga'));
  assert.equal(eligible.length,assessment.naturalWonderProspects[0].districts);

  for(const region of ['la','sf','sd'])for(let seed=0;seed<80;seed++) {
    const game=createGame(['A','B','C','D'],region,{seed});
    for(let seat=0;seat<game.players.length;seat++) {
      const privateView=campaignView(game,seat),unit=privateView.units.find(candidate=>candidate.seat===seat && candidate.type==='settler');
      const known=new Set(discoveredNaturalWonders(privateView).map(wonder=>wonder.id));
      const preview=getSettlementAssessment(privateView,unit.id,unit.tile);
      for(const prospect of preview.naturalWonderProspects) assert.ok(known.has(prospect.id));
      for(const hidden of Object.entries(game.board).filter(([tile,cell])=>cell.naturalWonder && !privateView.intel.explored.includes(tile))) {
        assert.ok(!preview.naturalWonderProspects.some(prospect=>prospect.id===hidden[1].naturalWonder));
      }
    }
  }
  assert.equal(translate('2 nearby districts','zh-CN'),'2 块相邻可工作地块');
});

test('older saves keep their geography and both languages explain every discoverable site and effect',()=>{
  const s=createGame(['A','B'],'sf',{seed:70});
  const older=structuredClone(s);
  older.naturalWonderVersion=1;
  delete older.board[sites(older).find(([,id])=>id==='muirWoods')[0]].naturalWonder;
  const previousSites=sites(older);
  assert.equal(previousSites.length,2);
  const retained=migrateGame(JSON.parse(JSON.stringify(older)));
  assert.deepEqual(sites(retained),previousSites);
  assert.equal(campaignView(retained,0).naturalWonderVersion,1);
  for(const [tile] of sites(s))delete s.board[tile].naturalWonder;
  delete s.naturalWonderVersion;
  const restored=migrateGame(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(sites(restored),[]);
  assert.equal(campaignView(restored,0).naturalWonderVersion,undefined);
  assert.equal(campaignView(createGame(['A','B'],'sd',{seed:9}),0).naturalWonderVersion,2);
  for(const w of Object.values(NATURAL_WONDERS)){
    for(const text of [w.name,w.effect,w.description,'Discovered '+w.name+'.']){
      assert.notEqual(translate(text,'zh-CN'),text);
    }
  }
});

test('new scenic landmarks stay on local ground across the four chart scales',()=>{
  const regions={
    la:{id:'ballonaWetlands',anchors:['5,9','6,9','6,10','7,10'],terrain:['coast','plains']},
    sf:{id:'muirWoods',anchors:['4,2','3,1','3,0','4,0'],terrain:['forest','hills']},
    sd:{id:'missionGorge',anchors:['12,2','11,1','12,3','13,3','11,5'],terrain:['hills','forest']}
  };
  for(const [region,feature] of Object.entries(regions))for(const size of ['standard','large','grand','epic']){
    for(const seed of [3,64,72,182]){
      const state=createGame(['A','B','C','D'],region,{mapSize:size,seed}),map=getMap(state);
      const localAnchors=map.anchorId?feature.anchors.map(map.anchorId):feature.anchors;
      const locality=new Set(localAnchors.flatMap(id=>[id,...map.neighbors(id)]));
      const site=sites(state).find(([,id])=>id===feature.id)?.[0];
      assert.ok(site && locality.has(site),region+' '+size);
      assert.ok(feature.terrain.includes(map.byId[site].terrain));
      assert.ok(!map.byId[site].landmark && !state.units.some(unit=>unit.tile===site));
      assert.equal(sites(state).length,3);
      assert.ok(!Object.hasOwn(state.board,'undefined'));
    }
  }
});

test('site placement can skip completely unavailable localities without inventing a board entry',()=>{
  const state={board:{},units:[],seed:18};
  const map={id:'sf',byId:{},neighbors:()=>[]};
  placeNaturalWonders(state,map);
  assert.deepEqual(state.board,{});
});

test('a blocked survey center falls back to a local hex and repeated placement preserves the board',()=>{
  const map={id:'la',byId:{'5,9':{terrain:'coast'},'5,10':{terrain:'plains'},'5,11':{terrain:'coast'}},
    neighbors:tile=>({'5,9':['5,10'],'5,10':['5,9','5,11'],'5,11':['5,10']}[tile] || [])};
  const state={board:{'5,9':{},'5,10':{},'5,11':{}},units:[{tile:'5,9'}],seed:18};
  assert.deepEqual([...placeNaturalWonders(state,map)],['5,10','5,11']);
  assert.deepEqual(sites(state),[['5,10','ballonaWetlands']]);
  state.units=[];
  placeNaturalWonders(state,map);
  assert.deepEqual(sites(state),[['5,10','ballonaWetlands']]);
});
