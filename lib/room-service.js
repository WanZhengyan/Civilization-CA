import { applyAction, campaignView, chooseBotAction, createGame, migrateGame, validMapId, validMapSize } from "../docs/rules.js";
import { validDifficulty } from "../docs/ai-levels.js";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;
const TOKEN_PATTERN = /^Bearer ([0-9a-f]{48})$/;

class RoomError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function json(value, status = 200) {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Authorization" },
  });
}

function asCode(raw) {
  const code = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if (!CODE_PATTERN.test(code)) throw new RoomError("Enter the six-character room code.");
  return code;
}

function asName(raw) {
  const name = typeof raw === "string" ? raw.trim() : "";
  if (!name || [...name].length > 24 || /[\u0000-\u001f\u007f]/.test(name)) {
    throw new RoomError("Choose a player name between 1 and 24 characters.");
  }
  return name;
}

function hex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function tokenHash(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return hex(new Uint8Array(digest));
}

async function makeMember(name, requestedToken) {
  if (requestedToken !== undefined && (typeof requestedToken !== "string" || !/^[0-9a-f]{48}$/.test(requestedToken))) {
    throw new RoomError("Your seat could not be verified. Rejoin the room.");
  }
  const token = requestedToken || hex(crypto.getRandomValues(new Uint8Array(24)));
  return { token, member: { name, hash: await tokenHash(token) } };
}

// Derive an opaque room-code candidate from a private ticket so a retry after a
// lost creation response can recover the same room without another database index.
async function makeCode(token, attempt) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("room:" + attempt + ":" + token));
  return Array.from(new Uint8Array(digest).slice(0, 6), byte => ALPHABET[byte % ALPHABET.length]).join("");
}

async function loadRoom(db, code, knownRevision = -1) {
  const row = await db.prepare(
    "SELECT revision, members, CASE WHEN revision = ? THEN NULL ELSE game END AS game FROM game_rooms WHERE code = ?"
  ).bind(knownRevision, code).first();
  if (!row) throw new RoomError("No room matches that code.", 404);
  const game = row.game ? migrateGame(JSON.parse(row.game)) : null;
  return { code, revision: row.revision, members: JSON.parse(row.members), game };
}

async function getSeat(request, room) {
  const token = (request.headers.get("Authorization") || "").match(TOKEN_PATTERN)?.[1];
  if (token) {
    const hash = await tokenHash(token);
    const index = room.members.findIndex((member) => member.hash === hash);
    if (index !== -1) return index;
  }
  throw new RoomError("Join the room to continue.", 401);
}

function view(room, you) {
  const phase = room.game ? (room.game.phase === "finished" ? "finished" : "playing") : "lobby";
  const configured = room.members[0].configured === true;
  return {
    code: room.code,
    revision: room.revision,
    mapId: room.game?.mapId || room.members[0].mapId || "la",
    mapSize: room.game?.mapSize || room.members[0].mapSize || "standard",
    host: 0,
    you,
    configured,
    canStart: phase === "lobby" && room.members.length >= 2 && room.members.every(member => member.hash || member.bot),
    players: room.members.map((member, id) => ({
      id, name:(member.bot && room.game?.players[id]?.name) || member.name || "",
      bot:member.bot === true, team:configured ? member.team : id, open:!member.hash && !member.bot,
      ...(member.bot ? {difficulty:member.difficulty} : {})
    })),
    phase,
    game: campaignView(room.game,you),
  };
}

async function save(db, room) {
  const result = await db.prepare(
    "UPDATE game_rooms SET revision = revision + 1, members = ?, game = ? WHERE code = ? AND revision = ?"
  ).bind(JSON.stringify(room.members), room.game === null ? null : JSON.stringify(room.game), room.code, room.revision).run();
  if (result.meta.changes === 0) return false;
  room.revision += 1;
  return true;
}

function configuredMembers(host, seats) {
  if (seats === undefined) return [host];
  if (!Array.isArray(seats) || seats.length < 2 || seats.length > 4 || seats[0]?.kind !== "human") {
    throw new RoomError("Choose two to four seats with a human host.");
  }
  const members = seats.map((seat, index) => {
    if (!seat || !["human","bot"].includes(seat.kind) || !Number.isInteger(seat.team) || seat.team < 0 || seat.team > 3) {
      throw new RoomError("Choose a seat type and team for every player.");
    }
    if (seat.kind === "human") return {...(index === 0 ? host : {}), team:seat.team};
    const difficulty = seat.difficulty === undefined ? "normal" : seat.difficulty;
    if (!validDifficulty(difficulty)) throw new RoomError("Choose a valid computer difficulty.");
    return {bot:true, name:"Computer " + (index+1), difficulty, team:seat.team};
  });
  if (new Set(members.map(member => member.team)).size < 2) throw new RoomError("Choose at least two opposing teams.");
  members[0].configured = true;
  return members;
}

async function create(db, name, ticket, mapId = "la", mapSize = "standard", seats) {
  if (!validMapId(mapId)) throw new RoomError("Choose a valid campaign map.");
  if (!validMapSize(mapSize)) throw new RoomError("Choose a valid map size.");
  const { token, member } = await makeMember(name, ticket);
  // Persist the lobby choice with its host. Existing member arrays and databases remain readable.
  member.mapId = mapId;
  member.mapSize = mapSize;
  const members = configuredMembers(member, seats);
  for (let i = 0; i < 5; i += 1) {
    const code = await makeCode(token, i);
    const room = { code, revision: 1, members, game: null };
    const result = await db.prepare("INSERT INTO game_rooms(code,revision,members,game) VALUES(?,1,?,NULL) ON CONFLICT(code) DO NOTHING")
      .bind(code, JSON.stringify(room.members)).run();
    if (result.meta.changes) return json({ token, room: view(room, 0) }, 201);
    const existing = await loadRoom(db, code);
    if (existing.members[0].hash === member.hash) return json({ token, room: view(existing, 0) });
  }
  throw new RoomError("The room could not be created. Please try again.", 503);
}

async function join(db, code, name, ticket) {
  const { token, member } = await makeMember(name, ticket);
  for (let i = 0; i < 4; i += 1) {
    const room = await loadRoom(db, code);
    const existingSeat = room.members.findIndex(person => person.hash === member.hash);
    if (existingSeat !== -1) return json({ token, room: view(room, existingSeat) });
    if (room.game) throw new RoomError("This campaign has already started.", 409);
    let seat = room.members.length;
    if (room.members[0].configured) {
      seat = room.members.findIndex(person => !person.hash && !person.bot);
      if (seat < 0) throw new RoomError("No human seats are open.", 409);
      room.members[seat] = {...room.members[seat], ...member};
    } else {
      if (seat >= 4) throw new RoomError("All four seats are taken.", 409);
      room.members.push(member);
    }
    if (await save(db, room)) return json({ token, room: view(room, seat) });
  }
  throw new RoomError("The lobby changed while you were joining. Please try again.", 409);
}

// One server request does bounded work. If a large army or several adjacent
// computer seats need more orders, the next authenticated poll continues from
// the saved revision. The counter also survives reconnects and worker restarts.
const BOT_BATCH = 8;
const BOT_WORK_MS = 12;
const MAX_BOT_ORDERS = 192;
function progressBots(room) {
  const host = room.members[0];
  const deadline = performance.now() + BOT_WORK_MS;
  for (let i=0; i<BOT_BATCH; i++) {
    const game = room.game, seat = game.turn, member = room.members[seat];
    if (game.phase !== "playing" || !member?.bot || !game.players[seat]?.bot) break;
    const cursor = host.botTurn;
    const orders = cursor?.round === game.round && cursor.seat === seat ? cursor.orders : 0;
    let next;
    if (orders < MAX_BOT_ORDERS) {
      try {
        const action = chooseBotAction(game,member.difficulty);
        next = applyAction(game,seat,action);
      } catch {
        // A plan made through fog can be rejected by the authoritative board.
        // Pass this seat once rather than repeatedly attempting the same order.
      }
    }
    room.game = next || applyAction(game,seat,{type:"end"});
    host.botTurn = {round:game.round,seat,orders:orders+1};
    if (performance.now() >= deadline) break;
  }
  const game = room.game;
  if (game.phase !== "playing" || !room.members[game.turn]?.bot || !game.players[game.turn]?.bot) delete host.botTurn;
}

async function changeRoom(request, db, room, body) {
  const seat = await getSeat(request, room);
  if (body.revision !== room.revision) throw new RoomError("The room has changed. Check the latest map before trying again.", 409);
  if (body.op === "start") {
    if (seat !== 0) throw new RoomError("Only the host can start the campaign.", 403);
    if (room.game) throw new RoomError("This campaign has already started.", 409);
    if (room.members.length < 2) throw new RoomError("At least two players are needed to start.", 409);
    if (room.members.some(member => !member.hash && !member.bot)) throw new RoomError("Wait for every human seat to join.", 409);
    const host = room.members[0];
    const players = room.members.map(member => member.bot ? {bot:true} : {name:member.name});
    const options = {mapSize:host.mapSize || "standard"};
    if (host.configured) {
      options.teams = room.members.map(member => member.team);
      options.drawInitiative = true;
    }
    room.game = createGame(players, host.mapId || "la", options);
  } else {
    if (!room.game) throw new RoomError("The campaign has not started.", 409);
    if (room.game.phase === "finished") throw new RoomError("The campaign has ended.", 409);
    if (room.game.turn !== seat) throw new RoomError("Wait for your turn.", 403);
    const action = body.action;
    if (!action || typeof action !== "object" || Array.isArray(action) || typeof action.type !== "string") {
      throw new RoomError("Choose a valid order.");
    }
    const sight=campaignView(room.game,seat).intel.visible;
    if ((action.tile && !sight.includes(action.tile)) || (action.site && !sight.includes(action.site))) {
      throw new RoomError("Choose a tile within your current sight.",422);
    }
    try {
      // Old rooms share the current visibility rules without altering their stored opening.
      room.game = applyAction({...room.game,enforceSight:true}, seat, action);
      delete room.game.enforceSight;
    } catch (error) {
      throw new RoomError(error instanceof Error ? error.message : "That order is unavailable.", 422);
    }
  }
  if (room.members[room.game.turn]?.bot) progressBots(room);
  if (!await save(db, room)) throw new RoomError("The room has changed. Check the latest map before trying again.", 409);
  return json({ room: view(room, seat) });
}

export async function handleRoom(request, db) {
  try {
    if (request.method === "GET") {
      const params = new URL(request.url).searchParams;
      const code = asCode(params.get("code"));
      const known = Number(params.get("revision")) || -1;
      let room = await loadRoom(db, code, known);
      const seat = await getSeat(request, room);
      if (room.members[0].botTurn) {
        if (!room.game) room = await loadRoom(db,code);
        if (room.members[0].botTurn && room.game) {
          progressBots(room);
          if (!await save(db,room)) room = await loadRoom(db,code);
        }
      }
      if (known === room.revision) {
        return new Response(null, { status: 204, headers: { "Cache-Control": "private, no-store", Vary: "Authorization" } });
      }
      return json({ room: view(room, seat) });
    }
    if (request.method !== "POST") throw new RoomError("Unsupported request method.", 405);
    if (Number(request.headers.get("Content-Length")) > 4096) throw new RoomError("The request is too large.", 413);
    const raw = await request.text();
    if (raw.length > 4096) throw new RoomError("The request is too large.", 413);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new RoomError("The request could not be read.");
    }
    if (!body || !["create", "join", "start", "action"].includes(body.op)) throw new RoomError("Unknown room operation.");
    if (body.op === "create") return await create(db, asName(body.name), body.ticket, body.mapId, body.mapSize, body.seats);
    const code = asCode(body.code);
    if (body.op === "join") return await join(db, code, asName(body.name), body.ticket);
    return await changeRoom(request, db, await loadRoom(db, code), body);
  } catch (error) {
    if (error instanceof RoomError) return json({ error: error.message }, error.status);
    console.error("Room request failed", error);
    return json({ error: "The room service is temporarily unavailable. Please try again." }, 503);
  }
}
