import test from 'node:test';
import assert from 'node:assert/strict';
import {initiativeOrder,nextTeamPhase} from '../docs/team-turns.js';
const fixture=()=>({players:[{},{},{},{}],teams:[0,1,0,2],firstSeat:2,round:1,phase:'playing',teamPhase:{team:0}});
test('team initiative visits separated allies once and skips eliminated teams',()=>{
  const s=fixture();
  assert.deepEqual(initiativeOrder(s),[2,3,0,1]);
  assert.deepEqual(nextTeamPhase(s),{team:2,wrap:false});
  s.players[3].eliminated=true;assert.deepEqual(nextTeamPhase(s),{team:1,wrap:false});
  s.teamPhase.team=1;assert.deepEqual(nextTeamPhase(s),{team:0,wrap:true});
});
import {activeTeamSeats,newTeamPhase,seatMayOrder} from '../docs/team-turns.js';
test('ready and eliminated allies cannot spend orders',()=>{
  const s=fixture();s.teamPhase=newTeamPhase(s,0,i=>2+i);
  assert.deepEqual(s.teamPhase.orders,[2,0,4,0]);assert.deepEqual(activeTeamSeats(s),[2,0]);
  s.teamPhase.readySeats.push(2);assert(!seatMayOrder(s,2));assert(seatMayOrder(s,0));
  s.players[0].eliminated=true;assert.deepEqual(activeTeamSeats(s),[]);
});
import {publicTeamPhase,teamOrderKey} from '../docs/team-turns.js';
test('only the acting seat receives its own concurrency key and no ally economy',()=>{
  const s=fixture();s.teamPhase=newTeamPhase(s,0,()=>2);
  assert.deepEqual(publicTeamPhase(s,0),{team:0,activeSeats:[2,0],readySeats:[],orderKey:'1.0.0.0'});
  assert.equal(teamOrderKey(s,1),null);s.teamPhase.sequence[2]++;
  assert.equal(teamOrderKey(s,0),'1.0.0.0');assert.equal(teamOrderKey(s,2),'1.0.2.1');
});
import {actingPerspective} from '../docs/team-turns.js';
test('the acting perspective changes no authoritative fields',()=>{
  const s=fixture();s.turn=2;s.actionsLeft=4;s.teamPhase=newTeamPhase(s,0,i=>2+i);
  assert.equal(actingPerspective(s,0).turn,0);assert.equal(actingPerspective(s,0).actionsLeft,2);
  assert.equal(actingPerspective(s,1),s);assert.equal(s.turn,2);assert.equal(s.actionsLeft,4);
});
import {createGame,applyAction,campaignView,chooseBotAction} from '../docs/rules.js';
const opening=()=>createGame([{name:'Host'},{name:'Rival'},{name:'Friend'}],'la',{seed:39,teams:[0,1,0],simultaneousTeams:true});
test('only an opted-in match with allied seats gains a team phase',()=>{
  const s=opening();assert.deepEqual(activeTeamSeats(s),[0,2]);
  const old=createGame([{name:'A'},{name:'B'}],'la',{seed:39,teams:[0,1],simultaneousTeams:true});
  assert.equal(old.teamPhase,undefined);
});
test('separated allies can found in either order without sharing a district budget',()=>{
  const before=opening(),snapshot=JSON.stringify(before);
  let s=before;
  for (const seat of [2,0]) s=applyAction(s,seat,{type:'found',unit:s.units.find(u=>u.seat===seat).id});
  assert.deepEqual(s.cities.map(c=>c.seat),[2,0]);assert.equal(JSON.stringify(before),snapshot);
  assert.throws(()=>applyAction(s,1,{type:'end'}));
  s=applyAction(s,2,{type:'develop',tile:s.cities[0].tile});
  assert.deepEqual(s.teamPhase.orders,[2,0,1]);assert.equal(s.players[0].capital,12);
});
test('Ready settles only the owner and advances one round after the last team',()=>{
  let s=opening();
  for(const seat of [0,2])s=applyAction(s,seat,{type:'found',unit:s.units.find(u=>u.seat===seat).id});
  const balances=s.players.map(p=>p.capital);
  s=applyAction(s,2,{type:'end'});assert.deepEqual(activeTeamSeats(s),[0]);
  assert.equal(s.players[0].capital,balances[0]);assert(s.players[2].capital>balances[2]);
  assert.throws(()=>applyAction(s,2,{type:'end'}));
  s=applyAction(s,0,{type:'end'});assert.equal(s.round,1);assert.deepEqual(activeTeamSeats(s),[1]);
  s=applyAction(s,1,{type:'end'});assert.equal(s.round,2);assert.deepEqual(activeTeamSeats(s),[0,2]);
});
test('each ally sees personal orders and active unit options, the enemy sees no command key',()=>{
  const s=opening();
  for(const seat of [0,2]){
    const view=campaignView(s,seat);assert.equal(view.turn,seat);assert.equal(view.actionsLeft,2);
    assert.equal(view.teamPhase.orderKey,'1.0.'+seat+'.0');assert.equal(view.teamPhase.orders,undefined);
  }
  const waiting=campaignView(s,1);assert.equal(waiting.teamPhase.orderKey,null);assert.equal(waiting.actionsLeft,0);
});
test('an active allied computer plans for its own units even when the host is representative',()=>{
  const s=opening(),bot=chooseBotAction(s,'normal',2);
  assert.equal(bot.type,'found');assert.equal(s.units.find(u=>u.id===bot.unit).seat,2);
  const next=applyAction(s,2,bot);assert.equal(next.turn,0);assert.equal(next.cities[0].seat,2);
});
test('an eliminated ally neither blocks readiness nor receives new movement or orders',()=>{
  let s=opening();s.players[0].eliminated=true;s.units=s.units.filter(u=>u.seat!==0);
  assert.deepEqual(activeTeamSeats(s),[2]);
  s=applyAction(s,2,{type:'end'});assert.deepEqual(activeTeamSeats(s),[1]);
  s=applyAction(s,1,{type:'end'});assert.equal(s.round,2);assert.deepEqual(activeTeamSeats(s),[2]);
  assert.equal(s.teamPhase.orders[0],0);assert.equal(s.turn,2);
});
test('a saved partial phase preserves Ready, each budget and personal recovery exactly once',()=>{
  let s=opening();
  for(const seat of [0,2])s=applyAction(s,seat,{type:'found',unit:s.units.find(u=>u.seat===seat).id});
  s=applyAction(s,2,{type:'develop',tile:s.cities.find(c=>c.seat===2).tile});
  s=applyAction(s,0,{type:'end'});const paid=s.players[0].capital;
  s=JSON.parse(JSON.stringify(s));
  assert.equal(campaignView(s,0).actionsLeft,0);assert.equal(campaignView(s,2).actionsLeft,1);
  s.cities.forEach(c=>c.hp=40);
  s=applyAction(s,2,{type:'end'});assert.equal(s.players[0].capital,paid);
  assert.deepEqual(s.cities.map(c=>c.hp),[40,40]);
  s=applyAction(s,1,{type:'end'});assert.deepEqual(s.cities.map(c=>c.hp),[46,46]);
});
