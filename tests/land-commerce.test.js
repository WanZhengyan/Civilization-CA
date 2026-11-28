import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAction,campaignView,createGame,getLandRoutes,getMap} from '../docs/rules.js';

function market() {
  let state=createGame([{civilization:'valley'}],'la',{seed:323,practice:true,victoryMode:'science'});
  state=applyAction(state,0,{type:'found',unit:state.units[0].id});
  const home=state.cities[0],map=getMap(state);
  const neighbors=id=>map.neighbors(id).filter(i=>!['mountains','ocean'].includes(map.byId[i].terrain));
  const path=[home.tile];
  while(path.length<6){
    const next=neighbors(path.at(-1)).find(id=>!path.includes(id) && !path.slice(0,-1).some(old=>neighbors(old).includes(id)));
    if(!next)break;
    path.push(next);
  }
  assert.ok(path.length>=4);
  state.exploration[0]=Object.fromEntries(path.map(id=>[id,null]));
  state.cities.push({...structuredClone(home),id:'destination',tile:path.at(-1),name:'Depot',originalSeat:null,food:0});
  home.food=12;
  return {state,home:home.id,dest:'destination'};
}
test('a land corridor uses only charted land and is reciprocal for its two owners’ cities',()=>{
  const {state,home,dest}=market(),route=getLandRoutes(state,0,home)[0];
  assert.equal(route.destination,dest);
  assert.deepEqual(getLandRoutes(campaignView(state,0),0,home),[route]);
  assert.equal(getLandRoutes(state,0,dest)[0].steps,route.steps);
  assert.equal(route.turns,Math.ceil(route.steps/3));
  assert.deepEqual(getLandRoutes(campaignView(state,0),1,home),[]);
});
