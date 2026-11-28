import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,applyAction,campaignView,chooseBotAction,getMap,getProjectSites,getUnitOptions,UNIT_TYPES} from '../docs/rules.js';
import {waterDistances} from '../docs/water-navigation.js';

test('a newly founded coastal city launches a cutter which sails into a generated lake and attacks a river port',()=>{
 const fresh=()=>createGame([{name:'Fleet'},{name:'Bank'}],'la',{seed:17,mapSize:'large',victoryMode:'conquest'});
 let s=fresh();
 const map=getMap(s),destination=s.units[1].tile;
 const lakeside=map.neighbors(destination).find(id=>map.byId[id].waterway);
 const distances=waterDistances(lakeside,map.byId,map.neighbors),trace=[],passage=new Set();
 let report;
 while(s.round<=18 && !report){
  const seat=s.turn,port=s.cities.find(c=>c.seat===seat);
  const ship=s.units.find(u=>u.seat===seat && u.type==='cutter');
  let action={type:'end'};
  if(!port)action={type:'found',unit:s.units.find(u=>u.seat===seat && u.type==='settler').id};
  else if(!port.queue && !port.buildings.includes('harbor')){
   const site=getProjectSites(s,port.id,'harbor').find(o=>seat===0 ? o.id==='11,20' : o.waterway);
   assert.ok(site);action={type:'produce',city:port.id,item:'harbor',site:site.id};
  }else if(seat===0 && !ship && !port.queue)action={type:'produce',city:port.id,item:'cutter'};
  else if(seat===0 && ship?.moves){
   const opts=getUnitOptions(campaignView(s,0),ship.id);
   passage.add(map.byId[ship.tile].waterway||'sea');
   if(map.byId[ship.tile].waterway && opts.attacks.includes(destination))action={type:'attack',unit:ship.id,tile:destination};
   else {
    const best=opts.moves.filter(t=>distances.get(t)<distances.get(ship.tile)).sort((a,b)=>distances.get(a)-distances.get(b))[0];
    if(best)action={type:'move',unit:ship.id,tile:best};
   }
  }
  const next=applyAction(s,seat,action);trace.push([seat,action]);
  if(action.type==='attack')report=next.battleReports[seat].at(-1);
  s=next;
 }
 assert.deepEqual([...passage],['sea','river','lake']);
 assert.equal(report?.damage,36);assert.equal(report.retaliation,0);
 assert.equal(report.attacker.hpAfter,85);assert.equal(report.target.hpAfter,64);
 const rival=s.cities.find(c=>c.seat===1);
 assert.ok(rival.portTile && map.byId[rival.portTile].waterway);
 let replay=fresh();for(const [seat,a] of trace)replay=applyAction(replay,seat,a);
 assert.deepEqual(s,replay);
});

test('a normal fleet order is identical when only an uncharted lake and an unseen rival ship change',()=>{
 let state=createGame([{bot:true},{bot:true}],'la',{seed:42,mapSize:'large',difficulty:'normal',victoryMode:'conquest'});
 let found=false;
 while(state.phase==='playing' && state.round<=20 && !found){
  const seat=state.turn,action=chooseBotAction(state);
  const unit=state.units.find(u=>u.id===action.unit);
  if(unit && UNIT_TYPES[unit.type].domain==='sea' && ['move','haulFish','landCatch'].includes(action.type)){
   const before=campaignView(state,seat),seen=new Set(before.intel.explored),map=getMap(state);
   const distant=map.tiles.find(t=>!seen.has(t.id) && ['plains','urban','forest'].includes(t.terrain) && !state.units.some(u=>u.tile===t.id));
   const other=structuredClone(state);
   other.waterways.lake.push(distant.id);
   other.units.push({id:'hidden-skiff',seat:1-seat,type:'cutter',tile:distant.id,moves:3,maxMoves:3,hp:85,maxHp:85});
   assert.equal(getMap(other).byId[distant.id].waterway,'lake');
   assert.deepEqual(campaignView(other,seat),before);
   assert.deepEqual(chooseBotAction(other),action);assert.doesNotThrow(()=>applyAction(other,seat,action));found=true;
  }
  state=applyAction(state,seat,action);
 }
 assert.ok(found);
});

test('an autonomous fishing crew loads, sails and lands cargo once on the original campaign authority',()=>{
 let state=createGame([{bot:true},{bot:true}],'la',{seed:42,mapSize:'large',difficulty:'normal',victoryMode:'conquest'});
 const laden=new Map();let completed=false;
 while(state.phase==='playing' && state.round<=24 && !completed){
  const seat=state.turn,action=chooseBotAction(state),unit=state.units.find(u=>u.id===action.unit);
  if(action.type==='haulFish')laden.set(unit.id,unit.tile);
  const next=applyAction(state,seat,action);
  if(action.type==='landCatch'){
   const port=state.cities.find(c=>c.seat===seat && c.portTile===unit.tile);
   assert.ok(laden.has(unit.id));assert.notEqual(laden.get(unit.id),port.portTile);
   assert.equal(next.cities.find(c=>c.id===port.id).food,port.food+3);
   assert.equal(next.players[seat].stockpile.fish,(state.players[seat].stockpile?.fish||0)+1);
   assert.equal(next.units.find(u=>u.id===unit.id).moves,0);
   assert.throws(()=>applyAction(next,seat,action));completed=true;
  }
  state=next;
 }
 assert.ok(completed);
});
