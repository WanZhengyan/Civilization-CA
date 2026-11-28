import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,applyAction,campaignView,getUnitOptions} from '../docs/rules.js';
import {scoutingRoutes} from '../docs/scout-routes.js';
import {previewMove,sameMove} from '../docs/move-review.js';
import {translate} from '../docs/i18n.js';

function opening(mapId,seed) {
  let game=createGame([{name:'Surveyor'}],mapId,{seed,mapSize:'large',practice:true});
  game=applyAction(game,0,{type:'found',unit:game.units[0].id});
  game=applyAction(game,0,{type:'produce',city:game.cities[0].id,item:'scout'});
  while(!game.units.some(u=>u.type==='scout') && game.round<12)game=applyAction(game,0,{type:'end'});
  return game;
}

test('a scout’s ranked routes quote the exact new hexes revealed by legal moves across three regions',()=>{
  for(const mapId of ['la','sf','sd']){
    const game=opening(mapId,17),view=campaignView(game,0),unit=view.units.find(u=>u.type==='scout');
    const moves=getUnitOptions(view,unit.id).moves;
    const ranks=scoutingRoutes(view,unit,moves);
    assert.equal(ranks.length,moves.length);assert(ranks.length>1);
    const before=new Set(view.intel.explored);
    for(const [i,row] of ranks.entries()){
      if(i)assert(row.newHexes<ranks[i-1].newHexes || row.newHexes===ranks[i-1].newHexes && row.cost>=ranks[i-1].cost);
      const result=applyAction(game,0,{type:'move',unit:unit.id,tile:row.tile});
      const gained=campaignView(result,0).intel.explored.filter(tile=>!before.has(tile)).sort();
      assert.equal(result.units.find(u=>u.id===unit.id).moves,row.left);
      assert.equal(gained.length,row.newHexes);
      assert.deepEqual(previewMove(view,unit,row.tile).frontier.sort(),gained);
    }
    if(mapId==='la'){
      assert.equal(before.size,19);
      const canals=ranks.filter(row=>['9,17','10,17'].includes(row.tile));
      assert.deepEqual(canals.map(r=>[r.tile,r.cost,r.newHexes]),[['9,17',2,10],['10,17',2,9]]);
    }
  }
});

test('forecasts use the shared explored chart, and concealed objects cannot change the suggestion',()=>{
  const game=opening('la',17),view=campaignView(game,0),unit=view.units.find(u=>u.type==='scout');
  const chosen=previewMove(view,unit,'9,17'),hidden=chosen.frontier[0];
  assert(chosen.frontier.length>0);
  const rival=structuredClone(game);
  rival.board[hidden]={...rival.board[hidden],resource:'iron',owner:1,fieldStation:'archive'};
  assert.deepEqual(previewMove(campaignView(rival,0),unit,chosen.tile),chosen);
  const team=structuredClone(view);
  team.intel.explored.push(hidden);
  const updated=previewMove(team,unit,chosen.tile);
  assert.equal(updated.frontier.length,chosen.frontier.length-1);
  assert(!sameMove(chosen,updated));assert(!updated.frontier.includes(hidden));
  assert.deepEqual(scoutingRoutes(view,{...unit,seat:1},[chosen.tile]),[]);
  assert.equal(translate('Newly charted hexes','zh-CN'),'新增已探索地块');
});
