import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { handleRoom } from "../lib/room-service.js";
import {createClassicGame} from './classic-game.js';
import * as rules from "../docs/rules.js";

function roomFixture(t) {
  const sqlite = new DatabaseSync(":memory:");
  t.after(() => sqlite.close());
  sqlite.exec(readFileSync(new URL("../drizzle/0000_game_rooms.sql", import.meta.url), "utf8"));
  const db = {
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      return {bind(...args) {
        return {
          async first() { return statement.get(...args) || null; },
          async run() { return {meta: {changes: statement.run(...args).changes}}; },
        };
      }};
    }
  };
  async function request(method, payload, token) {
    const url = new URL("https://game.test/api/room");
    const headers = new Headers();
    if (token) headers.set("Authorization", "Bearer " + token);
    let body;
    if (method === "GET") {
      for (const [key, value] of Object.entries(payload)) url.searchParams.set(key, value);
    } else {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(payload);
    }
    const response = await handleRoom(new Request(url, {method, headers, body}), db);
    const value = response.status === 204 ? null : await response.json();
    return {status: response.status, value};
  }
  async function call(method, payload, token, expected = 200) {
    const {status, value} = await request(method, payload, token);
    assert.equal(status, expected, JSON.stringify(value?.error));
    return value;
  }
  return {sqlite, request, call};
}

async function twoPlayers(fixture) {
  const {call} = fixture;
  const host = await call("POST", {op:"create", name:"Downtown"}, null, 201);
  const code = host.room.code;
  const guest = await call("POST", {op:"join", code, name:"海岸玩家"});
  return {
    code, host:host.token, guest:guest.token, revision:guest.room.revision,
    read: async token => (await call("GET", {code}, token)).room,
    start: async () => (await call("POST", {op:"start", code, revision:guest.room.revision}, host.token)).room,
    act: async (token, revision, action, expected=200) =>
      call("POST", {op:"action",code,revision,action}, token, expected),
  };
}

test("room ownership and capacity stay consistent across simultaneous joins", async t => {
  const fixture = roomFixture(t);
  const host = await fixture.call("POST", {op:"create",name:"Host"}, null, 201);
  const code = host.room.code;
  await fixture.call("GET", {code}, undefined, 401);
  const replies = await Promise.all(["A","B","C","D","E"].map(name =>
    fixture.request("POST", {op:"join",name,code})));
  assert.deepEqual(replies.map(x=>x.status).sort(), [200,200,200,409,409]);
  const accepted = replies.filter(x=>x.status===200).map(x=>x.value);
  assert.equal(new Set(accepted.map(x=>x.room.you)).size,3);
  const {room} = await fixture.call("GET", {code}, host.token);
  assert.equal(room.players.length,4);
  assert.ok(room.players.every(p=>!("hash" in p) && !("token" in p)));
  await fixture.call("POST", {op:"start",code,revision:room.revision}, accepted[0].token,403);
  const record = fixture.sqlite.prepare("SELECT members FROM game_rooms WHERE code = ?").get(code);
  assert.ok(!record.members.includes(host.token));
});

test("independent seats recover their own view of the same round after reconnect and a stale order cannot run twice", async t => {
  const fixture=roomFixture(t), seats=await twoPlayers(fixture);
  const initial=await seats.start();
  await seats.act(seats.guest, initial.revision, {type:"end"},403);
  const request={op:"action",code:seats.code,revision:initial.revision,action:{type:"end"}};
  const writes=await Promise.all([fixture.request("POST",request,seats.host),fixture.request("POST",request,seats.host)]);
  assert.deepEqual(writes.map(x=>x.status).sort(),[200,409]);
  const current=await seats.read(seats.guest);
  assert.equal(current.revision,initial.revision+1);
  assert.equal(current.game.turn,1);
  const returned=await seats.act(seats.guest,current.revision,{type:"end"});
  assert.equal(returned.room.game.turn,0);
  assert.equal(returned.room.game.round,initial.game.round+1);
  const reloaded=await seats.read(seats.host);
  assert.equal(reloaded.game.round,returned.room.game.round);
  assert.deepEqual(returned.room.game,(await seats.read(seats.guest)).game);
  assert.deepEqual(reloaded.game,(await seats.read(seats.host)).game);
  assert.equal(reloaded.game.intel.seat,0);
});

test("each seat issues unit and city orders through the server and observes the other seat's changes", async t => {
  const fixture=roomFixture(t), seats=await twoPlayers(fixture);
  let room=await seats.start();
  assert.equal(room.game.rulesVersion,3);
  for (const [seat,token,observer] of [[0,seats.host,seats.guest],[1,seats.guest,seats.host]]) {
    room=await seats.read(token);
    const unit=room.game.units.find(u=>u.seat===seat && u.type==="settler");
    
    const options=rules.getUnitOptions(room.game,unit.id);
    const dst=options.moves[0];
    assert.ok(dst);
    const wrongOwner=await fixture.request("POST",{op:"action",code:seats.code,revision:room.revision,action:{type:"move",unit:"foreign-unit",tile:dst}},token);
    assert.equal(wrongOwner.status,422);
    assert.equal((await seats.read(token)).revision,room.revision);
    const site=options.moves.find(id=>rules.getSettlementAssessment(room.game,unit.id,id).canFoundThisTurn);
    if(site){
      room=(await seats.act(token,room.revision,{type:"move",unit:unit.id,tile:site})).room;
      assert.equal(room.game.units.find(u=>u.id===unit.id).tile,site);
    }
    room=(await seats.act(token,room.revision,{type:"found",unit:unit.id})).room;
    const city=room.game.cities.find(c=>c.seat===seat);
    room=(await seats.act(token,room.revision,{type:"produce",city:city.id,item:"workshop"})).room;
    const other=await seats.read(observer);
    assert.equal(other.revision,room.revision);
    assert.ok(other.game.cities.every(c=>c.seat!==seat || !c.queue));
    assert.ok(other.game.log.every(e=>e.seat!==seat || e.type!=="produce"));
    room=(await seats.act(token,room.revision,{type:"end"})).room;
  }
  assert.equal(room.game.round,2);
  assert.ok(room.game.cities.every(c=>c.queue?.item==="workshop" && c.queue.progress>0));
  assert.deepEqual((await seats.read(seats.guest)).game,room.game);
});

function legacyGame() {
  // A saved in-progress match from the district-only game, before units and cities existed.
  const board=Object.fromEntries(rules.TILES.map(t=>[t.id,{owner:null,level:0}]));
  for(const [seat,tiles] of [[0,["11,7","10,7","11,8"]],[1,["4,7","5,7","5,8"]]]) {
    tiles.forEach((tile,index)=>{board[tile]={owner:seat,level:index===0?1:0};});
  }
  board["12,7"]={owner:0,level:2};
  return {
    players:[
      {name:"Downtown",bot:false,faction:0,color:"#efbb62",capital:26,influence:13,score:13},
      {name:"海岸玩家",bot:false,faction:1,color:"#69b7c7",capital:15,influence:11,score:9}
    ],
    board,turn:1,round:4,actionsLeft:1,phase:"playing",winners:[],
    log:[{round:4,seat:0,type:"develop",tile:"12,7",text:"California Republic developed Boyle Heights."}],
  };
}

test("a pre-tactics room resumes from its current round and becomes a persistent tactical match", async t => {
  const fixture=roomFixture(t), seats=await twoPlayers(fixture);
  const legacy=legacyGame();
  fixture.sqlite.prepare("UPDATE game_rooms SET game=? WHERE code=?").run(JSON.stringify(legacy),seats.code);
  const read=await seats.read(seats.guest);
  assert.equal(read.game.round,4);
  assert.equal(read.game.turn,1);
  assert.equal(read.game.phase,"playing");
  assert.equal(read.game.players[0].capital,undefined);
  assert.equal((await seats.read(seats.host)).game.players[0].capital,26);
  assert.equal(read.game.players[1].name,"海岸玩家");
  assert.equal(read.game.board["12,7"].owner,null);
  assert.equal((await seats.read(seats.host)).game.board["12,7"].level,2);
  assert.equal(read.game.rulesVersion,3);
  assert.ok(read.game.units.some(u=>u.type==="settler" && u.seat===1));
  assert.ok(read.game.cities.every(c=>c.seat!==0));
  assert.deepEqual(rules.migrateGame(read.game),read.game);
  const played=(await seats.act(seats.guest,read.revision,{type:"end"})).room;
  const stored=JSON.parse(fixture.sqlite.prepare("SELECT game FROM game_rooms WHERE code=?").get(seats.code).game);
  assert.deepEqual(rules.campaignView(stored,1),played.game);
  const finished={...legacy,phase:"finished",winners:[1]};
  assert.deepEqual(rules.migrateGame(finished).winners,[1]);
  assert.equal(rules.migrateGame(finished).phase,"finished");
});

test("lost responses to create or join can be retried with the same device ticket", async t => {
  const fixture=roomFixture(t);
  const create={op:"create",name:"Host",ticket:"a1".repeat(24)};
  const issued=await fixture.call("POST",create,undefined,201);
  const retried=await fixture.call("POST",create);
  assert.equal(retried.room.code,issued.room.code);
  assert.equal(retried.token,issued.token);
  const join={op:"join",name:"Guest",code:issued.room.code,ticket:"b2".repeat(24)};
  const joined=await fixture.call("POST",join);
  const rejoined=await fixture.call("POST",join);
  assert.equal(rejoined.room.revision,joined.room.revision);
  assert.equal(rejoined.room.you,joined.room.you);
  assert.equal(rejoined.room.players.length,2);
  const query={code:joined.room.code,revision:joined.room.revision};
  await fixture.call("GET",query,undefined,401);
  assert.equal(await fixture.call("GET",query,joined.token,204),null);
});

test("a saved tactical room keeps units, damage and production when receiving the research upgrade", async t => {
  const fixture=roomFixture(t), seats=await twoPlayers(fixture);
  let room=await seats.start();
  const old=createClassicGame(["Downtown","海岸玩家"]);
  fixture.sqlite.prepare("UPDATE game_rooms SET game=? WHERE code=?").run(JSON.stringify(old),seats.code);
  room=await seats.read(seats.host);
  const city=room.game.cities.find(c=>c.seat===0);
  const unit=room.game.units.find(u=>u.seat===0 && u.type==="melee");
  room=(await seats.act(seats.host,room.revision,{type:"produce",city:city.id,item:"workshop"})).room;
  const v2=JSON.parse(fixture.sqlite.prepare("SELECT game FROM game_rooms WHERE code=?").get(seats.code).game);
  v2.rulesVersion=2;
  v2.units.find(u=>u.id===unit.id).hp=65;
  for(const p of v2.players) {
    delete p.science;delete p.technologies;delete p.research;
  }
  fixture.sqlite.prepare("UPDATE game_rooms SET game=? WHERE code=?").run(JSON.stringify(v2),seats.code);
  const migrated=await seats.read(seats.host);
  assert.equal(migrated.game.rulesVersion,3);
  assert.deepEqual(migrated.game.units,v2.units.filter(u=>u.seat===0));
  assert.deepEqual(migrated.game.cities,v2.cities.filter(c=>c.seat===0));
  assert.ok(Number.isFinite(migrated.game.players[0].science));
  assert.deepEqual(migrated.game.players[0].technologies,[]);
  assert.deepEqual(rules.migrateGame(migrated.game),migrated.game);
  const researched=(await seats.act(seats.host,migrated.revision,{type:"research",item:"industry"})).room;
  assert.equal(researched.game.players[0].research,"industry");
  await seats.act(seats.host,migrated.revision,{type:"research",item:"agronomy"},409);
  assert.equal((await seats.read(seats.guest)).game.players[0].research,undefined);
  assert.deepEqual((await seats.read(seats.host)).game,researched.game);
});

test("a host chooses the region before inviting players and both seats recover that map", async t => {
  const fixture=roomFixture(t);
  await fixture.call("POST",{op:"create",name:"Host",mapId:"elsewhere"},null,400);
  const host=await fixture.call("POST",{op:"create",name:"Host",mapId:"sf"},null,201);
  assert.equal(host.room.mapId,"sf");
  const code=host.room.code;
  const guest=await fixture.call("POST",{op:"join",code,name:"Guest",mapId:"la"});
  assert.equal(guest.room.mapId,"sf");
  const {room}=await fixture.call("POST",{op:"start",code,mapId:"la",revision:guest.room.revision},host.token);
  assert.equal(room.game.mapId,"sf");
  assert.equal(room.game.cities.length,0);
  assert.equal(room.game.units.length,1);
  const visitor=(await fixture.call("GET",{code},guest.token)).room;
  assert.equal(visitor.game.mapId,room.game.mapId);
  assert.equal(visitor.game.units.length,1);
  assert.notEqual(visitor.game.units[0].tile,room.game.units[0].tile);
});

test("host map sizes persist through lobby, territorial orders and reconnection for both seats", async t=>{
  const fixture=roomFixture(t);
  await fixture.call('POST',{op:'create',name:'Host',mapSize:'invalid'},null,400);
  for(const [region,size] of [['la','large'],['sf','grand'],['sd','epic']]) {
    const host=await fixture.call('POST',{op:'create',name:'Host',mapId:region,mapSize:size},null,201);
    const code=host.room.code;
    const guest=await fixture.call('POST',{op:'join',code,name:'访客',mapSize:'standard'});
    assert.equal(guest.room.mapSize,size);
    let {room}=await fixture.call('POST',{op:'start',code,revision:guest.room.revision,mapSize:'standard'},host.token);
    const count=rules.getMap(region,size).tiles.length;
    assert.ok(count>rules.getMap(region).tiles.length);
    assert.equal(Object.keys(room.game.board).length,count);
    for(const [seat,token] of [[0,host.token],[1,guest.token]]) {
      room=(await fixture.call('GET',{code},token)).room;
      assert.equal(room.game.mapSize,size);
      assert.equal(rules.getMap(room.game).tiles.length,count);
      const founder=room.game.units.find(unit=>unit.seat===seat && unit.type==='settler');
      room=(await fixture.call('POST',{op:'action',code,revision:room.revision,action:{type:'found',unit:founder.id}},token)).room;
      assert.equal(room.game.cities.find(city=>city.seat===seat).tile,founder.tile);
      await fixture.call('POST',{op:'action',code,revision:room.revision,action:{type:'end'}},token);
    }
    const resumed=(await fixture.call('POST',{op:'join',code,name:'Host',ticket:host.token})).room;
    assert.equal(resumed.game.round,2);
    assert.equal(resumed.game.mapSize,size);
    assert.equal(Object.keys(resumed.game.board).length,count);
  }
});

test('both seats see different server projections on every region, including create, action and conditional poll',async t=>{
  for(const mapId of ['la','sf','sd']){
    const fixture=roomFixture(t);
    const host=await fixture.call('POST',{op:'create',name:'North',mapId},null,201);
    const code=host.room.code;
    const guest=await fixture.call('POST',{op:'join',name:'南方',code});
    let {room}=await fixture.call('POST',{op:'start',code,revision:guest.room.revision},host.token);
    const visitor=(await fixture.call('GET',{code},guest.token)).room.game;
    assert.ok(!('seed' in room.game) && !('nextId' in room.game) && !('exploration' in room.game));
    assert.equal(room.game.units.length,1);
    assert.equal(visitor.units.length,1);
    assert.ok(!room.game.intel.visible.includes(visitor.units[0].tile));
    assert.ok(!visitor.intel.explored.includes(room.game.units[0].tile));
    assert.equal(room.game.players[1].capital,undefined);
    const full=JSON.parse(fixture.sqlite.prepare('SELECT game FROM game_rooms WHERE code=?').get(code).game);
    const target=visitor.units[0].tile;
    full.board[target].resource='classified';full.players[1].surveyEnabled=true;
    full.players[1].stockpile={classified:4000};
    full.barbarians={camps:[{id:'hidden-camp',tile:target}],parties:[{id:'visible-party',tile:room.game.units[0].tile,type:'lookout',hp:30,maxHp:30,campId:'hidden-camp'}]};
    full.wonderRegistry={ucla:'commissioned'};
    fixture.sqlite.prepare('UPDATE game_rooms SET game=? WHERE code=?').run(JSON.stringify(full),code);
    room=(await fixture.call('GET',{code},host.token)).room;
    assert.ok(!JSON.stringify(room.game).includes('classified'));
    assert.ok(!JSON.stringify(room.game).includes('hidden-camp'));
    assert.equal(room.game.barbarians.parties[0].campId,undefined);
    assert.deepEqual(room.game.wonderRegistry,{ucla:'commissioned'});
    await fixture.call('POST',{op:'action',code,revision:room.revision,action:{type:'attack',unit:room.game.units[0].id,tile:target}},host.token,422);
    const latest=await fixture.call('POST',{op:'action',code,revision:room.revision,action:{type:'end'}},host.token);
    assert.ok(!JSON.stringify(latest.room.game).includes('classified'));
    assert.equal(await fixture.call('GET',{code,revision:latest.room.revision},guest.token,204),null);
    assert.equal((await fixture.call('GET',{code},guest.token)).room.game.board[target].resource,'classified');
  }
});

test("an incoming strike survives polling, a lost response and reconnect without disclosing a fogged gun position", async t => {
  const fixture=roomFixture(t), seats=await twoPlayers(fixture);
  const {revision}=await seats.start();
  const game=JSON.parse(fixture.sqlite.prepare('SELECT game FROM game_rooms WHERE code=?').get(seats.code).game);
  // Establish a late-game encounter. The order and every client projection go through HTTP.
  const [left,right]=game.units;
  game.units=[
    {...left,type:'artillery',tile:'7,6',hp:75,maxHp:75},
    {...left,id:'spotter',type:'settler',tile:'10,7'},
    {...right,type:'melee',tile:'10,6',hp:5,maxHp:100},
    {...right,id:'pioneer',tile:'14,4'}
  ];
  game.barbarians={camps:[],parties:[],nextPiece:1};game.log=[];
  fixture.sqlite.prepare('UPDATE game_rooms SET game=? WHERE code=?').run(JSON.stringify(game),seats.code);
  assert.deepEqual((await seats.read(seats.guest)).game.intel.battles,[]);
  const action={type:'attack',unit:left.id,tile:'10,6'};
  const first=await seats.act(seats.host,revision,action);
  const sent=first.room.game.intel.battles;
  assert.equal(sent[0].attacker.tile,'7,6');assert.equal(sent[0].targetLost,true);
  await seats.act(seats.host,revision,action,409);
  const incoming=(await seats.read(seats.guest)).game;
  assert.equal(incoming.intel.battles.length,1);
  const [hit]=incoming.intel.battles;
  assert.deepEqual(hit.attacker,{kind:'unknown'});
  assert.equal(hit.id,1);assert.equal(hit.damage,5);
  assert.equal(hit.target.seat,1);assert.equal(hit.target.tile,'10,6');
  assert.equal(hit.target.type,'melee');assert.equal(hit.target.hpAfter,0);
  assert.equal(hit.outcome,'destroyed');
  assert.ok(!incoming.units.some(u=>u.tile==='7,6' || u.id===right.id));
  assert.ok(!incoming.log.some(e=>e.type==='attack' || e.type==='observation'));
  assert.equal(incoming.battleReports,undefined);
  await fixture.call('GET',{code:seats.code,revision:first.room.revision},seats.guest,204);
  const afterEnd=await seats.act(seats.host,first.room.revision,{type:'end'});
  const rejoin=await fixture.call('POST',{op:'join',code:seats.code,name:'Returning',ticket:seats.guest});
  assert.equal(rejoin.room.revision,afterEnd.room.revision);
  assert.deepEqual(rejoin.room.game.intel.battles,[hit]);
  assert.deepEqual((await seats.read(seats.host)).game.intel.battles,sent);
});

test('private production opens on civic completion and rejects guessed future projects over HTTP',async t=>{
  const fixture=roomFixture(t), seats=await twoPlayers(fixture);
  let room=await seats.start();
  room=(await seats.act(seats.host,room.revision,{type:'found',unit:room.game.units.find(u=>u.seat===0).id})).room;
  const city=room.game.cities.find(c=>c.seat===0);
  const list=room=>rules.getProductionOptions(room.game,city.id).map(p=>p.item);
  assert.ok(!list(room).includes('neighborhood'));
  assert.ok(!list(room).includes('ucla'));
  for(const item of ['neighborhood','ucla','artillery','shipyard','destroyer']) {
    await seats.act(seats.host,room.revision,{type:'produce',city:city.id,item},422);
  }
  assert.equal((await seats.read(seats.host)).revision,room.revision);
  room=(await seats.act(seats.host,room.revision,{type:'civic',item:'publicWorks'})).room;
  assert.equal(room.game.players[0].civic,'publicWorks');assert.ok(!list(room).includes('neighborhood'));
  for(let n=0;n<10 && !room.game.players[0].civics.includes('publicWorks');n++){
    room=(await seats.act(seats.host,room.revision,{type:'end'})).room;
    await seats.act(seats.guest,room.revision,{type:'end'});
    room=await seats.read(seats.host);
  }
  assert.ok(list(room).includes('neighborhood'));assert.ok(!list(room).includes('ucla'));
  const produced=(await seats.act(seats.host,room.revision,{type:'produce',city:city.id,item:'neighborhood'})).room;
  assert.equal(produced.game.cities.find(c=>c.id===city.id).queue.item,'neighborhood');
  const guest=await seats.read(seats.guest);
  assert.ok(!rules.getProductionOptions(guest.game,city.id).length);
});

test('fixed room seats reserve each human team and computer level across competing joins and reconnects', async t => {
  const f = roomFixture(t);
  const seats = [{kind:'human',team:0},{kind:'bot',team:1,difficulty:'hard'},
    {kind:'human',team:0},{kind:'bot',team:1,difficulty:'easy'}];
  const host = await f.call('POST',{op:'create',name:'Coast',mapId:'sf',mapSize:'large',seats},null,201);
  const {code} = host.room;
  assert.equal(host.room.configured,true);
  assert.equal(host.room.canStart,false);
  assert.deepEqual(host.room.players.map(p=>[p.id,p.team,p.bot,p.open,p.difficulty]),[
    [0,0,false,false,undefined],[1,1,true,false,'hard'],[2,0,false,true,undefined],[3,1,true,false,'easy']]);
  await f.call('POST',{op:'start',code,revision:1},host.token,409);
  const concurrent = await Promise.all(['A','B'].map(name=>f.request('POST',{op:'join',code,name,team:3,seat:1,difficulty:'hard'})));
  assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);
  const guest = concurrent.find(r=>r.status===200).value;
  assert.equal(guest.room.you,2);
  assert.equal(guest.room.canStart,true);
  assert.equal(guest.room.players[2].team,0);
  await f.call('POST',{op:'start',code,revision:guest.room.revision,seats},guest.token,403);
  const started = (await f.call('POST',{op:'start',code,revision:guest.room.revision,seats:[]},host.token)).room;
  assert.deepEqual(started.game.teams,[0,1,0,1]);
  assert.deepEqual(started.game.players.map(p=>p.bot),[false,true,false,true]);
  assert.equal(started.mapSize,'large');
  assert.equal(started.canStart,false);
  const restored = await f.call('POST',{op:'join',code,name:'Reconnect',ticket:guest.token});
  assert.equal(restored.room.you,2);
  assert.equal(restored.room.game.intel.seat,2);
  assert.equal(restored.room.game.players[0].stockpile,undefined);
  assert(!JSON.stringify(restored.room).includes('"hash"'));
});

test('room layouts reject invalid teams, host type, capacity and computer levels', async t => {
  const f = roomFixture(t);
  const human={kind:'human',team:0}, bot={kind:'bot',team:1,difficulty:'normal'};
  for(const seats of [null,[human],[bot,human],[human,{kind:'bot',team:0}],[human,{...bot,team:4}],
      [human,{...bot,team:'1'}],[human,{...bot,difficulty:'unlimited'}],[human,{...bot,kind:'visitor'}],
      [human,bot,bot,bot,human]]) {
    await f.call('POST',{op:'create',name:'Host',seats},null,400);
  }
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM game_rooms').get().n,0);
});

test('server computers execute exactly one authoritative order sequence despite duplicate ends and concurrent polls', async t => {
  const f = roomFixture(t);
  const seats=[{kind:'human',team:0},{kind:'bot',team:1,difficulty:'easy'},
    {kind:'bot',team:2,difficulty:'hard'},{kind:'bot',team:3}];
  const host = await f.call('POST',{op:'create',name:'Host',seats},null,201);
  const {code} = host.room;
  const getRow=()=>f.sqlite.prepare('SELECT revision,members,game FROM game_rooms WHERE code=?').get(code);
  assert.equal(host.room.canStart,true);
  await f.call('POST',{op:'join',code,name:'Intruder'},null,409);
  let room=(await f.call('POST',{op:'start',code,revision:host.room.revision},host.token)).room;
  assert.equal(room.players[3].difficulty,'normal');
  for(let n=0;n<32 && room.game.turn!==0;n++){
    room=(await f.call('GET',{code,revision:room.revision},host.token)).room;
  }
  assert.equal(room.game.turn,0);
  const founder=room.game.units.find(u=>u.seat===0);
  room=(await f.call('POST',{op:'action',code,revision:room.revision,action:{type:'found',unit:founder.id}},host.token)).room;
  let expected=rules.applyAction(JSON.parse(getRow().game),0,{type:'end'});
  for(let i=0;i<200 && expected.phase==='playing' && expected.turn!==0;i++){
    const seat=expected.turn;
    try{expected=rules.applyAction(expected,seat,rules.chooseBotAction(expected,seats[seat].difficulty || 'normal'));}
    catch{expected=rules.applyAction(expected,seat,{type:'end'});}
  }
  assert.equal(expected.turn,0);
  const payload={op:'action',code,revision:room.revision,action:{type:'end'},seat:1,difficulty:'easy'};
  const writes=await Promise.all([f.request('POST',payload,host.token),f.request('POST',payload,host.token)]);
  assert.deepEqual(writes.map(r=>r.status).sort(),[200,409]);
  room=writes.find(r=>r.status===200).value.room;
  for(let n=0;n<32 && room.game.turn!==0;n++){
    const polls=await Promise.all([0,1].map(()=>f.request('GET',{code,revision:room.revision},host.token)));
    for(const poll of polls){
      assert([200,204].includes(poll.status));
      if(poll.value?.room.revision>room.revision)room=poll.value.room;
    }
  }
  assert.equal(room.game.turn,0);
  assert.equal(room.game.round,2);
  assert.deepEqual(JSON.parse(getRow().game),expected);
  assert.equal(JSON.parse(getRow().members)[0].botTurn,undefined);
  assert.equal(room.game.players[1].capital,undefined);
  assert.equal(room.game.players[2].stockpile,undefined);
  assert.equal(room.game.exploration,undefined);
  await f.call('GET',{code,revision:room.revision},host.token,204);
  const rejoined=await f.call('POST',{op:'join',code,name:'Restored',ticket:host.token});
  assert.deepEqual(rejoined.room,room);
});

test('an eliminated human watching a saved computer turn can finish the campaign after reconnecting', async t => {
  const f=roomFixture(t), seats=[{kind:'human',team:0},{kind:'bot',team:1},{kind:'bot',team:2}];
  const host=await f.call('POST',{op:'create',name:'Spectator',seats},null,201);
  const {code}=host.room;
  const start=(await f.call('POST',{op:'start',code,revision:host.room.revision},host.token)).room;
  const row=f.sqlite.prepare('SELECT game,members FROM game_rooms WHERE code=?').get(code);
  const game=JSON.parse(row.game),members=JSON.parse(row.members);
  delete game.victoryMode; // This saved campaign uses the historical round-limit rules.
  game.round=rules.MAX_ROUNDS;game.turn=1;game.players[0].eliminated=true;
  game.units=game.units.filter(unit=>unit.seat!==0);
  members[0].botTurn={round:game.round,seat:1,orders:192};
  f.sqlite.prepare('UPDATE game_rooms SET game=?,members=? WHERE code=?').run(JSON.stringify(game),JSON.stringify(members),code);
  await f.call('GET',{code,revision:start.revision},undefined,401);
  assert.equal(f.sqlite.prepare('SELECT revision FROM game_rooms WHERE code=?').get(code).revision,start.revision);
  await f.call('POST',{op:'action',seat:1,code,revision:start.revision,action:{type:'end'}},host.token,403);
  let room=start;
  for(let i=0;i<40 && room.phase!=='finished';i++)room=(await f.call('GET',{code,revision:room.revision},host.token)).room;
  assert.equal(room.phase,'finished');assert.equal(room.game.round,rules.MAX_ROUNDS);
  assert(!room.game.winners.includes(0));
  await f.call('GET',{code,revision:room.revision},host.token,204);
});

test('a configured bot can win initiative and take its opening turn before the guest and host', async t => {
  const f=roomFixture(t), teams=[0,1,2];
  const seats=[{kind:'human',team:0},{kind:'bot',team:1,difficulty:'normal'},{kind:'human',team:2}];
  const roster=[{name:'Host'},{bot:true},{name:'Guest'}];
  const seed=Array.from({length:32},(_,n)=>n).find(seed=>
    rules.createGame(roster,'sf',{seed,teams,drawInitiative:true}).firstSeat===1);
  assert.notEqual(seed,undefined);
  const secureRandom=crypto.getRandomValues.bind(crypto);
  t.mock.method(crypto,'getRandomValues',bytes=>
    bytes instanceof Uint32Array && bytes.length===1 ? bytes.fill(seed) : secureRandom(bytes));
  const host=await f.call('POST',{op:'create',name:'Host',seats,mapId:'sf'},null,201);
  const {code}=host.room;
  const guest=await f.call('POST',{op:'join',code,name:'Guest'});
  let room=(await f.call('POST',{op:'start',code,revision:guest.room.revision},host.token)).room;
  assert.equal(room.game.firstSeat,1);
  for(let i=0;i<32 && room.game.turn===1;i++)room=(await f.call('GET',{code,revision:room.revision},guest.token)).room;
  assert.equal(room.game.turn,2);assert.equal(room.game.round,1);
  const raw=JSON.parse(f.sqlite.prepare('SELECT game FROM game_rooms WHERE code=?').get(code).game);
  assert(raw.cities.some(city=>city.originalSeat===1));
  assert(!raw.cities.some(city=>city.originalSeat===0));
  await f.call('POST',{op:'action',code,revision:room.revision,action:{type:'end'}},host.token,403);
  room=(await f.call('POST',{op:'action',code,revision:room.revision,action:{type:'end'}},guest.token)).room;
  assert.equal(room.game.turn,0);assert.equal(room.game.round,1);
});

test('a new fixed allied room opens commands for both authenticated teammates',async t=>{
  const f=roomFixture(t),seats=[{kind:'human',team:0},{kind:'human',team:0},{kind:'human',team:1}];
  const host=await f.call('POST',{op:'create',name:'Host',seats},null,201),code=host.room.code;
  const friend=await f.call('POST',{op:'join',code,name:'Friend'}),other=await f.call('POST',{op:'join',code,name:'Other'});
  let room=(await f.call('POST',{op:'start',code,revision:other.room.revision},host.token)).room;
  if(room.game.teamPhase.team===1)room=(await f.call('POST',{op:'action',code,revision:room.revision,action:{type:'end'}},other.token)).room;
  const view=(await f.call('GET',{code},friend.token)).room;
  assert.equal(view.game.turn,1);assert.equal(view.game.teamPhase.team,0);
  const settler=view.game.units.find(u=>u.seat===1);
  room=(await f.call('POST',{op:'action',code,revision:room.revision,action:{type:'found',unit:settler.id}},friend.token)).room;
  assert.equal(room.game.cities.find(c=>c.seat===1).originalSeat,1);
});

test('an allied computer founds and readies even while its human keeps giving orders',async t=>{
  const f=roomFixture(t),seats=[{kind:'human',team:0},{kind:'bot',team:0},{kind:'human',team:1}];
  const host=await f.call('POST',{op:'create',name:'Host',seats},null,201),code=host.room.code;
  const guest=await f.call('POST',{op:'join',code,name:'Visitor'});
  let room=(await f.call('POST',{op:'start',code,revision:guest.room.revision},host.token)).room;
  if(room.game.teamPhase.team===1)room=(await f.call('POST',{op:'action',code,revision:room.revision,action:{type:'end'}},guest.token)).room;
  for(let i=0;i<24 && !room.game.teamPhase.readySeats.includes(1);i++)room=(await f.call('GET',{code},host.token)).room;
  room=(await f.call('GET',{code},host.token)).room;
  assert.deepEqual(room.game.teamPhase.activeSeats,[0]);assert.deepEqual(room.game.teamPhase.readySeats,[1]);
  const raw=JSON.parse(f.sqlite.prepare('SELECT game FROM game_rooms WHERE code=?').get(code).game);
  assert(raw.cities.some(c=>c.originalSeat===1));
  assert.equal(room.game.units.find(u=>u.seat===0).type,'settler');
});

test('simultaneous allies can both commit a same-revision order; a duplicate cannot run twice',async t=>{
  const f=roomFixture(t),seats=[{kind:'human',team:0},{kind:'human',team:0},{kind:'human',team:1}];
  const host=await f.call('POST',{op:'create',name:'H',seats},null,201),code=host.room.code;
  const friend=await f.call('POST',{op:'join',code,name:'F'}),rival=await f.call('POST',{op:'join',code,name:'R'});
  let room=(await f.call('POST',{op:'start',code,revision:rival.room.revision},host.token)).room;
  if(room.game.teamPhase.team===1)await f.call('POST',{op:'action',code,revision:room.revision,action:{type:'end'}},rival.token);
  const actors=[host,friend];
  const views=await Promise.all(actors.map(a=>f.call('GET',{code},a.token).then(r=>r.room)));
  assert.equal(views[0].revision,views[1].revision);
  const payload=views.map((v,i)=>({op:'action',code,revision:v.revision,orderKey:v.game.teamPhase.orderKey,
    action:{type:'found',unit:v.game.units.find(u=>u.seat===i).id}}));
  const writes=await Promise.all(actors.map((a,i)=>f.request('POST',payload[i],a.token)));
  assert.deepEqual(writes.map(r=>r.status),[200,200]);
  await f.call('POST',payload[0],host.token,409);
  await f.call('POST',payload[1],rival.token,409);
  const record=JSON.parse(f.sqlite.prepare('SELECT game FROM game_rooms WHERE code=?').get(code).game);
  assert.deepEqual(record.cities.map(c=>c.seat).sort(),[0,1]);
});

test('existing configured matches retain sequential turns even after a server upgrade',async t=>{
  const f=roomFixture(t),seats=[{kind:'human',team:0},{kind:'human',team:0},{kind:'human',team:1}];
  const host=await f.call('POST',{op:'create',name:'Host',seats},null,201),code=host.room.code;
  const ally=await f.call('POST',{op:'join',code,name:'Ally'}),rival=await f.call('POST',{op:'join',code,name:'Rival'});
  const started=(await f.call('POST',{op:'start',code,revision:rival.room.revision},host.token)).room;
  const old=rules.createGame([{name:'Host'},{name:'Ally'},{name:'Rival'}],'la',{seed:39,teams:[0,0,1]});
  f.sqlite.prepare('UPDATE game_rooms SET game=? WHERE code=?').run(JSON.stringify(old),code);
  const resumed=(await f.call('GET',{code},ally.token)).room;
  assert.equal(resumed.game.teamPhase,undefined);assert.equal(resumed.game.turn,0);
  const order={op:'action',code,revision:started.revision,action:{type:'end'}};
  await f.call('POST',order,ally.token,403);
  assert.equal((await f.call('POST',order,host.token)).room.game.turn,1);
});

test('a concurrent attack cannot switch a confirmed garrison strike to the newly exposed city',async t=>{
  const f=roomFixture(t),seats=[{kind:'human',team:0},{kind:'human',team:0},{kind:'human',team:1}];
  const host=await f.call('POST',{op:'create',name:'H',seats},null,201),code=host.room.code;
  const ally=await f.call('POST',{op:'join',code,name:'A'}),rival=await f.call('POST',{op:'join',code,name:'R'});
  const start=(await f.call('POST',{op:'start',code,revision:rival.room.revision},host.token)).room;
  let s=rules.createGame([{name:'H'},{name:'A'},{name:'R'}],'la',{seed:39,teams:[0,0,1],simultaneousTeams:true});
  for(const seat of [0,1,2]){
    s=rules.applyAction(s,seat,{type:'found',unit:s.units.find(u=>u.seat===seat).id});
    s=rules.applyAction(s,seat,{type:'end'});
  }
  const city=s.cities.find(c=>c.seat===2);const near=rules.getMap(s).neighbors(city.tile);
  const unit=(seat,id,type,tile,hp)=>({seat,id,type,tile,hp,maxHp:100,moves:2,maxMoves:2,charges:0});
  s.units=[unit(0,'observer-one','ranged',near[0],100),unit(1,'observer-two','ranged',near[1],100),unit(2,'garrison','melee',city.tile,1)];
  s.barbarians={camps:[],parties:[]};
  f.sqlite.prepare('UPDATE game_rooms SET game=? WHERE code=?').run(JSON.stringify(s),code);
  const issue=async(seat,token,expected)=>f.call('POST',{op:'action',code,revision:start.revision,
    orderKey:'2.0.'+seat+'.0',action:{type:'attack',unit:seat===0?'observer-one':'observer-two',tile:city.tile,defenderId:'garrison'}},token,expected);
  await issue(0,host.token,200);await issue(1,ally.token,409);
  const observed=(await f.call('GET',{code},ally.token)).room.game;
  assert.equal(observed.intel.forecasts['observer-two'][city.tile].defenderId,city.id);
});

test('two simultaneous Ready orders and a lost acknowledgment settle both cities once',async t=>{
  const f=roomFixture(t),seats=[{kind:'human',team:0},{kind:'human',team:0},{kind:'human',team:1}];
  const host=await f.call('POST',{op:'create',name:'Host',seats},null,201),code=host.room.code;
  const ally=await f.call('POST',{op:'join',code,name:'Ally'}),rival=await f.call('POST',{op:'join',code,name:'Rival'});
  let room=(await f.call('POST',{op:'start',code,revision:rival.room.revision},host.token)).room;
  if(room.game.teamPhase.team===1)room=(await f.call('POST',{op:'action',code,revision:room.revision,action:{type:'end'}},rival.token)).room;
  const actors=[host,ally];
  for(const [seat,actor] of actors.entries()){
    const own=(await f.call('GET',{code},actor.token)).room;
    await f.call('POST',{op:'action',code,revision:own.revision,orderKey:own.game.teamPhase.orderKey,
      action:{type:'found',unit:own.game.units.find(u=>u.seat===seat).id}},actor.token);
  }
  const views=await Promise.all(actors.map(a=>f.call('GET',{code},a.token).then(x=>x.room)));
  const ends=views.map(v=>({op:'action',code,revision:v.revision,orderKey:v.game.teamPhase.orderKey,action:{type:'end'}}));
  const receipts=await Promise.all(actors.map((a,seat)=>f.request('POST',ends[seat],a.token)));
  assert.deepEqual(receipts.map(r=>r.status),[200,200]);
  await f.call('POST',ends[0],host.token,409);
  for(const [seat,actor] of actors.entries()){
    const reconnect=(await f.call('POST',{op:'join',code,name:'Returning',ticket:actor.token})).room;
    assert.equal(reconnect.game.teamPhase.team,1);assert.equal(reconnect.game.teamPhase.orderKey,null);
    const expected=views[seat].game.players[seat].capital+rules.getStats(views[seat].game,seat).capitalIncome;
    assert.equal(reconnect.game.players[seat].capital,expected);
  }
});

test('room authority persists specialized upgrades and recovery, rejecting foreign and repeat orders',async t=>{
  const fixture=roomFixture(t), seats=await twoPlayers(fixture);
  const opening=await seats.start();
  const state=createClassicGame(['Host','Guest']);
  const unit=state.units.find(u=>u.seat===0 && u.type==='melee');
  unit.hp=60;unit.tile=state.cities[0].tile;
  state.players[0].technologies=['tactics','ballistics'];
  state.players[0].capital=30;
  fixture.sqlite.prepare('UPDATE game_rooms SET game=? WHERE code=?').run(JSON.stringify(state),seats.code);
  await seats.act(seats.guest,opening.revision,{type:'upgrade',unit:unit.id,item:'riflemen'},403);
  await seats.act(seats.host,opening.revision,{type:'upgrade',unit:unit.id,item:'armor'},422);
  const upgrade=(await seats.act(seats.host,opening.revision,{type:'upgrade',unit:unit.id,item:'riflemen'})).room;
  const veteran=upgrade.game.units.find(u=>u.id===unit.id);
  assert.equal(veteran.hp,66);assert.equal(upgrade.game.players[0].capital,20);
  await seats.act(seats.host,upgrade.revision,{type:'recover',unit:unit.id},422);
  const guestTurn=(await seats.act(seats.host,upgrade.revision,{type:'end'})).room;
  const turn=(await seats.act(seats.guest,guestTurn.revision,{type:'end'})).room;
  const rest=(await seats.act(seats.host,turn.revision,{type:'recover',unit:unit.id})).room;
  const persisted=(await seats.read(seats.host)).game;
  assert.equal(persisted.units.find(u=>u.id===unit.id).resting,true);
  assert.equal(rules.getRecoveryForecast(persisted,unit.id,0).gain,16);
  await seats.act(seats.host,rest.revision,{type:'recover',unit:unit.id},422);
  assert.ok((await seats.read(seats.guest)).game.units.every(u=>u.seat===1 || !('resting'in u)));
});

test('concurrent purchases charge once and a retried city quote stays stale after reconnect', async t => {
  const fixture = roomFixture(t), seats = await twoPlayers(fixture);
  let room = await seats.start();
  const founder = room.game.units.find(unit => unit.seat === room.you && unit.type === 'settler');
  room = (await seats.act(seats.host, room.revision, {type:'found', unit:founder.id})).room;
  const stored = JSON.parse(fixture.sqlite.prepare('SELECT game FROM game_rooms WHERE code=?').get(seats.code).game);
  stored.players[room.you].capital = 100;
  fixture.sqlite.prepare('UPDATE game_rooms SET game=? WHERE code=?').run(JSON.stringify(stored), seats.code);
  room = await seats.read(seats.host);
  const city = room.game.cities.find(city => city.seat === room.you);
  const quote = rules.getProductionOptions(room.game, city.id).find(option => option.item === 'scout');
  assert.equal(quote.buyEnabled, true);
  const action = {type:'buyProduction', city:city.id, item:'scout', gold:quote.gold, expected:city.productionRevision || 0};
  const request = {op:'action', code:seats.code, revision:room.revision, action};
  const recruits = game => game.units.filter(unit => unit.seat === room.you && unit.type === 'scout').length;
  const before = recruits(room.game);
  const writes = await Promise.all([fixture.request('POST', request, seats.host), fixture.request('POST', request, seats.host)]);
  assert.deepEqual(writes.map(reply => reply.status).sort(), [200, 409]);
  const host = await seats.read(seats.host), guest = await seats.read(seats.guest);
  assert.equal(recruits(host.game), before + 1);
  assert.equal(host.game.players[room.you].capital, 100 - quote.gold);
  assert.equal(guest.revision, host.revision);
  assert.equal(guest.game.players[room.you].capital, undefined);
  await seats.act(seats.host, host.revision, action, 422);
  const restored = (await fixture.call('POST', {op:'join', code:seats.code, ticket:seats.host, name:'Host again'})).room;
  assert.equal(restored.revision, host.revision);
  assert.deepEqual(restored.game, host.game);
});

test('open rooms reserve civilizations atomically at join and preserve a confirmed choice on reconnect', async t => {
  const f=roomFixture(t);
  const host=await f.call('POST',{op:'create',name:'Host',victoryMode:'science',civilization:'republic'},null,201);
  const code=host.room.code;
  assert.equal(host.room.victoryMode,'science');
  assert.equal(host.room.players[0].civilization,'republic');
  const claims=await Promise.all(['Alpha','Bravo'].map(name=>f.request('POST',{op:'join',code,name,civilization:'valley'})));
  assert.deepEqual(claims.map(x=>x.status).sort(),[200,409]);
  const guest=claims.find(x=>x.status===200).value;
  const initial=guest.room;
  assert.deepEqual(initial.players.map(p=>p.civilization),['republic','valley']);
  const change=(revision,civilization,seat)=>({op:'civilization',code,revision,civilization,...(seat===undefined?{}:{seat})});
  await f.call('POST',change(initial.revision,'pacific',guest.room.you),host.token,403);
  await f.call('POST',change(initial.revision,'republic'),guest.token,409);
  const writes=await Promise.all([host,guest].map(actor=>f.request('POST',change(initial.revision,'arroyo'),actor.token)));
  assert.deepEqual(writes.map(x=>x.status).sort(),[200,409]);
  const room=(await f.call('GET',{code},guest.token)).room;
  assert.equal(room.revision,initial.revision+1);
  assert.equal(room.players.filter(p=>p.civilization==='arroyo').length,1);
  const previous=room.players[room.you].civilization;
  const rejoin=await f.call('POST',{op:'join',code,name:'Returning guest',ticket:guest.token,civilization:'random'});
  assert.equal(rejoin.room.players[room.you].civilization,previous);
  assert.equal(rejoin.room.revision,room.revision);
  const rejected=await f.call('POST',{op:'civilization',code,revision:room.revision,civilization:0},guest.token,400);
  assert.ok(rejected.error);
  const started=(await f.call('POST',{op:'start',code,revision:room.revision},host.token)).room;
  assert.equal(started.victoryMode,'science');assert.equal(started.game.victoryMode,'science');
  assert.equal(started.game.civilizationTraits,1);
  assert.deepEqual(started.players.map(p=>p.civilization),room.players.map(p=>p.civilization));
  await f.call('POST',{op:'civilization',code,revision:started.revision,civilization:'pacific'},guest.token,409);
});

test('a host can choose a bot civilization, while open and occupied human seats stay under their owners’ control',async t=>{
  const f=roomFixture(t), seats=[{kind:'human',team:0,civilization:'republic'},{kind:'bot',team:0,civilization:'pacific'},{kind:'human',team:1}];
  await f.call('POST',{op:'create',name:'Host',seats,victoryMode:'invalid'},null,400);
  await f.call('POST',{op:'create',name:'Host',seats:[...seats.slice(0,2),{...seats[2],civilization:'valley'}]},null,400);
  await f.call('POST',{op:'create',name:'Host',seats:[seats[0],{...seats[1],civilization:'republic'},seats[2]]},null,409);
  const host=await f.call('POST',{op:'create',name:'Host',seats},null,201);
  assert.equal(host.room.victoryMode,'standard');
  const {code,revision}=host.room;
  await f.call('POST',{op:'civilization',code,revision,seat:2,civilization:'valley'},host.token,403);
  await f.call('POST',{op:'join',code,name:'Guest',civilization:'pacific'},null,409);
  assert((await f.call('GET',{code},host.token)).room.players[2].open);
  const changed=(await f.call('POST',{op:'civilization',code,revision,seat:1,civilization:'arroyo'},host.token)).room;
  const guest=await f.call('POST',{op:'join',code,name:'Guest',civilization:'pacific'});
  assert.equal(guest.room.revision,changed.revision+1);assert.equal(guest.room.you,2);
  await f.call('POST',{op:'civilization',code,revision:guest.room.revision,seat:1,civilization:'random'},guest.token,403);
  const reset=(await f.call('POST',{op:'civilization',code,revision:guest.room.revision,civilization:'random'},guest.token)).room;
  assert.equal(reset.players[2].civilization,'random');
  const started=(await f.call('POST',{op:'start',code,revision:reset.revision},host.token)).room;
  assert.deepEqual(started.players.slice(0,2).map(p=>p.civilization),['republic','arroyo']);
  assert(['valley','pacific'].includes(started.players[2].civilization));
  assert.equal(new Set(started.game.players.map(p=>p.faction)).size,3);
  assert.deepEqual((await f.call('GET',{code},guest.token)).room.players,started.players);
});

test('an old unstarted lobby and a resumed historical campaign keep their original score and civilization rules', async t=>{
  const f=roomFixture(t), s=await twoPlayers(f);
  const row=f.sqlite.prepare('SELECT members FROM game_rooms WHERE code=?').get(s.code);
  const members=JSON.parse(row.members).map(({victoryMode,civilization,researchPace,waterwayVersion,...original})=>original);
  f.sqlite.prepare('UPDATE game_rooms SET members=? WHERE code=?').run(JSON.stringify(members),s.code);
  const before=await s.read(s.guest);
  assert.equal(before.victoryMode,null);assert(before.players.every(p=>p.civilization==='random'));
  const started=await s.start();
  assert.equal(started.victoryMode,null);assert.equal(started.game.victoryMode,undefined);
  assert.equal(started.game.civilizationTraits,undefined);
  assert(started.players.every(p=>p.civilization!=='random'));
  const original=started.game.players.map(p=>p.faction);
  const resumed=(await f.call('POST',{op:'join',code:s.code,name:'Guest',ticket:s.guest,civilization:'valley'})).room;
  assert.deepEqual(resumed.game.players.map(p=>p.faction),original);
  assert.equal(resumed.victoryMode,null);
});

test('room authority awards the selected science or conquest victory to both members of an alliance',async t=>{
  for(const victoryMode of ['science','conquest']) {
    const f=roomFixture(t), seats=[0,0,1].map(team=>({kind:'human',team}));
    const host=await f.call('POST',{op:'create',name:'Host',seats,victoryMode,civilization:'republic'},null,201);
    const {code}=host.room;
    const ally=await f.call('POST',{op:'join',name:'Ally',code,civilization:'arroyo'});
    const rival=await f.call('POST',{op:'join',name:'Rival',code,civilization:'pacific'});
    const tokens=[host.token,ally.token,rival.token];
    const read=async seat=>(await f.call('GET',{code},tokens[seat])).room;
    const order=async (room,action)=>(await f.call('POST',{op:'action',code,revision:room.revision,orderKey:room.game.teamPhase.orderKey,action},tokens[room.you])).room;
    let room=(await f.call('POST',{op:'start',code,revision:rival.room.revision},host.token)).room;
    // Found all three original capitals through normal seat orders before staging the final turn.
    while(room.game.cities.length<3) {
      const row=f.sqlite.prepare('SELECT game FROM game_rooms WHERE code=?').get(code);
      if(JSON.parse(row.game).cities.length===3)break;
      const active=room.game.teamPhase.activeSeats;
      for(const seat of active) {
        room=await read(seat);
        const settler=room.game.units.find(u=>u.seat===seat && u.type==='settler');
        if(settler) room=await order(room,{type:'found',unit:settler.id});
        room=await order(room,{type:'end'});
      }
    }
    if(room.game.teamPhase.team===1)room=await order(await read(2),{type:'end'});
    const retrieve=()=>JSON.parse(f.sqlite.prepare('SELECT game FROM game_rooms WHERE code=?').get(code).game);
    const write=state=>f.sqlite.prepare('UPDATE game_rooms SET game=? WHERE code=?').run(JSON.stringify(state),code);
    let state=retrieve();
    if(victoryMode==='science') {
      const city=state.cities.find(c=>c.seat===1);
      state.players[1].technologies=Object.keys(rules.TECHS);
      write(state);
      await order(await read(1),{type:'produce',city:city.id,item:'orbitalSurvey'});
      state=retrieve();
      const q=state.cities.find(c=>c.id===city.id).queue;
      q.progress=q.required-1;write(state);
      room=await order(await read(1),{type:'end'});
    } else {
      const target=state.cities.find(c=>c.originalSeat===2);
      const map=rules.getMap(state);
      const from=map.neighbors(target.tile).find(id=>!['ocean','mountains'].includes(map.byId[id].terrain) &&
        !state.units.some(u=>u.tile===id) && !state.cities.some(c=>c.tile===id));
      assert.ok(from);
      target.hp=1;
      state.units.push({id:'siege',seat:1,tile:from,type:'melee',hp:100,maxHp:100,moves:2,maxMoves:2});
      write(state);
      const front=await read(1);
      const targetId=front.game.intel.forecasts.siege[target.tile].defenderId;
      room=await order(front,{type:'attack',unit:'siege',tile:target.tile,defenderId:targetId});
    }
    assert.equal(room.phase,'finished');assert.equal(room.victoryMode,victoryMode);
    assert.equal(room.game.victoryReason,victoryMode==='science'?'science':'domination');
    const guestView=await read(2);
    assert.deepEqual(room.game.winners,[0,1]);assert.deepEqual(guestView.game.winners,[0,1]);
    assert.equal(guestView.phase,'finished');
  }
});


test('new, coastal and earlier lobbies start and reconnect with the council rules they opened under',async t=>{
  const f=roomFixture(t);
  for (const pace of [2,1,undefined]) {
    const seats=await twoPlayers(f);
    if (pace!==2) {
      const stored=f.sqlite.prepare('SELECT members FROM game_rooms WHERE code=?').get(seats.code);
      const members=JSON.parse(stored.members);
      if(pace===undefined) {
        delete members[0].researchPace;
        delete members[0].waterwayVersion;
      } else members[0].researchPace=pace;
      f.sqlite.prepare('UPDATE game_rooms SET members=? WHERE code=?').run(JSON.stringify(members),seats.code);
    }
    const started=await seats.start();
    assert.equal(started.victoryMode,'standard');
    assert.equal(started.game.researchPace,pace);
    const quote=(options,id)=>options.find(item=>item.item===id);
    const science=rules.getResearchOptions(started.game,0),civics=rules.getCivicOptions(started.game,0);
    if(pace!==2){
      assert.equal(quote(science,'steam').cost,pace===1?44:10);
      assert.deepEqual(quote(science,'radio').requires,['steam']);
      assert.equal(quote(civics,'publicRadio').cost,pace===1?57:13);
      assert.deepEqual(quote(civics,'publicRadio').requires,['conservation']);
    }else{
      for(const [track,options] of [['research',science],['civic',civics]]){
        const advanced=options.find(o=>o.era==='modern' && o.requires.some(key=>quote(options,key)?.era==='modern'));
        assert(advanced?.locked);
        await seats.act(seats.host,started.revision,{type:track,item:advanced.item},422);
      }
    }
    const rejoined=await seats.read(seats.guest);
    assert.equal(rejoined.revision,started.revision);
    assert.equal(rejoined.game.researchPace,pace);
    assert.deepEqual(rules.getResearchOptions(rejoined.game,1).map(o=>[o.item,o.cost,o.requires]),
      science.map(o=>[o.item,o.cost,o.requires]));
  }
});

test('two seats reconnect to the same council rules while prices, prerequisites and banks settle per seat', async t=>{
  const f=roomFixture(t), seats=await twoPlayers(f);
  let room=await seats.start();
  const act=async action=>{room=(await seats.act(seats.host,room.revision,action)).room;};
  const options=(track,game=room.game)=>track==='research'?rules.getResearchOptions(game,0):rules.getCivicOptions(game,0);
  const specs=[
    {track:'research',root:'industry',next:'mechanics',alternate:'agronomy',bank:'science',known:'technologies'},
    {track:'civic',root:'charter',next:'landRegistry',alternate:'publicWorks',bank:'culture',known:'civics'}
  ];
  await act({type:'found',unit:room.game.units.find(u=>u.seat===0).id});
  for(const {track,root,next} of specs){
    const project=options(track).find(o=>o.item===next);
    assert(project.locked);assert.deepEqual(project.requires,[root]);
    const result=await seats.act(seats.host,room.revision,{type:track,item:next},422);
    assert(result.error);
    await act({type:track,item:root});
  }
  const switched=new Set();
  for(let i=0;i<50;i++){
    let self=room.game.players[0];
    if(specs.every(s=>self[s.known].includes(s.next)))break;
    for(const s of specs){
      if(!self[s.known].includes(s.root) || self[s.known].includes(s.next))continue;
      if(!self[s.track])await act({type:s.track,item:s.next});
      self=room.game.players[0];
      const alternate=options(s.track).find(o=>o.item===s.alternate);
      if(!switched.has(s.track) && self[s.bank]>0 && alternate.enabled && alternate.remaining>0){
        const saved=self[s.bank];
        await act({type:s.track,item:s.alternate});await act({type:s.track,item:s.next});
        assert.equal(room.game.players[0][s.bank],saved);
        switched.add(s.track);
      }
    }
    room=await seats.read(seats.host);
    const before=room.game.players[0],stats=rules.getStats(room.game,0);
    const orders=specs.map(s=>({track:s,quote:options(s.track).find(o=>o.item===before[s.track])}));
    await act({type:'end'});
    const after=room.game.players[0];
    for(const {track:s,quote} of orders){
      const paid=quote && after[s.known].includes(quote.item)?quote.cost:0;
      assert.equal(after[s.bank],before[s.bank]+stats[s.bank+'Income']-paid);
    }
    const guest=await seats.read(seats.guest);
    assert.equal(guest.game.players[0].science,undefined);
    assert.equal(guest.game.players[0].civic,undefined);
    await seats.act(seats.guest,guest.revision,{type:'end'});
    room=await seats.read(seats.host);
  }
  assert.equal(switched.size,2);
  for(const s of specs)assert(room.game.players[0][s.known].includes(s.next));
});

test('allied observation opens an authenticated private delegation, with one debit, expiry and ticket recovery', async t=>{
  const f=roomFixture(t),seats=[0,0,1].map(team=>({kind:'human',team}));
  const host=await f.call('POST',{op:'create',name:'Host',seats},null,201),code=host.room.code;
  const ally=await f.call('POST',{op:'join',code,name:'Ally'}),rival=await f.call('POST',{op:'join',code,name:'Rival'});
  const read=async actor=>(await f.call('GET',{code},actor.token)).room;
  const act=async (actor,action)=>{
    const room=await read(actor);
    return f.call('POST',{op:'action',code,revision:room.revision,orderKey:room.game.teamPhase.orderKey,action},actor.token);
  };
  let room=(await f.call('POST',{op:'start',code,revision:rival.room.revision},host.token)).room;
  if(room.game.teamPhase.team===1)await act(rival,{type:'end'});
  const state=JSON.parse(f.sqlite.prepare('SELECT game FROM game_rooms WHERE code=?').get(code).game);
  state.units.forEach(unit=>{unit.tile=['9,6','2,5','10,6'][unit.seat];});
  state.players[1].influence=11;
  f.sqlite.prepare('UPDATE game_rooms SET game=? WHERE code=?').run(JSON.stringify(state),code);
  room=await read(ally);
  const publicRow=(v,seat)=>v.game.intel.diplomacy.find(x=>x.seat===seat);
  assert.equal(publicRow(room,2).firstMetRound,state.round);
  const request={op:'action',code,revision:room.revision,orderKey:room.game.teamPhase.orderKey,action:{type:'delegation',target:2}};
  const replies=await Promise.all([f.request('POST',request,ally.token),f.request('POST',request,ally.token)]);
  assert.deepEqual(replies.map(r=>r.status).sort(),[200,409]);
  const own=await read(ally);
  assert.equal(own.game.players[1].influence,5);
  assert.equal(publicRow(own,2).delegation.cityCount,0);
  assert.equal(publicRow(await read(host),2).delegation,null);
  const spy=await read(rival);
  assert.equal(spy.game.players[1].influence,undefined);
  assert.equal(spy.game.delegations,undefined);
  assert(!spy.game.log.some(event=>event.type==='delegation'));
  const back=(await f.call('POST',{op:'join',code,ticket:ally.token,name:'Returned'})).room;
  assert.deepEqual(back.game.intel.diplomacy,own.game.intel.diplomacy);
  for(let i=0;i<3;i++) {
    await act(ally,{type:'end'});await act(host,{type:'end'});await act(rival,{type:'end'});
  }
  assert.equal(publicRow(await read(ally),2).delegation,null);
});

test('a reconnecting seat receives only its own order receipts and a duplicate cannot apply twice',async t=>{
  const f=roomFixture(t),players=await twoPlayers(f);
  let room=await players.start();
  const {code,host,guest}=players;
  const found={op:'action',code,revision:room.revision,actionId:'a'.repeat(32),
    action:{type:'found',unit:room.game.units.find(u=>u.seat===0).id}};
  const replies=await Promise.all([f.request('POST',found,host),f.request('POST',found,host)]);
  assert.deepEqual(replies.map(r=>r.status).sort(),[200,409]);
  room=await players.read(host);
  assert.equal(room.revision,found.revision+1);
  assert.deepEqual(room.orderReceipts,[found.actionId]);
  assert.equal(room.game.cities.filter(c=>c.seat===0).length,1);
  assert.deepEqual((await players.read(guest)).orderReceipts,[]);
  assert(!JSON.stringify(room.players).includes(found.actionId));
  const end={...found,revision:room.revision,action:{type:'end'}};
  await f.call('POST',end,host,409);
  await f.call('POST',{...end,actionId:'malformed'},host,400);
  const second={...end,actionId:'b'.repeat(32)};
  await f.call('POST',second,host);
  await f.call('POST',second,host,409);
  const reloaded=await players.read(host);
  assert.equal(reloaded.game.turn,1);
  assert.deepEqual(reloaded.orderReceipts,[found.actionId,second.actionId]);
});
