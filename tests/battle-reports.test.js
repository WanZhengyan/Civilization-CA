import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAction,campaignView,chooseBotAction,createGame,getMap,UNIT_TYPES} from '../docs/rules.js';
import {getVisibleTiles,projectForSeat} from '../docs/vision.js';
import {createClassicGame} from './classic-game.js';

function piece(id,seat,type,tile,hp=UNIT_TYPES[type].maxHp) {
  const {moves,maxHp}=UNIT_TYPES[type];
  return {id,seat,type,tile,hp,maxHp,moves,maxMoves:moves};
}

function battlefield(map='la') {
  const state=createClassicGame(['Coast','Valley','Sierra','Pacific'],map);
  state.enforceSight=true;
  state.units=[];state.cities=[];
  for(const holding of Object.values(state.board)) holding.owner=null;
  state.barbarians={camps:[],parties:[]};
  return state;
}

const attack=(state,unit,tile)=>applyAction(state,state.turn,{type:'attack',unit,tile});
const journal=(state,seat)=>projectForSeat(state,seat).intel.battles;

test('a lethal shot preserves last-unit sight, hides its unobserved origin and excludes witnesses who saw only the source',()=>{
  const game=battlefield();
  game.units=[piece('gun',0,'artillery','7,6'),piece('spotter',0,'melee','10,7'),
    piece('victim',1,'melee','10,6',1),piece('witness',2,'melee','12,6'),piece('distant',3,'melee','5,6')];
  assert.deepEqual(game.players.map((_,seat)=>['7,6','10,6'].map(id=>getVisibleTiles(game,seat).has(id))),
    [[true,true],[false,true],[false,true],[true,false]]);
  const action={type:'attack',unit:'gun',tile:'10,6'};
  const next=applyAction(game,0,action), original=JSON.stringify(next);
  assert.ok(!getVisibleTiles(next,1).has('10,6'));
  const owner=journal(next,0)[0], victim=journal(next,1)[0];
  assert.equal(owner.attacker.tile,'7,6');assert.equal(owner.attacker.type,'artillery');
  assert.deepEqual(victim.attacker,{kind:'unknown'});
  assert.deepEqual(victim.target,{kind:'unit',seat:1,type:'melee',tile:'10,6',hpBefore:1,hpAfter:0});
  assert.equal(victim.id,1);assert.equal(victim.damage,1);assert.equal(victim.outcome,'destroyed');assert.ok(victim.targetLost);
  assert.deepEqual(journal(next,2),[victim]);assert.deepEqual(journal(next,3),[]);
  assert.deepEqual(campaignView(next,2).log,game.log);
  assert.equal(campaignView(next,1).battleReports,undefined);
  assert.equal(game.battleReports,undefined);
  assert.equal(JSON.stringify(applyAction(JSON.parse(JSON.stringify(game)),0,action)),original);
  assert.deepEqual(campaignView(JSON.parse(original),1).intel.battles,[victim]);
  assert.deepEqual(campaignView(game,1).intel.battles,[]);
});

test('garrisons take the hit first, saved reports keep their original owner, and capturing is distinct from combat casualties',()=>{
  const game=battlefield();
  const city={...createClassicGame(['A','B']).cities[1],id:'harbor',name:'Sunset Harbor',seat:1,tile:'10,6',hp:1};
  game.cities=[city];game.units=[piece('one',0,'melee','9,6'),piece('two',0,'melee','10,7'),piece('guard',1,'melee',city.tile,2)];
  let state=attack(game,'one',city.tile);
  const guard=journal(state,1)[0];
  assert.equal(guard.garrison,city.name);assert.equal(guard.target.type,'melee');assert.equal(guard.targetLost,true);
  assert.equal(guard.retaliation,guard.attacker.hpBefore-guard.attacker.hpAfter);
  assert.equal(state.cities[0].hp,1);
  state=attack(JSON.parse(JSON.stringify(state)),'two',city.tile);
  const [first,second]=journal(state,1);
  assert.deepEqual(first,guard);assert.equal(second.id,first.id+1);
  assert.equal(second.outcome,'captured');assert.equal(second.targetLost,false);
  assert.equal(second.attacker.tile,'10,7');assert.equal(second.target.seat,1);
  assert.equal(second.target.kind,'city');assert.equal(second.target.name,'Sunset Harbor');
  assert.equal(second.target.hpAfter,0);assert.equal(state.cities[0].seat,0);
  assert.deepEqual(journal(state,2),[]);
});

test('battle journals bound the history and continue numbering across a saved campaign',()=>{
  let state=battlefield();
  for(let n=0;n<54;n++){
    state.units=[piece('one',0,'ranged','9,6'),piece('guard',1,'melee','10,6')];
    state=attack(state,'one','10,6');
  }
  const history=journal(state,1);
  assert.equal(history.length,48);
  assert.deepEqual(history.map(e=>e.id),Array.from({length:48},(_,i)=>7+i));
  state=JSON.parse(JSON.stringify(state));
  state.units[0].moves=2;
  assert.equal(journal(attack(state,'one','10,6'),1).at(-1).id,55);
});

test('a bot and a human generate identical reports for the same attack order',()=>{
  const game=battlefield();
  const city={...createClassicGame(['A','B']).cities[0],seat:0,tile:'8,6'};
  game.cities=[city];game.units=[piece('gun',0,'ranged','9,6'),piece('target',1,'melee','10,6')];
  game.players[0].research='surveying';game.players[0].civic='stewardship';
  const action=chooseBotAction(game);
  assert.deepEqual(action,{type:'attack',unit:'gun',tile:'10,6'});
  game.players[0].bot=true;
  const result=applyAction(game,0,action);
  assert.equal(journal(result,1)[0].attacker.seat,0);
  assert.equal(journal(result,1)[0].attacker.type,'ranged');
  assert.equal(journal(result,1)[0].damage,100-result.units.find(u=>u.id==='target').hp);
});

test('old saves with historical combat and neutral log entries do not fabricate reports or identify a hidden attacker',()=>{
  const game=createGame([{name:'You'},{name:'Rival'}],'la',{seed:121});
  game.log.push({type:'attack',round:1,seat:1,from:'7,6',tile:'10,6',audience:1,text:'A hidden gun fired.'},
    {type:'barbarian',round:1,seat:1,tile:'10,6',audience:1,text:'Raiders spotted.'});
  const first=campaignView(game,0);
  assert.deepEqual(first.intel.battles,[]);
  assert.ok(!first.log.some(e=>e.tile==='10,6'));
});


test('a soldier arriving from the far side of the Bay Bridge can be identified without disclosing its origin',()=>{
  const game=battlefield('sf');
  const {a,b}=getMap(game).crossings.find(bridge=>bridge.name==='Bay Bridge');
  game.board[b]={owner:3,level:0};
  game.units=[piece('gun',0,'melee',a),piece('spotter',0,'melee','12,5'),
    piece('victim',1,'melee',b,1),piece('friend',1,'melee','13,4')];
  assert.ok(getVisibleTiles(game,1).has(b));
  assert.ok(!getVisibleTiles(game,1).has(a));
  const next=attack(game,'gun',b);
  assert.equal(next.units.find(u=>u.id==='gun').tile,b);
  for(const seat of [1,3]) {
    const {attacker,retaliation}=journal(next,seat)[0];
    assert.deepEqual(attacker,{kind:'unit',seat:0,type:'melee',hpAfter:next.units.find(u=>u.id==='gun').hp});
    assert.equal(retaliation,null);
  }
  assert.equal(journal(next,0)[0].attacker.tile,a);
  assert.deepEqual(journal(next,2),[]);
});
