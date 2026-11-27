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
