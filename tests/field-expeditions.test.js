import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,applyAction,campaignView,getMap,getStats,hexDistance} from '../docs/rules.js';
import {fieldReport} from '../docs/field-expeditions.js';

function start(map='la'){
  let s=createGame([{name:'West'},{name:'East'}],map,{seed:624101,mapSize:'large'});
  s=applyAction(s,0,{type:'found',unit:s.units[0].id});
  s.players[0].capital=40;
  s.units.push({id:'field-team',seat:0,type:'scout',tile:s.cities[0].tile,moves:3,maxMoves:3,hp:65,maxHp:65});
  return s;
}
const scout=s=>s.units.find(u=>u.id==='field-team');
const read=s=>fieldReport(s,scout(s),getMap(s),hexDistance);
const order=(s,item,study='transect',extra={})=>applyAction(s,0,{type:'fieldStudy',unit:'field-team',item,study,step:read(s).mission?.notes.length||0,...extra});
const travel=(s,tile)=>{const next=structuredClone(s);scout(next).tile=tile;scout(next).moves=3;return next;};

test('a scout commissions, observes contrasting terrain, returns and collects a private one-time field report',()=>{
  const s=start(),city=s.cities[0],map=getMap(s);
  let next=order(s,'start');assert.equal(next.players[0].capital,37);assert.equal(s.players[0].fieldCrews,undefined);
  next=order(next,'sample');assert.throws(()=>order(next,'sample','transect',{step:0}));
  const site=map.tiles.find(t=>!['ocean','mountains',map.byId[city.tile].terrain].includes(t.terrain)&&hexDistance(t.id,city.tile)>2);
  next=order(travel(next,site.id),'sample');assert.throws(()=>order(next,'file'));
  const science=next.players[0].science;next=order(travel(next,city.tile),'file');assert.equal(next.players[0].science,science+6);
  assert.throws(()=>order(next,'start'));assert.equal(campaignView(next,1).players[0].fieldReports,undefined);
});

test('each regional commission uses its own landscape, field brief and actual payout',()=>{
  for(const [mapId,key,first,second] of [['la','basin','hills','urban'],['sf','bay','coast','urban'],['sd','headland','coast','forest']]){
    let s=start(mapId);const home=s.cities[0].tile,map=getMap(s);
    assert.ok(read(s).open.some(([id])=>id===key));assert.throws(()=>order(s,'start',key==='bay'?'basin':'bay'));
    s=order(s,'start',key);
    for(const type of [first,second])s=order(travel(s,map.tiles.find(t=>t.terrain===type).id),'sample',key);
    const old=s.players[0],reward=read(s).spec.reward;
    s=order(travel(s,home),'file',key);
    for(const [stat,value] of Object.entries(reward))assert.equal(s.players[0][stat],old[stat]+value);
  }
});

test('a catchment joins observations through charted fresh water and rejects separate networks',()=>{
  const s=start(),unit=scout(s),mission=order(s,'start','watershed'),spec=read(mission).spec;
  const graph={a:['r1'],b:['r3'],c:['lake'],r1:['r2','a'],r2:['r1','r3'],r3:['r2','b'],lake:['c']};
  const map={byId:Object.fromEntries(Object.keys(graph).map(id=>[id,{id,terrain:graph[id].length && ['a','b','c'].includes(id)?'coast':'ocean',waterway:id.startsWith('r')?'river':id==='lake'?'lake':null}])),neighbors:id=>graph[id]};
  const probe=(id,known)=>spec.sample({state:{...mission,intel:{seat:0,visible:[],explored:known}},map,unit,tile:map.byId[id],notes:[{tile:'a'}],distance:()=>3});
  assert.ok(probe('b',Object.keys(graph)));assert.ok(!probe('c',Object.keys(graph)));
  assert.ok(!probe('b',Object.keys(graph).filter(id=>id!=='r2')));
});

test('an agricultural trial compares a friendly working site, credits the receiving city and rejects a pillaged site',()=>{
  let s=start();const city=s.cities[0],a=city.tile,b=getMap(s).neighbors(a).find(id=>getMap(s).byId[id].terrain!=='ocean');
  s=order(s,'start','fieldTrial');s.board[a]={...s.board[a],owner:0,improvement:'farm',pillaged:true};
  assert.throws(()=>order(s,'sample','fieldTrial'));s.board[a].pillaged=false;
  s=order(s,'sample','fieldTrial');s=order(travel(s,b),'sample','fieldTrial');const food=s.cities[0].food;
  s=order(travel(s,a),'file','fieldTrial');assert.equal(s.cities[0].food,food+7);assert.equal(s.players[0].food,undefined);
});

test('a tide staff requires a coastal sea site and a later reading at that same location',()=>{
  let s=start('sd');const map=getMap(s);
  const shore=map.tiles.filter(t=>t.terrain==='coast' && map.neighbors(t.id).some(id=>map.byId[id].terrain==='ocean' && !map.byId[id].waterway));
  s=order(s,'start','tideWatch');s=order(travel(s,shore[0].id),'sample','tideWatch');
  assert.throws(()=>order(s,'sample','tideWatch'));s.round++;
  assert.throws(()=>order(travel(s,shore[1].id),'sample','tideWatch'));s=order(s,'sample','tideWatch');
  assert.deepEqual(read(s).mission.notes.map(n=>n.round),[1,2]);
});

test('deposit assays pay either research or exactly two of the actual sampled good',()=>{
  let s=start();const home=s.cities[0].tile;
  s=order(s,'start','assay');s.board[home]={...s.board[home],resource:'grain'};assert.throws(()=>order(s,'sample','assay'));
  s.board[home].resource='stone';s=order(s,'sample','assay');
  const scientific=order(s,'file','assay'),material=order(s,'deliverOre','assay');
  assert.equal(scientific.players[0].science,s.players[0].science+8);
  assert.equal(material.players[0].science,s.players[0].science);assert.equal(material.players[0].stockpile.stone,(s.players[0].stockpile?.stone||0)+2);
  assert.throws(()=>order(material,'file','assay'));
});

test('a filed two-plot habitat pays recurring culture only while both plots remain intact',()=>{
  let s=start();const map=getMap(s),home=s.cities[0].tile;
  const a=map.tiles.find(t=>t.terrain==='forest' && t.id!==home && map.neighbors(t.id).some(id=>id!==home && ['forest','hills'].includes(map.byId[id].terrain)));
  const b=map.neighbors(a.id).find(id=>id!==home && ['forest','hills'].includes(map.byId[id].terrain));
  for(const id of [a.id,b])s.board[id]={owner:0,level:0};
  s=order(s,'start','corridor');
  for(const id of [a.id,b])s=order(travel(s,id),'sample','corridor');
  const before=getStats(s,0).cultureIncome;s=order(travel(s,home),'file','corridor');
  assert.equal(getStats(s,0).cultureIncome,before+2);s.board[b].improvement='mine';assert.equal(getStats(s,0).cultureIncome,before);
});
