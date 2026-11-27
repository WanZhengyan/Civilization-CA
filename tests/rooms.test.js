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

test("independent seats receive the same game after reconnect and a stale order cannot run twice", async t => {
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
  assert.deepEqual(reloaded.game,returned.room.game);
  assert.deepEqual(reloaded.game,(await seats.read(seats.guest)).game);
});

test("each seat issues unit and city orders through the server and observes the other seat's changes", async t => {
  const fixture=roomFixture(t), seats=await twoPlayers(fixture);
  let room=await seats.start();
  assert.equal(room.game.rulesVersion,3);
  for (const [seat,token,observer] of [[0,seats.host,seats.guest],[1,seats.guest,seats.host]]) {
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
    assert.deepEqual((await seats.read(observer)).game,room.game);
    room=(await seats.act(token,room.revision,{type:"end"})).room;
  }
  assert.equal(room.game.round,2);
  assert.ok(room.game.cities.every(c=>c.queue?.item==="workshop" && c.queue.progress>0));
  assert.deepEqual((await seats.read(seats.host)).game,room.game);
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
  assert.equal(read.game.players[0].capital,26);
  assert.equal(read.game.players[1].name,"海岸玩家");
  assert.equal(read.game.board["12,7"].owner,0);
  assert.equal(read.game.board["12,7"].level,2);
  assert.equal(read.game.rulesVersion,3);
  assert.ok(read.game.units.some(u=>u.type==="settler" && u.seat===1));
  assert.ok(read.game.cities.some(c=>c.seat===0));
  assert.deepEqual(rules.migrateGame(read.game),read.game);
  const played=(await seats.act(seats.guest,read.revision,{type:"end"})).room;
  const stored=JSON.parse(fixture.sqlite.prepare("SELECT game FROM game_rooms WHERE code=?").get(seats.code).game);
  assert.deepEqual(stored,played.game);
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
  const v2=structuredClone(room.game);
  v2.rulesVersion=2;
  v2.units.find(u=>u.id===unit.id).hp=65;
  for(const p of v2.players) {
    delete p.science;delete p.technologies;delete p.research;
  }
  fixture.sqlite.prepare("UPDATE game_rooms SET game=? WHERE code=?").run(JSON.stringify(v2),seats.code);
  const migrated=await seats.read(seats.host);
  assert.equal(migrated.game.rulesVersion,3);
  assert.deepEqual(migrated.game.units,v2.units);
  assert.deepEqual(migrated.game.cities,v2.cities);
  assert.ok(Number.isFinite(migrated.game.players[0].science));
  assert.deepEqual(migrated.game.players[0].technologies,[]);
  assert.deepEqual(rules.migrateGame(migrated.game),migrated.game);
  const researched=(await seats.act(seats.host,migrated.revision,{type:"research",item:"industry"})).room;
  assert.equal(researched.game.players[0].research,"industry");
  await seats.act(seats.host,migrated.revision,{type:"research",item:"agronomy"},409);
  assert.deepEqual((await seats.read(seats.guest)).game,researched.game);
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
  assert.equal(room.game.units.length,2);
  assert.deepEqual((await fixture.call("GET",{code},guest.token)).room.game,room.game);
});
