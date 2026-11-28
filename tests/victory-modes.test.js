import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAction,campaignView,chooseBotAction,createGame,getMap,getStats,migrateGame} from '../docs/rules.js';
import {validVictoryMode} from '../docs/victory-rules.js';
const duo=[{name:'Coast'},{name:'Sierra'}];
test('new campaign modes advance beyond 30, high civic scores are informational',()=>{
  for(const mode of ['standard','conquest','science']){
    let s=createGame(duo,'la',{seed:39,victoryMode:mode});
    s.round=30;
    for(const b of Object.values(s.board).slice(0,90))Object.assign(b,{owner:0,level:2});
    assert(getStats(s,0).score>125);
    s=applyAction(applyAction(s,0,{type:'end'}),1,{type:'end'});
    assert.equal(s.phase,'playing');assert.equal(s.round,31);
    assert.equal(campaignView(s,1).victoryMode,mode);
  }
  assert(!validVictoryMode('civic'));assert.throws(()=>createGame(duo,'la',{victoryMode:'civic'}));
  assert.throws(()=>createGame(['You'],'la',{practice:true,victoryMode:'conquest'}));
});
test('old saved rules remain separate from new default standard',()=>{
  const current=createGame(duo,'sd',{seed:7});
  assert.equal(current.victoryMode,'standard');
  const old=createGame(duo,'sd',{seed:7,legacyVictory:true});
  assert.equal(old.victoryMode,undefined);assert.deepEqual(migrateGame(JSON.parse(JSON.stringify(old))),old);
  old.round=30;
  assert.equal(applyAction(applyAction(old,0,{type:'end'}),1,{type:'end'}).victoryReason,'civic');
});
import {getProductionOptions,getResearchOptions} from '../docs/rules.js';
import {SCIENCE_PROJECT,scienceProgress} from '../docs/victory-rules.js';

test('Rocketry unlocks a sixty-production orbital project with no purchase or parcel',()=>{
  let s=createGame(duo,'la',{seed:39,victoryMode:'science'});
  s=applyAction(s,0,{type:'found',unit:s.units[0].id});const city=s.cities[0].id;
  const option=state=>getProductionOptions(state,city,{replace:true}).find(o=>o.item===SCIENCE_PROJECT.id);
  assert.equal(option(s),undefined);
  assert.equal(getResearchOptions(s,0).find(t=>t.item==='rocketry').locked,true);
  s.players[0].technologies.push('industry','tactics','steam','ballistics','radio','motorization');
  s.players[0].science=30;s.players[0].capital=10000;
  s=applyAction(s,0,{type:'research',item:'rocketry'});
  assert.equal(option(s).kind,'project');assert.equal(option(s).required,60);assert.equal(option(s).buyEnabled,false);
  assert.throws(()=>applyAction(s,0,{type:'buyProduction',city,item:'orbitalSurvey',expected:0,gold:120}));
  assert.throws(()=>applyAction(s,0,{type:'produce',city,item:'orbitalSurvey',site:s.cities[0].tile}));
  s=applyAction(s,0,{type:'produce',city,item:'orbitalSurvey'});
  const viewed=campaignView(s,0);assert.equal(scienceProgress(viewed,0).cityName,s.cities[0].name);
  assert.equal(scienceProgress(campaignView(s,1),0),null);
  for(let n=0;n<30 && s.phase==='playing';n++)s=applyAction(s,s.turn,{type:'end'});
  assert.equal(s.victoryReason,'science');assert.deepEqual(s.winners,[0]);assert.equal(scienceProgress(s,0).production,SCIENCE_PROJECT.required);
  assert(!s.cities[0].buildings.includes('orbitalSurvey'));
  assert.match(s.log.at(-1).text,/won a science victory\.$/);
});

test('an allied launch wins for all members, and conquest and historic games never offer the orbital project',()=>{
  let s=createGame([{name:'A'},{name:'B'},{name:'C'}],'sf',{seed:7,victoryMode:'standard',teams:[0,1,0],simultaneousTeams:true});
  s=applyAction(s,2,{type:'found',unit:s.units.find(u=>u.seat===2).id});
  s.players[2].technologies.push('rocketry');const city=s.cities[0].id;
  s=applyAction(s,2,{type:'produce',city,item:'orbitalSurvey'});s.cities[0].queue.progress=SCIENCE_PROJECT.required-1;
  s=applyAction(s,2,{type:'end'});assert.equal(s.victoryReason,'science');assert.deepEqual(s.winners,[0,2]);
  assert.equal(s.log.at(-1).text,'Team A won a science victory.');
  for(const settings of [{victoryMode:'conquest'},{legacyVictory:true}]){
    let old=createGame(duo,'sf',{seed:7,...settings});old=applyAction(old,0,{type:'found',unit:old.units[0].id});
    old.players[0].technologies.push('rocketry');
    assert(!getProductionOptions(old,old.cities[0].id).some(x=>x.item==='orbitalSurvey'));
    assert(!getResearchOptions(old,0).some(x=>x.item==='rocketry'));
  }
});


function addMilitia(state,seat,target) {
  const map=getMap(state);
  const tile=map.neighbors(target).find(id=>!['ocean','mountains'].includes(map.byId[id].terrain)
    && !state.units.some(unit=>unit.tile===id) && !state.cities.some(city=>city.tile===id));
  assert.ok(tile);
  const id='militia-'+state.units.length;
  state.units.push({id,type:'melee',seat,tile,hp:100,maxHp:100,moves:2,maxMoves:2});
  return id;
}
test('a science-only survivor keeps taking turns after a conquest-worthy capital capture',()=>{
  for (const mode of ['science','conquest']) {
    let s=createGame(duo,'la',{seed:39,victoryMode:mode});
    for (let seat=0;seat<2;seat++) {
      s=applyAction(s,seat,{type:'found',unit:s.units.find(u=>u.seat===seat).id});
      s=applyAction(s,seat,{type:'end'});
    }
    const target=s.cities.find(city=>city.seat===1);
    target.hp=1;
    const strike={type:'attack',unit:addMilitia(s,0,target.tile),tile:target.tile};
    if(mode==='conquest')assert.deepEqual(chooseBotAction(s),strike);
    s=applyAction(s,0,strike);
    assert(s.players[1].eliminated);
    if(mode==='conquest')assert.equal(s.victoryReason,'domination');
    else {
      for(let i=0;i<3;i++) {
        const previous=s.round;
        s=applyAction(s,0,{type:'end'});
        assert.equal(s.phase,'playing');assert.equal(s.turn,0);assert.equal(s.round,previous+1);
      }
    }
  }
});
test('only a live never-founder can withhold a capital from a domination victory',()=>{
  let s=createGame(['A','B','C'],'la',{seed:47,victoryMode:'conquest'});
  for(let seat=0;seat<3;seat++){
    if(seat!==2)s=applyAction(s,seat,{type:'found',unit:s.units.find(u=>u.seat===seat).id});
    s=applyAction(s,seat,{type:'end'});
  }
  // B retains a secondary city even after losing its original capital.
  const founder=s.units.find(u=>u.seat===2);
  const second=getMap(s).tiles.find(t=>t.terrain==='urban' && s.board[t.id].owner===null && t.id!==founder.tile);
  s.cities.push({...s.cities[1],id:'second',tile:second.id,originalSeat:null});
  const target=s.cities.find(c=>c.originalSeat===1);target.hp=1;
  s=applyAction(s,0,{type:'attack',unit:addMilitia(s,0,target.tile),tile:target.tile});
  assert.equal(s.phase,'playing');assert(!s.players[1].eliminated);
  // B eliminates C's never-founded settler. A already holds all actual capitals.
  s=applyAction(s,0,{type:'end'});
  s.units.find(u=>u.id===founder.id).hp=1;
  s=applyAction(s,1,{type:'attack',unit:addMilitia(s,1,founder.tile),tile:founder.tile});
  assert.equal(s.victoryReason,'domination');assert.deepEqual(s.winners,[0]);
});
test('an autonomous science campaign researches, produces and launches from the untouched settler opening',()=>{
  let state=createGame(duo,'sd',{seed:417005,victoryMode:'science'});
  const milestones=new Set();
  for(let order=0;order<1500 && state.phase==='playing';order++){
    const action=chooseBotAction(state);
    milestones.add(action.type+'/'+action.item);
    state=applyAction(state,state.turn,action);
  }
  assert(milestones.has('research/rocketry'));assert(milestones.has('produce/orbitalSurvey'));
  assert.equal(state.victoryReason,'science');
});


test('switching a city away from its launch preserves private, resumable mission progress',()=>{
  let s=createGame(duo,'sd',{seed:53,victoryMode:'science'});
  s=applyAction(s,0,{type:'found',unit:s.units[0].id});
  const city=s.cities[0].id, name=s.cities[0].name;
  s.players[0].technologies.push('rocketry');
  s=applyAction(s,0,{type:'produce',city,item:'orbitalSurvey'});
  s=applyAction(applyAction(s,0,{type:'end'}),1,{type:'end'});
  const earned=s.cities[0].queue.progress;
  assert(earned>0);
  const switchTo=item=>s=applyAction(s,0,{type:'switchProduction',city,item,expected:s.cities[0].productionRevision});
  switchTo('scout');
  const restored=JSON.parse(JSON.stringify(s));
  const parked=scienceProgress(campaignView(restored,0),0);
  assert.equal(parked.cityName,name);assert.equal(parked.production,earned);assert.equal(parked.paused,true);
  assert.equal(scienceProgress(campaignView(restored,1),0),null);
  const projected=campaignView(restored,0);
  projected.cities.push({...projected.cities[0],id:'other',name:'Second city',queue:{item:'orbitalSurvey',progress:earned}});
  assert.equal(scienceProgress(projected,0).cityName,'Second city');
  projected.cities[1].queue.progress=earned-1;
  assert.equal(scienceProgress(projected,0).cityName,name);
  switchTo('orbitalSurvey');
  const resumed=scienceProgress(campaignView(s,0),0);
  assert.equal(resumed.production,earned);assert.equal(resumed.paused,false);
});
