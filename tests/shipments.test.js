import {RESOURCES} from '../docs/resources.js';
import {projectForSeat} from '../docs/vision.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,applyAction,getResourceLedger,neighbors,getMap} from '../docs/rules.js';

function market() {
  const s=createGame(['A','B'],'la',{seed:71});
  const city={id:'portland',seat:0,name:'Citrus Town',tile:'9,6',food:0,population:1,hp:100,maxHp:100,buildings:[],
    queue:{item:'workshop',required:13,progress:2}};
  const tile=neighbors(city.tile).find(id=>getMap(s).byId[id].terrain==='urban');
  s.cities=[city]; s.units=[]; s.turn=0;
  s.board[city.tile]={owner:0,level:1};
  s.board[tile]={owner:0,level:0,resource:'citrus',improvement:'orchard'};
  s.players[0].stockpile={stone:2,citrus:2};
  return {s,city,tile};
}
test('only a working connected resource contributes one stock unit at the end of its owners turn',()=>{
  const {s,tile}=market();
  assert.deepEqual(getResourceLedger(s,0).citrus,{stock:2,income:1});
  const next=applyAction(s,0,{type:'end'});
  assert.equal(next.players[0].stockpile.citrus,3);
  assert.equal(s.players[0].stockpile.citrus,2);
  assert.deepEqual(getResourceLedger(s,1).citrus,{stock:0,income:0});
  s.board[tile]={...s.board[tile],pillaged:true};
  assert.equal(getResourceLedger(s,0).citrus.income,0);
  delete s.board[tile].pillaged; s.board[tile].owner=1;
  assert.equal(getResourceLedger(s,0).citrus.income,0);
});
test('shipping spends two goods once, routes food or materials correctly, and preserves source state',()=>{
  const {s,city}=market();
  const dispatch=(state,resource,market,receiver=city.id)=>applyAction(state,0,{type:'shipment',resource,market,city:receiver});
  const sold=dispatch(s,'stone','sell');
  assert.equal(sold.players[0].capital-s.players[0].capital,5);
  assert.equal(sold.players[0].stockpile.stone,0);
  assert.throws(()=>dispatch(sold,'citrus','sell'),/already/);
  const supplies=dispatch(s,'stone','city');
  assert.equal(supplies.cities[0].queue.progress,6);
  assert.equal(s.cities[0].queue.progress,2);
  assert.equal(dispatch(s,'citrus','city').cities[0].food,4);
  assert.throws(()=>dispatch(s,'gold','sell'),/two stored/);
  assert.throws(()=>dispatch(s,'citrus','city','visitor'),/your cities/);
});

test('a real settler founds, commissions a builder, and harvests a nearby surveyed supply',()=>{
  let s=createGame(['Pacific','Inland'],'sd',{seed:132});
  const advance=()=>{
    const round=s.round;
    do{s=applyAction(s,s.turn,{type:'end'});}while(s.phase==='playing'&&s.round===round);
  };
  s=applyAction(s,0,{type:'found',unit:s.units[0].id});
  const city=s.cities[0];
  const site=neighbors(city.tile).find(id=>s.board[id].resource && s.board[id].owner===0);
  assert.ok(site);
  s=applyAction(s,0,{type:'produce',city:city.id,item:'builder'});
  for(let i=0;i<8&&!s.units.some(u=>u.type==='builder'&&u.seat===0);i++)advance();
  const builder=s.units.find(u=>u.type==='builder'&&u.seat===0);
  s=applyAction(s,0,{type:'move',unit:builder.id,tile:site});
  if(s.units.find(u=>u.id===builder.id).moves===0)advance();
  const item=RESOURCES[s.board[site].resource].improvement;
  s=applyAction(s,0,{type:'improve',unit:builder.id,item});
  const key=s.board[site].resource;
  assert.equal(getResourceLedger(s,0)[key].income,1);
  advance();advance();
  assert.ok(s.players[0].stockpile[key]>=2);
  const other=projectForSeat(s,1);
  assert.equal(other.players[0].stockpile,undefined);
  s=applyAction(s,0,{type:'shipment',resource:key,market:'sell'});
  assert.equal(s.players[0].lastShipment,s.round);
  assert.ok(!projectForSeat(s,1).log.some(e=>e.type==='shipment'&&e.seat===0));
});
