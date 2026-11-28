import {CIVILIZATIONS,validCivilizationPick} from '../docs/civilizations.js';
import {validVictoryMode} from '../docs/victory-rules.js';
import {DEFAULT_MAP_SIZE,validNewMapSize} from '../docs/maps.js';
import { applyAction, campaignView, chooseBotAction, createGame, migrateGame, validMapId } from "../docs/rules.js";
import {activeTeamSeats,seatMayOrder,teamOrderKey} from '../docs/team-turns.js';
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
    victoryMode:room.game ? room.game.victoryMode ?? null : room.members[0].victoryMode ?? null,
    host: 0,
    you,
    orderReceipts: room.members[you].orderReceipts || [],
    configured,
    canStart: phase === "lobby" && room.members.length >= 2 && room.members.every(member => member.hash || member.bot),
    players: room.members.map((member, id) => ({
      id, name:(member.bot && room.game?.players[id]?.name) || member.name || "",
      civilization:room.game ? CIVILIZATIONS[room.game.players[id]?.faction]?.id || "random" : member.civilization || "random",
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

function civilizationPick(value = "random") {
  if (!validCivilizationPick(value)) throw new RoomError("Choose a valid civilization.");
  return value;
}

function availableCivilization(members, seat, pick) {
  if (pick !== "random" && members.some((member,index) => index !== seat && member.civilization === pick)) {
    throw new RoomError("That civilization has already been chosen.",409);
  }
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
    const pick = civilizationPick(seat.civilization);
    if (index === 0) {
      if (pick !== "random" && host.civilization !== "random" && pick !== host.civilization) {
        throw new RoomError("Choose one civilization for the host.");
      }
      return {...host, team:seat.team, civilization:pick === "random" ? host.civilization : pick};
    }
    if (seat.kind === "human") {
      if (pick !== "random") throw new RoomError("Human players choose their own civilization.");
      return {team:seat.team};
    }
    const difficulty = seat.difficulty === undefined ? "normal" : seat.difficulty;
    if (!validDifficulty(difficulty)) throw new RoomError("Choose a valid computer difficulty.");
    return {bot:true, name:"Computer " + (index+1), difficulty, team:seat.team, civilization:pick};
  });
  if (new Set(members.map(member => member.team)).size < 2) throw new RoomError("Choose at least two opposing teams.");
  members.forEach((member,index) => availableCivilization(members,index,member.civilization || "random"));
  members[0].configured = true;
  return members;
}

async function create(db, name, ticket, mapId = "la", mapSize = DEFAULT_MAP_SIZE, seats, victoryMode = "standard", civilization) {
  if (!validVictoryMode(victoryMode)) throw new RoomError("Choose a valid victory mode.");
  if (!validMapId(mapId)) throw new RoomError("Choose a valid campaign map.");
  if (!validNewMapSize(mapSize)) throw new RoomError("Choose a valid map size.");
  const { token, member } = await makeMember(name, ticket);
  // Persist the lobby choice with its host. Existing member arrays and databases remain readable.
  member.researchPace = 2;
  member.waterwayVersion = 1;
  member.victoryMode = victoryMode;
  member.civilization = civilizationPick(civilization);
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

async function join(db, code, name, ticket, civilization) {
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
    } else {
      if (seat >= 4) throw new RoomError("All four seats are taken.", 409);
    }
    member.civilization = civilizationPick(civilization);
    availableCivilization(room.members,seat,member.civilization);
    room.members[seat] = {...room.members[seat], ...member};
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
function nextBotSeat(room) {
  return activeTeamSeats(room.game).find(seat=>room.members[seat]?.bot && room.game.players[seat]?.bot);
}
function progressBots(room) {
  const host = room.members[0];
  const deadline = performance.now() + BOT_WORK_MS;
  for (let i=0; i<BOT_BATCH; i++) {
    const game=room.game, seat=nextBotSeat(room);
    if (seat===undefined) break;
    const member=room.members[seat];
    const cursor = host.botTurn;
    const orders = cursor?.round === game.round && cursor.seat === seat ? cursor.orders : 0;
    let next;
    if (orders < MAX_BOT_ORDERS) {
      try {
        const action = chooseBotAction(game,member.difficulty,seat);
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
  if (nextBotSeat(room)===undefined) delete host.botTurn;
}

async function changeRoom(request, db, room, body, retries=3) {
  const seat = await getSeat(request, room);
  const receipt = body.op === "action" ? body.actionId : undefined;
  if (receipt !== undefined) {
    if (typeof receipt !== "string" || !/^[a-f0-9]{32}$/.test(receipt)) {
      throw new RoomError("Choose a valid order.", 400);
    }
    if (room.members[seat].orderReceipts?.includes(receipt)) {
      throw new RoomError("The room has already received this order.", 409);
    }
  }
  const keyed = body.op==="action" && body.orderKey!==undefined && body.orderKey!==null;
  const sameOrderWindow = keyed && room.game?.teamPhase && typeof body.orderKey==="string" &&
    body.orderKey===teamOrderKey(room.game,seat) && Number.isInteger(body.revision) &&
    body.revision>0 && body.revision<=room.revision;
  if ((keyed && !sameOrderWindow) || (!keyed && body.revision!==room.revision)) {
    throw new RoomError("The room has changed. Check the latest map before trying again.",409);
  }
  if (body.op === "civilization") {
    if (room.game) throw new RoomError("Civilizations are locked after the campaign starts.",409);
    const target = body.seat === undefined ? seat : body.seat;
    if (!Number.isInteger(target) || !room.members[target]) throw new RoomError("Choose a valid seat.");
    if (target !== seat && !(seat === 0 && room.members[target].bot)) {
      throw new RoomError("Only the seat owner can choose this civilization.",403);
    }
    if (body.civilization === undefined) throw new RoomError("Choose a valid civilization.");
    const pick = civilizationPick(body.civilization);
    availableCivilization(room.members,target,pick);
    if ((room.members[target].civilization || "random") === pick) return json({room:view(room,seat)});
    room.members[target].civilization = pick;
  } else if (body.op === "start") {
    if (seat !== 0) throw new RoomError("Only the host can start the campaign.", 403);
    if (room.game) throw new RoomError("This campaign has already started.", 409);
    if (room.members.length < 2) throw new RoomError("At least two players are needed to start.", 409);
    if (room.members.some(member => !member.hash && !member.bot)) throw new RoomError("Wait for every human seat to join.", 409);
    const host = room.members[0];
    const players = room.members.map(member => ({...(member.bot ? {bot:true} : {name:member.name}),
      civilization:member.civilization || "random"}));
    const options = {mapSize:host.mapSize || "standard",
      researchPace:host.researchPace ?? 0, waterways:host.waterwayVersion===1,
      ...(host.victoryMode ? {victoryMode:host.victoryMode} : {legacyVictory:true,civilizationTraits:false})};
    if (host.configured) {
      options.teams = room.members.map(member => member.team);
      options.drawInitiative = true;
      options.simultaneousTeams = true;
    }
    room.game = createGame(players, host.mapId || "la", options);
  } else {
    if (!room.game) throw new RoomError("The campaign has not started.", 409);
    if (room.game.phase === "finished") throw new RoomError("The campaign has ended.", 409);
    if (!seatMayOrder(room.game,seat)) throw new RoomError("Wait for your turn.", 403);
    const action = body.action;
    if (!action || typeof action !== "object" || Array.isArray(action) || typeof action.type !== "string") {
      throw new RoomError("Choose a valid order.");
    }
    const intel=campaignView(room.game,seat).intel;
    const sight=intel.visible;
    if ((action.tile && !sight.includes(action.tile)) || (action.site && !sight.includes(action.site))) {
      throw new RoomError("Choose a tile within your current sight.",422);
    }
    if (keyed && action.type==='attack' && (body.revision!==room.revision || action.defenderId!==undefined)) {
      const target=intel.forecasts?.[action.unit]?.[action.tile]?.defenderId;
      if (!target || action.defenderId!==target) throw new RoomError("The combat target has changed. Review the new forecast.",409);
    }
    try {
      // Old rooms share the current visibility rules without altering their stored opening.
      room.game = applyAction({...room.game,enforceSight:true}, seat, action);
      delete room.game.enforceSight;
    } catch (error) {
      throw new RoomError(error instanceof Error ? error.message : "That order is unavailable.", 422);
    }
  }
  if (receipt) {
    // Commit the receipt with the action. Each seat can recover recent orders
    // after an interrupted response, including orders from its other tabs.
    const previous = room.members[seat].orderReceipts || [];
    room.members[seat].orderReceipts = [...previous.slice(-7), receipt];
  }
  if (room.game && nextBotSeat(room)!==undefined) progressBots(room);
  if (!await save(db, room)) {
    // Another seat may commit between read and write. Recheck ownership,
    // phase, personal order key, visibility, current board legality and costs.
    if (sameOrderWindow && retries>0) return changeRoom(request,db,await loadRoom(db,room.code),body,retries-1);
    throw new RoomError("The room has changed. Check the latest map before trying again.",409);
  }
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
    if (!body || !["create", "join", "start", "action", "civilization"].includes(body.op)) throw new RoomError("Unknown room operation.");
    if (body.op === "create") return await create(db, asName(body.name), body.ticket, body.mapId, body.mapSize, body.seats, body.victoryMode, body.civilization);
    const code = asCode(body.code);
    if (body.op === "join") return await join(db, code, asName(body.name), body.ticket, body.civilization);
    return await changeRoom(request, db, await loadRoom(db, code), body);
  } catch (error) {
    if (error instanceof RoomError) return json({ error: error.message }, error.status);
    console.error("Room request failed", error);
    return json({ error: "The room service is temporarily unavailable. Please try again." }, 503);
  }
}
