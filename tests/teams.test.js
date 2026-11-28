import assert from 'node:assert/strict';
import test from 'node:test';
import {applyAction,campaignView,combatPreview,createGame,getActions,getMap,getScoreTarget,getStats,getTeamId,getUnitOptions,migrateGame,sameTeam} from '../docs/rules.js';

const fresh=teams=>createGame(teams.map((_,seat)=>'Player '+seat),'la',{seed:417005,mapSize:'large',teams});
const end=state=>applyAction(state,state.turn,{type:'end'});
const found=state=>applyAction(state,state.turn,{type:'found',unit:state.units.find(u=>u.type==='settler' && u.seat===state.turn).id});

function capitals(teams) {
  let state=fresh(teams);
  for (let seat=0;seat<teams.length;seat++) state=end(found(state));
  state.barbarians={camps:[],parties:[]};
  return state;
}

function militiaNear(state,seat,tile,id) {
  const map=getMap(state);
  const from=map.neighbors(tile).find(n=>!['mountains','ocean'].includes(map.byId[n].terrain) &&
    !state.units.some(u=>u.tile===n) && !state.cities.some(c=>c.tile===n));
  assert.ok(from);
  state.units.push({id,seat,tile:from,type:'melee',hp:100,maxHp:100,moves:2,maxMoves:2});
  return id;
}

test('team assignments are validated, public, and share visible land while keeping orders, projects and the treasury private',()=>{
  const options={seed:417005,teams:[2,2,0],difficulty:'hard'};
  let state=createGame(['Host','Ally','Rival'],'sf',options);
  options.teams[0]=0;
  assert.deepEqual(state.teams,[2,2,0]);
  assert.equal(getTeamId(state,1),2);
  assert.ok(sameTeam(state,0,1));
  assert.ok(!sameTeam(state,0,2) && !sameTeam(state,0,null));
  state=end(state);state=found(state);
  const ally=state.cities[0];
  state.players[1].capital=987;state.players[1].research='navigation';
  const view=campaignView(state,0);
  assert.deepEqual(view.teams,[2,2,0]);assert.equal(view.difficulty,'hard');
  assert.equal(view.players[1].capital,undefined);assert.equal(view.players[1].research,undefined);
  assert.equal(view.players[1].score,undefined);
  assert.ok(view.intel.visible.includes(ally.tile));
  assert.ok(view.cities.some(c=>c.id===ally.id));
  assert.equal(view.board[ally.tile].owner,1);
  assert.equal(view.cities.find(c=>c.id===ally.id).queue,undefined);
  view.teams[0]=3;
  assert.equal(getTeamId(state,0),2);
  assert.deepEqual(migrateGame(JSON.parse(JSON.stringify(state))).teams,[2,2,0]);
  const standard=createGame(['A','B'],'sf',{seed:1});
  assert.deepEqual(standard,createGame(['A','B'],'sf',{seed:1,difficulty:'normal'}));
  assert.ok(!Object.hasOwn(standard,'teams'));
  assert.equal(getTeamId(standard,1),1);
  for(const teams of [[0,0],[0],[0,4],[-1,2],['0',1],new Array(2)]) {
    assert.throws(()=>createGame(['A','B'],'la',{teams}),/team/i);
  }
  assert.throws(()=>createGame(['A','B'],'la',{difficulty:'unknown'}),/difficulty/i);
});

test('allies cannot fight, contest, order or occupy each other’s assets, and can garrison an empty allied city',()=>{
  let state=capitals([0,0,1]);
  const city=state.cities.find(c=>c.seat===1),guard=militiaNear(state,0,city.tile,'guard');
  assert.ok(getUnitOptions(state,guard).moves.includes(city.tile));
  assert.ok(!getUnitOptions(state,guard).attacks.includes(city.tile));
  assert.equal(combatPreview(state,guard,city.tile),null);
  assert.throws(()=>applyAction(state,0,{type:'attack',unit:guard,tile:city.tile}));
  const district=getMap(state).neighbors(city.tile).find(tile=>state.board[tile].owner===1 && !state.cities.some(c=>c.tile===tile));
  const beside=getMap(state).neighbors(district).find(tile=>tile!==city.tile && !state.cities.some(c=>c.tile===tile));
  state.board[beside].owner=0;
  assert.deepEqual(getActions(state,0,district),[]);
  assert.throws(()=>applyAction(state,0,{type:'contest',tile:district}));
  assert.throws(()=>applyAction(state,0,{type:'develop',tile:district}));
  state=applyAction(state,0,{type:'move',unit:guard,tile:city.tile});
  assert.equal(state.cities.find(c=>c.id===city.id).seat,1);
  state=end(state);
  const friendly=militiaNear(state,1,city.tile,'friend');
  assert.ok(!getUnitOptions(state,friendly).moves.includes(city.tile));
  assert.ok(!getUnitOptions(campaignView(state,1),friendly).attacks.includes(city.tile));
  assert.throws(()=>applyAction(state,1,{type:'attack',unit:friendly,tile:city.tile}));
  state=end(state);
  const enemy=militiaNear(state,2,city.tile,'enemy');
  const hit=combatPreview(state,enemy,city.tile);
  assert.equal(hit.defenderId,city.id);assert.equal(hit.capture,false);
  assert.deepEqual(hit.cityGarrison.map(g=>[g.id,g.seat]),[[guard,0]]);
  const attacked=applyAction(state,2,{type:'attack',unit:enemy,tile:city.tile});
  assert.equal(attacked.cities.find(c=>c.id===city.id).hp,hit.defenderHpAfter);
  assert.equal(attacked.units.find(u=>u.id===guard).hp,state.units.find(u=>u.id===guard).hp-Math.round(hit.damage/4));
  const guardNotice=campaignView(attacked,0).intel.battles.at(-1);
  assert.deepEqual(guardNotice.garrisonHits.map(g=>[g.seat,g.hpAfter]),[[0,attacked.units.find(u=>u.id===guard).hp]]);
  assert.equal(attacked.cities.find(c=>c.id===city.id).seat,1);
  assert.equal(attacked.phase,'playing');
  const doomed=structuredClone(state);doomed.cities.find(c=>c.id===city.id).hp=1;
  const captured=applyAction(doomed,2,{type:'attack',unit:enemy,tile:city.tile});
  assert.deepEqual(captured.units.filter(u=>u.tile===city.tile).map(u=>u.id),[enemy]);
  assert.deepEqual(campaignView(captured,0).intel.battles.at(-1).garrisonLost,[{seat:0,type:'melee'}]);
});

function awardScore(state,seat,points) {
  const cells=getMap(state).tiles.filter(t=>state.board[t.id].owner===null && !t.landmark && !['ocean','mountains'].includes(t.terrain));
  for(const t of cells.slice(0,Math.floor(points/2))) state.board[t.id].owner=seat;
  if (points%2) state.board[cells[0].id].level=1;
  assert.equal(getStats(state,seat).score,points);
}

test('civic victory compares team totals only at round end, and resolves ties between teams',()=>{
  for(const rivalTotal of [248,252]) {
    let state=fresh([0,1,0,1]);
    delete state.victoryMode; // Historical score-based team save.
    for(const [seat,points] of [126,120,126,rivalTotal-120].entries()) awardScore(state,seat,points);
    for(let seat=0;seat<3;seat++) {state=end(state);assert.equal(state.phase,'playing');}
    state=end(state);
    assert.equal(state.victoryReason,'civic');
    assert.deepEqual(state.winners,rivalTotal===252 ? [0,1,2,3] : [0,2]);
    assert.ok(state.log.at(-1).text.endsWith('252 civic points.'));
    assert.ok(state.log.at(-1).text.includes(rivalTotal===252 ? 'Team A and Team B shared victory' : 'Team A won'));
  }
});

test('eliminating a team leaves other opponents in play and all members of the last alliance share victory',()=>{
  let state=fresh([0,0,1,2]);
  state.barbarians={camps:[],parties:[]};
  state.players[1].eliminated=true;state.units=state.units.filter(u=>u.seat!==1);
  for(const target of [2,3]) {
    const founder=state.units.find(u=>u.seat===target && u.type==='settler');
    founder.hp=1;
    const striker=militiaNear(state,0,founder.tile,'striker'+target);
    state=applyAction(state,0,{type:'attack',unit:striker,tile:founder.tile});
    if (target===2) assert.equal(state.phase,'playing');
  }
  assert.equal(state.victoryReason,'survival');
  assert.deepEqual(state.winners,[0,1]);
  assert.equal(state.log.at(-1).text,'Team A is the last team standing.');
});

test('original capitals held by separate allies count together, while an unfounded rival keeps domination open',()=>{
  for (const unestablished of [false,true]) {
    let state=capitals([0,0,1,1]);
    const target=state.cities.find(c=>c.originalSeat===2),fourth=state.cities.find(c=>c.originalSeat===3);
    if (unestablished) {
      state.cities=state.cities.filter(c=>c.id!==fourth.id);
      state.units.push({id:'late',seat:3,type:'settler',tile:fourth.tile,hp:60,maxHp:60,moves:2,maxMoves:2});
    } else {fourth.seat=1;state.board[fourth.tile].owner=1;}
    target.hp=1;
    const striker=militiaNear(state,0,target.tile,'guard');
    state=applyAction(state,0,{type:'attack',unit:striker,tile:target.tile});
    if (unestablished) assert.equal(state.phase,'playing');
    else {
      assert.equal(state.victoryReason,'domination');
      assert.deepEqual(state.winners,[0,1]);
      assert.equal(state.log.at(-1).text,'Team A controls every original capital.');
    }
  }
});

test('founding the last missing allied capital completes an otherwise satisfied domination goal',()=>{
  let state=capitals([0,0,1]);
  const late=state.cities.find(c=>c.originalSeat===1),captured=state.cities.find(c=>c.originalSeat===2);
  state.cities=state.cities.filter(c=>c.id!==late.id);
  captured.seat=0;state.board[captured.tile].owner=0;
  const reserve={id:'reserve',seat:1,tile:late.tile,type:'settler',moves:2,maxMoves:2,hp:60,maxHp:60};
  state.units.push(reserve);
  const far=getMap(state).tiles.find(t=>t.terrain==='urban' && state.board[t.id].owner===null && !state.cities.some(c=>c.tile===t.id));
  state.units.push({...reserve,id:'opponent',seat:2,tile:far.id});
  state=end(state);
  assert.equal(state.phase,'playing');
  const finished=applyAction(state,1,{type:'found',unit:'reserve'});
  assert.equal(finished.victoryReason,'domination');
  assert.deepEqual(finished.winners,[0,1]);
});

test('the configured opening draw gives each team a chance before choosing its member and leaves the map and armies untouched',()=>{
  const players=['A','B','C','D'],teams=[0,0,0,1];
  const leads=[0,0,0,0];
  for(let seed=0;seed<128;seed++) {
    const state=createGame(players,'la',{seed,teams,drawInitiative:true});
    leads[state.firstSeat]++;
    assert.equal(state.turn,state.firstSeat);
  }
  assert.ok(leads.every(count=>count>0));
  assert.ok(leads[3]>=48 && leads[3]<=80,'a single-seat team should draw about half the openings');
  for(const region of ['la','sf','sd']) {
    const opts={seed:1,teams,mapSize:'large'}, baseline=createGame(players,region,opts);
    const drawn=createGame(players,region,{...opts,drawInitiative:true});
    assert.equal(baseline.turn,0);assert.ok(!Object.hasOwn(baseline,'firstSeat'));
    assert.equal(drawn.firstSeat,2);
    assert.equal(campaignView(drawn,1).firstSeat,2);
    const {firstSeat,...rest}=drawn;
    assert.deepEqual({...rest,turn:0,log:rest.log.map(entry=>entry.type==='start' ? {...entry,seat:0} : entry)},baseline);
  }
});

test('rounds wrap around the drawn opener once, even when that player is eliminated mid-round',()=>{
  const options={teams:[0,0,0,1],seed:1,drawInitiative:true};
  let active=createGame(['A','B','C','D'],'la',options);
  for(let round=1;round<=3;round++) for(const seat of [2,3,0,1]) {
    assert.equal(active.turn,seat);assert.equal(active.round,round);active=end(active);
  }
  let state=createGame(['A','B','C','D'],'la',options);
  state=end(state);
  const founder=state.units.find(u=>u.seat===2);
  founder.hp=1;state.barbarians={camps:[],parties:[]};
  const striker=militiaNear(state,3,founder.tile,'militia');
  state=applyAction(state,3,{type:'attack',unit:striker,tile:founder.tile});
  assert.equal(state.players[2].eliminated,true);
  for(let round=1;round<=3;round++) for(const seat of [3,0,1]) {
    assert.equal(state.turn,seat);assert.equal(state.round,round);state=end(state);
  }
});

test('an allied garrison repels a neutral raid against its teammate without sharing a treasury',()=>{
  const state=capitals([0,0,1]),town=state.cities.find(c=>c.seat===0);
  state.round=7;state.turn=2;
  const map=getMap(state),byTown=map.neighbors(town.tile).find(n=>!['ocean','mountains'].includes(map.byId[n].terrain));
  const party={id:'raid',campId:'old-camp',target:town.id,type:'raider',tile:byTown,hp:44,maxHp:44};
  state.barbarians={camps:[],parties:[party],settledSince:{[town.id]:1}};
  const unguarded=end(state);
  state.units.push({id:'ally',seat:1,tile:town.tile,type:'melee',moves:2,maxMoves:2,hp:100,maxHp:100});
  const guarded=end(state);
  assert.ok(guarded.log.some(e=>e.text==='The city defenses repelled the raid.'));
  assert.equal(guarded.players[0].capital,unguarded.players[0].capital+3);
  assert.equal(guarded.players[1].capital,unguarded.players[1].capital);
  assert.equal(guarded.cities.find(c=>c.id===town.id).hp,100);
});

test('the civic target follows the largest starting team and stays fixed when a member is eliminated',()=>{
  const duel=fresh([0,1]), teams=fresh([2,1,2,1]), uneven=fresh([0,1,1,1]);
  assert.equal(getScoreTarget(duel),125);
  assert.equal(getScoreTarget(teams),250);
  assert.equal(getScoreTarget(uneven),375);
  teams.players[2].eliminated=true;
  assert.equal(getScoreTarget(campaignView(teams,0)),250);
  assert.equal(getScoreTarget({...teams,scoreTarget:100}),200);
});
