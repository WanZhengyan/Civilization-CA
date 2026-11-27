import assert from 'node:assert/strict';
import test from 'node:test';
import {createGame, getMap, hexDistance, neighbors} from '../docs/rules.js';
test('seeded starts vary, have food and neighbors, and stay separated on all three regions',()=>{
  for(const mapId of ['la','sf','sd']){
    const seen=new Set();
    for(let seed=0;seed<40;seed++){
      const game=createGame(undefined,mapId,{seed});
      assert.deepEqual(game,createGame(undefined,mapId,{seed}));
      const homes=game.cities.map(city=>city.tile);
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
