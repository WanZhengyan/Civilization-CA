import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,applyAction,campaignView,getStats,getCityYield,getMap,hexDistance,UNIT_TYPES} from '../docs/rules.js';
import {notebookReport,expeditionScout} from '../docs/regional-atlas.js';

test('a coastal scout returns three distinct regional observations to its founding city',()=>{
  let game=createGame([{name:'Field team'}],'la',{seed:17,mapSize:'large',practice:true});
  const order=action=>{game=applyAction(game,0,action)};
  const end=()=>order({type:'end'});
  order({type:'found',unit:game.units[0].id});
  const city=game.cities[0].id;
  order({type:'produce',city,item:'scout'});end();end();end();
  const unit=game.units.find(u=>u.type==='scout').id;
  const move=tile=>order({type:'move',unit,tile});
  const note=()=>order({type:'recordTransect',unit});
  const publish=()=>order({type:'fileTransect',unit});
  const read=()=>game.units.find(u=>u.id===unit);
  move('9,17');order({type:'visitStation',unit,item:'provisions'});end();
  note();assert.throws(note,/new terrain/);assert.throws(publish);
  move('10,15');end();
  assert.throws(note,/three hexes/);
  move('12,15');note();end();move('12,18');end();move('13,20');note();
  assert.deepEqual(read().fieldNotes.map(n=>n.terrain),['coast','urban','plains']);
  assert.throws(publish);end();move('10,19');end();
  const saved=JSON.parse(JSON.stringify(game));
  assert.equal(notebookReport(campaignView(saved,0),read(),getMap(saved),hexDistance).canFile,true);
  const gold=game.players[0].capital,influence=game.players[0].influence;
  const rate=getStats(game,0).influenceIncome,cityRate=getCityYield(game,city).influence;
  publish();
  assert.equal(game.round,10);
  assert.equal(game.players[0].capital,gold+8);assert.equal(game.players[0].influence,influence+6);
  assert.equal(getStats(game,0).influenceIncome,rate+1);
  assert.equal(getCityYield(game,city).influence,cityRate+1);
  assert.equal(read().moves,0);assert.equal(game.cities[0].atlasCopies,1);
  end();assert.throws(publish);
  assert.equal(game.players[0].influence,influence+6+rate+1);
});
test('scout notebooks and the publishing history are private, and older campaigns accept no field orders',()=>{
  const game=createGame([{name:'A'},{name:'B'}],'sf',{seed:17});
  const tile=game.units[1].tile;
  game.units.push({id:'observer',type:'scout',seat:0,tile,moves:2,maxMoves:3,hp:65,maxHp:65,
    fieldNotes:[{tile,terrain:'urban'}]});
  game.players[0].publishedAtlas={city:'archive',round:8};
  const rival=campaignView(game,1);
  assert.ok(rival.units.some(unit=>unit.id==='observer'));
  assert.equal(rival.units.find(unit=>unit.id==='observer').fieldNotes,undefined);
  assert.equal(rival.players[0].publishedAtlas,undefined);
  const legacy={...game,campaignVariety:undefined};
  for(const type of ['recordTransect','fileTransect'])assert.throws(()=>applyAction(legacy,0,{type,unit:'observer'}));
});

test('a governor retains its most experienced scout unless a visible capture unit threatens home',()=>{
  const units=[{id:'trainee',seat:0,type:'scout',tile:'4,4'},{id:'observer',seat:0,type:'scout',tile:'4,5',fieldNotes:[{tile:'3,2',terrain:'coast'}]}];
  const base={campaignVariety:1,players:[{},{}],cities:[{seat:0,tile:'4,4'}],units};
  const keep=state=>expeditionScout(state,0,hexDistance,UNIT_TYPES);
  assert.equal(keep(base),'observer');
  assert.equal(keep({...base,units:[...units,{seat:1,type:'settler',tile:'5,4'}]}),'observer');
  assert.equal(keep({...base,units:[...units,{seat:1,type:'melee',tile:'5,4'}]}),null);
  assert.equal(keep({...base,players:[{publishedAtlas:{round:14}},{}]}),null);
  assert.equal(keep({...base,campaignVariety:undefined}),null);
});
