import assert from 'node:assert/strict';
import test from 'node:test';
import {createGame, getMap, hexDistance, neighbors} from '../docs/rules.js';
test('seeded starts vary, have food and neighbors, and stay separated on all three regions',()=>{
  for(const mapId of ['la','sf','sd']){
    const seen=new Set();
    for(let seed=0;seed<40;seed++){
      const players=['A','B','C','D'],game=createGame(players,mapId,{seed});
      assert.deepEqual(game,createGame(players,mapId,{seed}));
      const homes=game.units.filter(u=>u.type==='settler').map(u=>u.tile);
      seen.add(homes[0]);
      for(const id of homes){
        assert.ok(['urban','coast','plains'].includes(getMap(mapId).byId[id].terrain));
        assert.ok(neighbors(id,mapId).filter(n=>['urban','coast','plains'].includes(getMap(mapId).byId[n].terrain)).length>=2);
        assert.ok(homes.every(other=>other===id||hexDistance(id,other)>=5));
      }
    }
    assert.ok(seen.size>15);
  }
});

test('seats keep their names while a separate draw assigns distinct civilizations and colors',async()=>{
  const {FACTIONS,applyAction}=await import('../docs/rules.js');
  const seats=['海湾','West'];
  const first=new Set(), pairs=new Set();
  for(let seed=0;seed<48;seed++){
    const state=createGame(seats,'sf',{seed});
    assert.deepEqual(state.players.map(p=>p.name),seats);
    const [a,b]=state.players;
    first.add(a.faction);pairs.add(a.faction+'-'+b.faction);
    assert.notEqual(a.faction,b.faction);
    assert.equal(a.color,FACTIONS[a.faction].color);
    assert.match(applyAction(state,0,{type:'end'}).log.at(-1).text,new RegExp(FACTIONS[a.faction].name));
    assert.equal(createGame(seats,'sd',{seed}).players[0].faction,a.faction);
  }
  assert.equal(first.size,4);assert.equal(pairs.size,12);
});

test('one unclaimed settler becomes a genuine first capital with territory only after founding',async()=>{
  const {applyAction,getUnitOptions,getStats}=await import('../docs/rules.js');
  const state=createGame(['A','B'],'la',{seed:28});
  assert.deepEqual(state.units.map(u=>u.type),['settler','settler']);assert.equal(state.cities.length,0);
  assert.ok(Object.values(state.board).every(t=>t.owner===null));
  assert.equal(getStats(state,0).scienceIncome,0);
  const scout=state.units[0];
  assert.ok(getUnitOptions(state,scout.id).canFound);
  const founded=applyAction(state,0,{type:'found',unit:scout.id});
  assert.equal(founded.cities[0].originalSeat,0);assert.equal(founded.cities[0].tile,scout.tile);
  assert.ok(Object.values(founded.board).filter(t=>t.owner===0).length>=4);
  assert.equal(founded.units.filter(u=>u.seat===0).length,0);
  assert.ok(getStats(founded,0).scienceIncome>0);
});

test('a living unfounded rival prevents domination and losing the last unprotected settler ends a duel',async()=>{
  const {applyAction,UNIT_TYPES,chooseBotAction}=await import('../docs/rules.js');
  let game=createGame(['A','B','C'],'sd',{seed:14});
  for(let i=0;i<2;i++){
    game=applyAction(game,i,chooseBotAction(game));
    game=applyAction(game,i,{type:'end'});
  }
  game=applyAction(game,2,{type:'end'});
  const city=game.cities[1], mil={id:'army',seat:0,type:'melee',tile:city.tile,hp:100,maxHp:100,moves:2,maxMoves:2};
  mil.tile=neighbors(city.tile,game).find(id=>!['mountains','ocean'].includes(getMap(game).byId[id].terrain));
  game.units.push(mil);city.hp=1;
  game=applyAction(game,0,{type:'attack',unit:'army',tile:city.tile});
  assert.equal(game.phase,'playing');assert.equal(game.players[1].eliminated,true);
  game=applyAction(game,0,{type:'end'});assert.equal(game.turn,2);
  game=applyAction(game,2,{type:'end'});assert.equal(game.turn,0);
  const settler=game.units.find(u=>u.seat===2);
  const army=game.units.find(u=>u.id==='army');
  army.tile=neighbors(settler.tile,game).find(id=>!['ocean','mountains'].includes(getMap(game).byId[id].terrain));
  settler.hp=1;
  game=applyAction(game,0,{type:'attack',unit:'army',tile:settler.tile});
  assert.deepEqual(game.winners,[0]);assert.equal(game.victoryReason,'survival');
});

test('a first city can train a Scout; it travels farther than militia and cannot besiege a city',async()=>{
 const {applyAction,getUnitOptions,getProductionOptions,getRouteDetail,UNIT_TYPES}=await import('../docs/rules.js');
 let state=createGame(['West','East'],'la',{seed:22});
 for(let i=0;i<2;i++){
   state=applyAction(state,i,{type:'found',unit:state.units.find(u=>u.seat===i).id});
   state=applyAction(state,i,{type:'end'});
 }
 const city=state.cities[0];
 assert.ok(getProductionOptions(state,city.id).find(p=>p.item==='scout').enabled);
 state=applyAction(state,0,{type:'produce',city:city.id,item:'scout'});
 for(let i=0;i<4 && !state.units.length;i++){
   state=applyAction(state,0,{type:'end'});state=applyAction(state,1,{type:'end'});
 }
 const scout=state.units.find(u=>u.type==='scout');
 assert.equal(scout.moves,3);assert.equal(UNIT_TYPES.melee.moves,2);
 // Advance to the edge, then use the scout's spare move on land that was in fog.
 const destinations=getUnitOptions(state,scout.id).moves;
 const explored=new Set(Object.keys(state.exploration[0]));
 let advance;
 for(const id of destinations) {
   if(getRouteDetail(state,scout.id,id).cost!==2) continue;
   const middle=applyAction(state,0,{type:'move',unit:scout.id,tile:id});
   const farther=getUnitOptions(middle,scout.id).moves.find(tile=>!explored.has(tile));
   if(farther){ advance={id,middle,farther}; break; }
 }
 assert.ok(advance);
 const walk=applyAction(advance.middle,0,{type:'move',unit:scout.id,tile:advance.farther});
 assert.equal(walk.units.find(u=>u.id===scout.id).moves,0);
 const twin={...state,units:[{...scout,moves:2,type:'melee'}]};
 const stopped=applyAction(twin,0,{type:'move',unit:scout.id,tile:advance.id});
 assert.deepEqual(getUnitOptions(stopped,scout.id).moves,[]);

 const rival=state.cities[1]; scout.tile=neighbors(rival.tile,state).find(id=>getMap(state).byId[id].terrain==='urban')||neighbors(rival.tile,state)[0];
 assert.ok(!getUnitOptions(state,scout.id).attacks.includes(rival.tile));
});

test('governors start with sovereign cities at their chosen difficulty while humans retain real founding choices',async()=>{
  const {campaignView,getStats,getSettlementAssessment,applyAction,migrateGame}=await import('../docs/rules.js');
  for(const region of ['la','sf','sd']){
    const players=[{name:'You'},{bot:true,difficulty:'easy'},{bot:true},{bot:true,difficulty:'hard'}];
    const options={seed:417003,mapSize:'large',difficulty:'normal',teams:[0,1,2,3]};
    const s=createGame(players,region,options),map=getMap(s);
    assert.equal(s.round,1);assert.equal(s.phase,'playing');
    assert.equal(s.mapSize,'large');
    assert.deepEqual(players.map((_,seat)=>s.cities.filter(c=>c.seat===seat).length),[0,1,3,5]);
    assert.deepEqual(s.units.map(u=>[u.seat,u.type]),[[0,'settler']]);
    const home=s.units[0],seen=campaignView(s,0);
    assert.deepEqual(seen.cities,[]);
    assert.equal(s.players[0].surveyEnabled,false);assert.equal(getStats(s,0).capitalIncome,0);
    assert.equal(getSettlementAssessment(seen,home.id,home.tile).status,'now');
    for(const tile of [home.tile,...map.neighbors(home.tile)]){
      assert.ok(s.cities.every(city=>hexDistance(tile,city.tile)>=3));
      assert.equal(s.board[tile].owner,null);
    }
    assert.equal(applyAction(s,0,{type:'found',unit:home.id}).phase,'playing');
    for(const city of s.cities) {
      const capital=s.cities.find(c=>c.originalSeat===city.seat);
      assert.ok(capital);
      assert.equal(s.cities.filter(c=>c.originalSeat===city.seat).length,1);
      assert.equal(s.board[city.tile].owner,city.seat);
      assert.equal(s.board[city.tile].naturalWonder ?? null,null);
      assert.equal(s.board[city.tile].resource ?? null,null);
      assert.equal(s.board[city.tile].fieldStation ?? null,null);
      assert.ok(s.cities.every(c=>c.id===city.id || hexDistance(c.tile,city.tile)>=3));
      assert.equal(city.population,1);assert.equal(city.queue,null);
      assert.equal(s.players[city.seat].surveyEnabled,true);
      assert.ok(getStats(s,city.seat).scienceIncome>0);
      assert.ok(map.neighbors(capital.tile).some(tile=>s.board[tile].resource));
    }
    assert.deepEqual(migrateGame(JSON.parse(JSON.stringify(s))),s);
    const old=createGame(['First','Second'],region,{seed:options.seed,mapSize:options.mapSize});
    old.players[1].bot=true;
    assert.deepEqual(migrateGame(JSON.parse(JSON.stringify(old))),old);
  }
});

test('four hard governors receive twenty legal cities even on crowded archived charts',()=>{
  for(const region of ['la','sf','sd']){
    const players=Array.from({length:4},()=>({bot:true}));
    const options={seed:13,mapSize:'standard',difficulty:'hard'};
    const s=createGame(players,region,options);
    assert.deepEqual(s,createGame(players,region,options));
    assert.deepEqual(s.players.map((_,seat)=>s.cities.filter(c=>c.seat===seat).length),[5,5,5,5]);
    assert.equal(s.units.length,0);
    for(const c of s.cities)assert.ok(s.cities.every(other=>c===other || hexDistance(c.tile,other.tile)>=3));
  }
});

test('the old Los Angeles footprint is retained when twenty spaced towns fit around the reserved capitals',()=>{
  const s=createGame(Array.from({length:4},()=>({bot:true})),'la',{seed:0,mapSize:'standard',difficulty:'hard'});
  assert.equal(s.mapSize ?? 'standard','standard');
  assert.equal(s.cities.length,20);
  assert.ok(s.cities.every(city=>s.cities.every(other=>city===other || hexDistance(city.tile,other.tile)>=3)));
});
