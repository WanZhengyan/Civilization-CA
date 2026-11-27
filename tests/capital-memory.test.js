import assert from 'node:assert/strict';
import test from 'node:test';
import {applyAction,campaignView,createGame,getMap,getUnitOptions,hexDistance,migrateGame} from '../docs/rules.js';
import {createClassicGame} from './classic-game.js';

test('each seat remembers its own founding, including original pre-settler campaigns',()=>{
  const game=createGame(['West','East'],'sf',{seed:74});
  assert.equal(campaignView(game,0).intel.hasFoundedCapital,false);
  const founded=applyAction(game,0,{type:'found',unit:game.units[0].id});
  assert.equal(campaignView(founded,0).intel.hasFoundedCapital,true);
  assert.equal(campaignView(founded,1).intel.hasFoundedCapital,false);
  assert.equal(Object.hasOwn(founded,'hasFoundedCapital'),false);
  const classic=migrateGame(JSON.parse(JSON.stringify(createClassicGame(['West','East'],'sd'))));
  for(const seat of [0,1]) assert.equal(campaignView(classic,seat).intel.hasFoundedCapital,true);
});

test('an unseen captured capital stays in founding history without revealing the city, the garrison or the tile owner',()=>{
  const initial=createGame(['West','East'],'la',{seed:417005,mapSize:'large'});
  const founder=initial.units[0];
  let game=applyAction(initial,0,{type:'found',unit:founder.id});
  const home=game.cities[0],map=getMap(game),ground=id=>!['ocean','mountains'].includes(map.byId[id].terrain);
  const otherSite=map.tiles.find(tile=>ground(tile.id) && hexDistance(tile.id,home.tile)>8 &&
    game.board[tile.id].owner===null && !game.board[tile.id].naturalWonder && !game.units.some(u=>u.tile===tile.id)).id;
  game.barbarians={camps:[],parties:[]};
  game.units.push({...founder,id:'replacement',tile:otherSite});
  game=end(game);
  const attacker={id:'army',seat:1,type:'melee',tile:map.neighbors(home.tile).find(ground),hp:100,maxHp:100,moves:2,maxMoves:2};
  game.units.push(attacker);
  game.cities[0].hp=1;
  game=applyAction(game,1,{type:'attack',unit:attacker.id,tile:home.tile});
  assert.equal(game.cities[0].seat,1);
  assert.equal(game.cities[0].originalSeat,0);
  assert.equal(campaignView(game,1).intel.hasFoundedCapital,false);
  game=end(game);
  game.log=[]; // Long campaigns can outlive the founding entry.
  game.cities[0].name='Private name after capture';
  const restored=migrateGame(JSON.parse(JSON.stringify(game)));
  const view=campaignView(restored,0);
  assert.equal(view.intel.hasFoundedCapital,true);
  assert.ok(!view.intel.visible.includes(home.tile));
  assert.equal(view.board[home.tile].owner,null);
  assert.ok(!view.units.some(unit=>unit.id===attacker.id));
  assert.ok(!view.cities.some(city=>city.id===home.id));
  assert.ok(!JSON.stringify(view).includes('Private name after capture'));
  assert.ok(getUnitOptions(view,'replacement').canFound);
  const resettled=applyAction(restored,0,{type:'found',unit:'replacement'});
  assert.equal(resettled.cities.find(city=>city.tile===otherSite).originalSeat,null);
});

function end(game) { return applyAction(game,game.turn,{type:'end'}); }
