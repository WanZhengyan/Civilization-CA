import {projectForSeat} from '../docs/vision.js';
import {neighbors} from '../docs/rules.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getMap,createGame,applyAction} from '../docs/rules.js';
import {RESOURCES,populateDeposits,canSeeDeposits} from '../docs/resources.js';

const depositList=s=>Object.entries(s.board).filter(([,t])=>t.resource).map(([id,t])=>[id,t.resource]);
const emptyBoard=map=>({board:Object.fromEntries(map.tiles.map(t=>[t.id,{}])),cities:[]});
test('California resource fields vary by seed, suit the terrain, and do not enter public geography',()=>{
  for(const id of ['la','sf','sd']) {
    const map=getMap(id);
    const make=seed=>depositList(populateDeposits(emptyBoard(map),map,seed));
    const deposit=make(148);
    assert.deepEqual(deposit,make(148));
    assert.notDeepEqual(deposit,make(149));
    assert.equal(new Set(deposit.map(x=>x[1])).size,6);
    assert.ok(deposit.length>22 && deposit.length<90);
    for(const [id,key] of deposit) {
      assert.ok(RESOURCES[key].terrains.includes(map.byId[id].terrain));
      assert.equal(map.byId[id].resource,undefined);
    }
  }
});
test('surveying before founding takes movement, grants only its seat knowledge and cannot be repeated',()=>{
  const state=createGame(['A','B'],'sf',{seed:12});
  state.cities=[];
  const unit=state.units.find(u=>u.seat===0&&u.type==='settler');
  const next=applyAction(state,0,{type:'survey',unit:unit.id});
  assert.equal(canSeeDeposits(state,0),false);
  assert.equal(canSeeDeposits(next,0),true);
  assert.equal(canSeeDeposits(next,1),false);
  assert.equal(next.units.find(u=>u.id===unit.id).moves,unit.moves-1);
  assert.throws(()=>applyAction(next,0,{type:'survey',unit:unit.id}));
});

test('across 108 starts, deposits stay private at birth and a workable deposit can be discovered beside home',()=>{
  for (const mapId of ['la','sf','sd']) for(let seed=0;seed<9;seed++){
    const state=createGame(['A','B','C','D'],mapId,{seed});
    for(const [seat] of state.players.entries()){
      const firstView=projectForSeat(state,seat);
      assert.equal(depositList(firstView).length,0);
      assert.equal(firstView.seed,undefined);
      const settler=state.units.find(u=>u.seat===seat && u.type==='settler');
      const ring=neighbors(settler.tile);
      const site=ring.find(id=>state.board[id].resource && getMap(state).byId[id].terrain!=='ocean');
      assert.ok(site);
      const surveyed=applyAction({...state,turn:seat},seat,{type:'survey',unit:settler.id});
      assert.equal(projectForSeat(surveyed,seat).board[site].resource,state.board[site].resource);
      assert.equal(depositList(projectForSeat(surveyed,(seat+1)%4)).length,0);
    }
  }
});
