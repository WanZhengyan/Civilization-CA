import assert from 'node:assert/strict';
import test from 'node:test';
import {createGame, getMap, hexDistance, neighbors} from '../docs/rules.js';
test('seeded starts vary, have food and neighbors, and stay separated on all three regions',()=>{
  for(const mapId of ['la','sf','sd']){
    const seen=new Set();
    for(let seed=0;seed<40;seed++){
      const game=createGame(undefined,mapId,{seed});
      assert.deepEqual(game,createGame(undefined,mapId,{seed}));
      const homes=game.units.filter(u=>u.type==='settler').map(u=>u.tile);
      seen.add(homes[0]);
      for(const id of homes){
        assert.ok(['urban','coast','plains'].includes(getMap(mapId).byId[id].terrain));
        assert.ok(neighbors(id).filter(n=>['urban','coast','plains'].includes(getMap(mapId).byId[n].terrain)).length>=2);
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
  mil.tile=neighbors(city.tile).find(id=>!['mountains','ocean'].includes(getMap(game).byId[id].terrain));
  game.units.push(mil);city.hp=1;
  game=applyAction(game,0,{type:'attack',unit:'army',tile:city.tile});
  assert.equal(game.phase,'playing');assert.equal(game.players[1].eliminated,true);
  game=applyAction(game,0,{type:'end'});assert.equal(game.turn,2);
  game=applyAction(game,2,{type:'end'});assert.equal(game.turn,0);
  const settler=game.units.find(u=>u.seat===2);
  const army=game.units.find(u=>u.id==='army');
  army.tile=neighbors(settler.tile).find(id=>!['ocean','mountains'].includes(getMap(game).byId[id].terrain));
  settler.hp=1;
  game=applyAction(game,0,{type:'attack',unit:'army',tile:settler.tile});
  assert.deepEqual(game.winners,[0]);assert.equal(game.victoryReason,'survival');
});
