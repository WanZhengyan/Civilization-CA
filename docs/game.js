import {ledgerBody} from './resource-ledger.js';
import {getResourceLedger} from './rules.js';
import {getLanguage, installLanguage, languageControl, observeCityNames, setLanguage} from './i18n.js';
import {mapPicker, installMapStyles} from './regions-ui.js';
import { campaignView, FACTIONS, UNIT_TYPES, BUILDINGS, IMPROVEMENTS, createGame, applyAction, chooseBotAction, getStats, migrateGame, getMap } from './rules.js';

import {TARGET_SCORE, MAX_ROUNDS} from './rules.js';

const SOLO_KEY = 'angel-basin.solo.v1';
const SEATS_KEY = 'angel-basin.room-seats.v1';
const LAST_ROOM_KEY = 'angel-basin.active-room.v1';
const NAME_KEY = 'angel-basin.name.v1';
const TICKET_KEY = 'angel-basin.pending-seat.v1';
const FACTION_NAMES = FACTIONS.map(faction => faction.name);
const validCode = value => /^[A-Z0-9]{6}$/.test(value);
const canonicalCode = value => String(value || '').trim().toUpperCase();
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]
));

function read(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch { return fallback; }
}

function save(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch { /* Play can continue when device storage is unavailable. */ }
}

function freshSolo(mapId = "la") {
  return createGame(FACTIONS.map((_, index) => ({
    name: index ? undefined : 'You',
    bot: index !== 0
  })), mapId);
}

const mapSaveKey = mapId => SOLO_KEY + '.' + mapId;
function archiveSolo() {
  if (solo) save(mapSaveKey(getMap(solo).id), solo);
}
function campaignSave(mapId) {
  if (solo && getMap(solo).id === mapId) return solo;
  const saved = read(mapSaveKey(mapId), null);
  if (!saved || getMap(saved).id !== mapId || !Array.isArray(saved.players) || !saved.board || !Array.isArray(saved.log)) return null;
  try { return migrateGame(saved); } catch { return null; }
}

function storedSolo() {
  const candidate = read(SOLO_KEY, null);
  if (candidate?.players?.length === FACTIONS.length && candidate.board &&
      ['finished', 'playing'].includes(candidate.phase) && Array.isArray(candidate.log)) {
    try {
      const upgraded = migrateGame(candidate);
      if (upgraded !== candidate) save(SOLO_KEY, upgraded);
      return upgraded;
    } catch { /* An unreadable device save cannot be resumed. */ }
  }
  return freshSolo();
}

let renderView, toast, dialog, solo, room = null, token = null;
let mode = 'solo', modal = '', roomTab = 'create', joinCode = '', formName = '';
let selectedMap = 'la';
let supplyCity='';
let pending = false, errorMessage = '', playingBots = false;
let pollTimer, polling = false, roomEpoch = 0, offline = false, initialized = false;
let inviteOpen = false, resultShown = '', guideTab = 'start';
const getState = () => campaignView(mode === 'online' && room?.game ? room.game : solo, currentSeat());
const currentSeat = () => mode === 'online' && room ? room.you : 0;
function emit() {
  if (modal==='supplies' && dialog?.open) drawDialog();
  const state = getState();
  if (state) observeCityNames(state.cities || [], getMap(state).byId);
  renderView?.({
    state, seat: currentSeat(), room, session: mode==='solo' ? solo.seed : room?.code,
    mode, busy: pending || (mode === 'solo' && playingBots) || (mode === 'online' && !room?.game)
  });
}
function rememberSeat(code, seatToken) {
  const saved = read(SEATS_KEY, {});
  saved[code] = seatToken;
  save(SEATS_KEY, saved);
}
function forgetSeat(code) {
  const saved = read(SEATS_KEY, {});
  delete saved[code];
  save(SEATS_KEY, saved);
}
function roomURL(code) {
  const url = new URL(location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('room', code);
  return url.href;
}
function updateURL(code) {
  const url = new URL(location.href);
  if (code) url.searchParams.set('room', code);
  else url.searchParams.delete('room');
  history.replaceState(null, '', url);
}
function checkFinished() {
  const state = getState();
  if (!state || state.phase !== 'finished') return;
  const key = mode === 'solo' ? 'solo' : room?.code;
  if (key !== resultShown) {
    resultShown = key;
    open('standings');
  }
}
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function runBots() {
  if (playingBots || mode !== 'solo' || solo.phase !== 'playing' || !solo.players[solo.turn].bot) return;
  playingBots = true;
  emit();
  let activeSeat = -1, orders = 0;
  try {
    while (mode === 'solo' && solo.phase === 'playing' && solo.players[solo.turn].bot) {
      await sleep(80);
      if (mode !== 'solo' || solo.phase !== 'playing' || !solo.players[solo.turn].bot) break;
      if (activeSeat !== solo.turn) { activeSeat = solo.turn; orders = 0; }
      try {
        const action = ++orders <= 192 ? chooseBotAction(solo) : {type:'end'};
        solo = applyAction(solo, solo.turn, action);
      } catch {
        solo = applyAction(solo, solo.turn, {type:'end'});
      }
      save(SOLO_KEY, solo);
      emit();
      if (modal === 'log' || modal === 'standings') drawDialog();
    }
  } catch (error) { toast?.(error.message || 'This turn could not be completed.'); }
  finally {
    playingBots = false;
    emit();
    checkFinished();
  }
}

async function requestRoom({ op, code, name, revision, action, auth, ticket, mapId }) {
  const isGet = !op;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const query = isGet ? '?' + new URLSearchParams({code, ...(revision !== undefined && {revision})}) : '';
    const externalOrigin = document.querySelector?.('meta[name="civitas-api-origin"]')?.content.trim();
    const endpoint = externalOrigin ? new URL('/api/room' + query, externalOrigin).href : '/api/room' + query;
    const response = await fetch(endpoint, {
      method: isGet ? 'GET' : 'POST', cache: 'no-store', signal: controller.signal,
      headers: {
        ...(!isGet && { 'Content-Type': 'application/json' }),
        ...(auth && { Authorization: 'Bearer ' + auth })
      },
      body: isGet ? undefined : JSON.stringify({ op, code, name, revision, action, ticket, mapId })
    });
    if (response.status === 204 && isGet && revision !== undefined) return { unchanged: true };
    let data;
    try { data = await response.json(); } catch { data = {}; }
    if (!response.ok) {
      const error = new Error(data.error || 'The room could not be reached.');
      error.status = response.status;
      throw error;
    }
    if (!data.room || !validCode(data.room.code)) throw new Error('The room did not load. Please try again.');
    return data;
  } catch (error) {
    if (error.name === 'AbortError' || error instanceof TypeError) throw new Error('Connection lost. Check your connection and try again.');
    throw error;
  } finally { clearTimeout(timeout); }
}

function syncRoom(incoming) {
  if (room?.code === incoming.code && room.revision >= incoming.revision) return;
  const previousPhase = room?.phase;
  room = incoming;
  mode = 'online';
  emit();
  if (room.phase === 'lobby') {
    if (modal === 'multiplayer') drawDialog();
  } else {
    if (modal === 'multiplayer' && previousPhase === 'lobby') {
      close();
      toast?.('The campaign has begun.');
    } else if (['standings', 'log', 'multiplayer'].includes(modal)) {
      drawDialog();
    }
    checkFinished();
  }
}

function connect(incoming, auth, showLobby = true) {
  clearTimeout(pollTimer);
  roomEpoch++;
  polling = false;
  token = auth;
  offline = false;
  inviteOpen = false;
  rememberSeat(incoming.code, auth);
  save(LAST_ROOM_KEY, incoming.code);
  updateURL(incoming.code);
  mode = 'online';
  room = null;
  syncRoom(incoming);
  if (incoming.phase === 'lobby' && showLobby) open('multiplayer');
  else if (modal === 'multiplayer') close();
  schedulePoll();
}

function schedulePoll() {
  clearTimeout(pollTimer);
  if (mode !== 'online' || !room || room.phase === 'finished') return;
  pollTimer = setTimeout(poll, document.hidden ? 7000 : 1400);
}

async function poll() {
  if (polling || mode !== 'online' || !room) return;
  const epoch = roomEpoch;
  polling = true;
  try {
    const data = await requestRoom({ code: room.code, revision: room.revision, auth: token });
    if (epoch !== roomEpoch) return;
    if (offline) { offline = false; toast?.('Reconnected to the room.'); }
    if (!data.unchanged) syncRoom(data.room);
  } catch (error) {
    if (epoch !== roomEpoch) return;
    if ([401, 403, 404].includes(error.status)) {
      const code = room.code;
      forgetSeat(code);
      returnToSolo();
      open('multiplayer', 'join', code);
      showError(error.message);
    } else if (!offline) {
      offline = true;
      toast?.('Connection lost. Reconnecting…');
    }
  } finally {
    if (epoch === roomEpoch) {
      polling = false;
      schedulePoll();
    }
  }
}

function returnToSolo() {
  roomEpoch++;
  clearTimeout(pollTimer);
  polling = false;
  mode = 'solo';
  room = token = null;
  offline = inviteOpen = false;
  save(LAST_ROOM_KEY, null);
  updateURL(null);
  close();
  emit();
  runBots();
}

async function seatRequest(form) {
  if (pending) return;
  const values = new FormData(form);
  if (values.get('mapId')) selectedMap = values.get('mapId');
  const name = String(values.get('name') || '').trim();
  const code = canonicalCode(values.get('code'));
  formName = name;
  if (!name || name.length > 24) return showError('Choose a player name between 1 and 24 characters.');
  if (roomTab === 'join' && !validCode(code)) return showError('Enter the six-character room code.');
  joinCode = code;
  save(NAME_KEY, name);
  pending = true;
  errorMessage = '';
  drawDialog();
  emit();
  try {
    const savedToken = roomTab === 'join' && read(SEATS_KEY, {})[code];
    if (savedToken) {
      try {
        const data = await requestRoom({ code, auth: savedToken });
        connect(data.room, savedToken);
        return;
      } catch (error) {
        if (![401, 403, 404].includes(error.status)) throw error;
        forgetSeat(code);
      }
    }
    const intent = [roomTab, roomTab === 'join' ? code : selectedMap, name].join('|');
    let ticket = read(TICKET_KEY, null);
    if (ticket?.intent !== intent) {
      const bytes = crypto.getRandomValues(new Uint8Array(24));
      ticket = {intent, token:Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')};
      save(TICKET_KEY, ticket);
    }
    const data = await requestRoom({ op: roomTab, name, ticket:ticket.token, ...(roomTab === 'join' ? {code} : {mapId:selectedMap}) });
    connect(data.room, data.token);
    save(TICKET_KEY, null);
  } catch (error) { showError(error.message); }
  finally {
    pending = false;
    if (modal === 'multiplayer') drawDialog();
    emit();
  }
}

async function mutate(op, action) {
  if (pending || !room || !token) return;
  const epoch = roomEpoch;
  pending = true;
  errorMessage = '';
  emit();
  if (modal === 'multiplayer') drawDialog();
  try {
    const result = await requestRoom({ op, code: room.code, revision: room.revision, action, auth: token });
    if (epoch === roomEpoch) syncRoom(result.room);
  } catch (error) {
    if (epoch !== roomEpoch) return;
    if (error.status === 409 || !error.status) {
      try { syncRoom((await requestRoom({ code: room.code, auth: token })).room); }
      catch { /* Polling also retries after connection errors. */ }
    }
    showError(error.message);
  } finally {
    if (epoch === roomEpoch) {
      pending = false;
      if (modal === 'multiplayer') drawDialog();
      emit();
    }
  }
}

function doAction(type, tile) {
  const state = getState();
  if (pending || state.phase !== 'playing' || state.turn !== currentSeat()) return;
  if (type === 'end') tile = undefined;
  const action = typeof type === 'object' && type ? type : tile === undefined ? {type} : {type, tile};
  if (mode === 'online') {
    if (room?.phase === 'playing') return mutate('action', action);
    return;
  }
  if (playingBots) return;
  try {
    solo = applyAction(solo, 0, action);
    save(SOLO_KEY, solo);
    emit();
    checkFinished();
    runBots();
  } catch (error) { toast?.(error.message); }
}

function showError(message) {
  errorMessage = message;
  if (modal === 'multiplayer') {
    drawDialog();
    dialog.querySelector('[role=alert]')?.focus();
  } else toast?.(message);
}

function open(kind, tab, code) {
  if (!dialog) return;
  const previousModal = modal;
  const changed = modal !== kind;
  modal = kind;
  if (changed) errorMessage = '';
  if (tab) roomTab = tab;
  if (code) joinCode = code;
  if (changed && ['multiplayer','campaign-atlas','restart'].includes(kind) && previousModal !== 'campaign-atlas') selectedMap = getMap(getState()).id;
  if (changed && kind === 'multiplayer') inviteOpen = false;
  drawDialog();
  if (!dialog.open) dialog.showModal();
  if (changed) dialog.querySelector('.modal-title')?.focus();
}
function close() {
  modal = '';
  errorMessage = '';
  if (dialog?.open) dialog.close();
}

const button = (action, label, kind = 'secondary', disabled = false) =>
  `<button type="button" class="modal-${kind}" data-act="${action}"${disabled ? ' disabled' : ''}>${label}</button>`;
const muted = text => `<p class="modal-muted">${text}</p>`;
const desc = text => `<p class="modal-copy">${text}</p>`;
const row = (title, subtitle, value = '') =>
  `<li class="modal-row"><div><strong>${title}</strong>${subtitle ? `<small>${subtitle}</small>` : ''}</div>${value ? `<span class="modal-number">${value}</span>` : ''}</li>`;
const list = items => `<ul class="modal-list">${items.join('')}</ul>`;
const actions = (...items) => `<div class="modal-actions">${items.join('')}</div>`;
const seatFaction = seat => getState()?.players[seat]?.faction ?? seat;
const factionMark = seat => `<i aria-hidden="true" class="modal-faction" style="background:${FACTIONS[seatFaction(seat)].color};display:inline-block;width:.55rem;height:.55rem;border-radius:50%;margin-right:.55rem"></i>`;

// Old campaigns store a sentence alongside the structured order. Match the old
// sentence patterns only, so names in a player's language stay exactly as entered.
const oldUnits = {开拓者:UNIT_TYPES.settler.name, 建设者:UNIT_TYPES.builder.name, 民兵:UNIT_TYPES.melee.name, 游骑兵:UNIT_TYPES.ranged.name};
const products = {...UNIT_TYPES, ...BUILDINGS, ...IMPROVEMENTS};
const oldFactions = ['加州共和国', '太平洋联盟', '山谷联盟', '阿罗约同盟'];

function eventText(entry) {
  if (!entry) return '';
  const text = String(entry.text || '');
  if (!/[\u3400-\u9fff]/.test(text)) return text;
  const faction = FACTION_NAMES[seatFaction(entry.seat)] || 'A faction';
  const oldFaction = oldFactions[seatFaction(entry.seat)];
  const item = products[entry.item]?.name;
  let match;
  switch (entry.type) {
    case 'start':
      if (text === '各阵营已经就位，战役开始。' || text === '战役开始。' || text === '洛杉矶战役开始。') return 'The campaign has begun.';
      break;
    case 'end':
      if (text === oldFaction + '结束了回合。') return faction + ' ended its turn.';
      break;
    case 'develop':
    case 'claim':
    case 'contest': {
      const [zh,en] = {develop:['开发了','developed'], claim:['将领地扩张至','claimed'], contest:['夺取了','took control of']}[entry.type];
      const prefix = oldFaction + zh + ' ';
      if (text.startsWith(prefix) && text.endsWith('。')) return faction + ' ' + en + ' ' + text.slice(prefix.length,-1) + '.';
      break;
    }
    case 'found':
      if (text.startsWith(oldFaction + ' 在 ') && text.endsWith(' 建立了新城。')) {
        const city = text.slice((oldFaction + ' 在 ').length, -' 建立了新城。'.length);
        return faction + ' founded ' + city + '.';
      }
      break;
    case 'move':
      match = text.match(/^(开拓者|建设者|民兵|游骑兵)移动到 ([\s\S]+)。$/);
      if (match) return oldUnits[match[1]] + ' moved to ' + match[2] + '.';
      break;
    case 'produce':
    case 'complete':
      match = text.match(/^([\s\S]+) (开始生产|已完成生产：)(?:开拓者|建设者|民兵|游骑兵|粮仓|工坊|纪念碑|城墙)。$/);
      if (match && item) return match[1] + (entry.type === 'produce' ? ' started production of ' : ' completed ') + item + '.';
      break;
    case 'improve':
      match = text.match(/^建设者在 ([\s\S]+) 建成了(?:农场|矿场)。$/);
      if (match && item) return 'A builder completed a ' + item.toLowerCase() + ' in ' + match[1] + '.';
      break;
    case 'attack': {
      match = text.match(/^(开拓者|建设者|民兵|游骑兵)([\s\S]+)，造成 (\d+) 点伤害。$/);
      if (!match) break;
      const attacker = oldUnits[match[1]], order = match[2], damage = match[3];
      if (order.startsWith('占领了 ')) return attacker + ' captured ' + order.slice(4) + ', dealing ' + damage + ' damage.';
      if (order.startsWith('攻击了 ')) return attacker + ' dealt ' + damage + ' damage to ' + order.slice(4) + '.';
      const field = order.match(/^在 ([\s\S]+) 攻击了(开拓者|建设者|民兵|游骑兵)$/);
      if (field) return attacker + ' dealt ' + damage + ' damage to the enemy ' + oldUnits[field[2]] + ' in ' + field[1] + '.';
      break;
    }
    case 'finish': {
      match = text.match(/^(.+?) (占领了所有初始首府。|以 (\d+) 分(并列)?获胜。)$/);
      if (!match) break;
      const names = match[1].split('、').map(name => FACTION_NAMES[oldFactions.indexOf(name)]);
      if (!names.every(Boolean)) break;
      if (!match[3]) return names.join(' and ') + ' captured every original capital.';
      return names.join(' and ') + (names.length > 1 ? ' shared victory with ' : ' won with ') + match[3] + ' points.';
    }
  }
  return text;
}

function multiplayerContent() {
  if (room && mode === 'online') {
    const lobby = room.phase === 'lobby';
    const host = room.you === room.host;
    const roster = room.players.map(p => row((lobby ? '' : factionMark(p.id)) + '<span translate="no">' + escapeHTML(p.name) + '</span>', lobby ? 'Civilization drawn at start' : FACTION_NAMES[seatFaction(p.id)],
      [p.id === room.host && 'Host', p.id === room.you && 'You'].filter(Boolean).join(' · ')));
    const sharing = `<div class="modal-room"><span class="modal-muted">Room code</span><strong class="modal-code" translate="no">${escapeHTML(room.code)}</strong></div>` +
      actions(button('copy', 'Copy invite link'), button('show-link', inviteOpen ? 'Hide link' : 'Show link')) +
      (inviteOpen ? `<label class="modal-field">Invite link<input class="modal-input" data-invite-link readonly value="${escapeHTML(roomURL(room.code))}"></label>` : '');
    const status = lobby
      ? host ? (room.players.length >= 2 ? 'Start when everyone has joined.' : 'Send the invite link to a friend. Two players can start a campaign.')
             : 'You have a seat. The host will start the campaign.'
      : room.phase === 'finished' ? 'This campaign has ended.' : 'Campaign in progress.';
    const footer = lobby && host ? button('start', pending ? 'Starting…' : 'Start campaign', 'primary', pending || room.players.length < 2)
      : (lobby ? '' : button('back', 'Return to map', 'primary'));
    return { title: lobby ? 'Room lobby' : 'Your room', kicker: 'Multiplayer', body:
      sharing + muted(getMap(room.mapId).name) + list(roster) + muted(status) + actions(footer, button('to-solo', 'Return to solo', 'secondary', pending)) };
  }
  const joining = roomTab === 'join';
  const disabled = pending ? ' disabled' : '';
  const codeField = joining ? `<label class="modal-field">Room code<input class="modal-input" type="text" name="code" aria-label="Room code" placeholder="Six-character code" autocomplete="off" spellcheck="false" autocapitalize="characters" maxlength="6" value="${escapeHTML(joinCode)}" required${disabled}></label>` : '';
  const tabs = `<div class="modal-tabs" role="tablist" aria-label="Room options">${['create','join'].map((t, i) =>
    `<button type="button" class="modal-tab" role="tab" aria-selected="${t === roomTab}" data-act="tab-${t}"${disabled}>${i ? 'Join room' : 'Create room'}</button>`).join('')}</div>`;
  return { kicker: 'Multiplayer', title: 'Play with friends', body: tabs +
    desc(joining ? 'Enter a room code to join a friend or return to a saved seat.' : 'Create a room for 2–4 players and share its invite link.') +
    `<form class="modal-form" data-room-form><label class="modal-field">Player name<input class="modal-input" type="text" name="name" placeholder="Your name" maxlength="24" autocomplete="nickname" value="${escapeHTML(formName)}" required${disabled}></label>${codeField}${joining ? '' : mapPicker(selectedMap,pending)}<button class="modal-primary" type="submit"${disabled}>${pending ? 'Connecting…' : joining ? 'Join room' : 'Create room'}</button></form>` };
}

const guideSections = {
  start: {label:'First turn', entries:[
    ['Choose your first city site', 'Every civilization starts with one settler on a different shore or valley. Found your capital here, or explore first. Your cities begin earning income and training units after you settle.'],
    ['Found a city', 'A settler with movement left can found a city on friendly or neutral land at least three hexes from any city. Choose Found city. The settler becomes the city and nearby open land joins your faction.'],
    ['Explore the fog', 'Dark tiles are uncharted. Move a Scout to see three hexes in every direction. The shaded terrain behind it stays on your map, but enemy positions disappear when your units lose sight.'],
    ['Choose your map', 'Open Change map for Los Angeles, San Francisco or San Diego. Each region has a separate solo save. For multiplayer, the host chooses the map when creating the room.'],
    ['Give your capital a project', 'Open Cities in the Empire roster, select your capital and choose production. Your cities add food and production when you end your turn.'],
    ['Choose research', 'Open Technology and Civics beside the map. Choose a project in each council. Your faction earns science and culture separately every turn.'],
    ['Plan your turn', 'Start with two district orders per turn to claim, develop or contest land. County Federation adds a third. Units use their own movement points. End turn collects income and passes play to the next faction.']
  ]},
  city: {label:'City growth', entries:[
    ['Food and production', 'Each citizen eats two food every turn. Cities store surplus harvest for new citizens. A deficit uses the food reserve first. If it runs out, the city loses one citizen. Its founding household stays. Production advances the city queue.'],
    ['Improve nearby land', 'Builders have three charges. Build a farm on a friendly coast, lowland or urban hex, or a mine in woodland or foothills. Within two hexes of a friendly city, farms add food and mines add production to the nearest city.'],
    ['Choose a building', 'A granary provides food, a workshop adds production, a monument earns influence and walls strengthen city defenses. Each city can build one of each.'],
    ['Make room for recruits', 'Land units deploy in the city or an adjacent open, passable hex in friendly or neutral territory. Ships deploy at the harbor or in neighboring open water. Clear a deployment space before ending your turn.']
  ]},
  battle: {label:'Field tactics', entries:[
    ['Train a scout', 'A Scout is available as soon as you found a city. It has three movement points to a Militia unit’s two. Forests and hills still cost two points to enter.'],
    ['Read the terrain', 'Check the selected unit’s movement allowance. Land units spend one point on coast, lowlands or urban land and two in woodland or foothills. Ships travel on open water. Occupied hexes block movement.'],
    ['Preview an attack', 'Select a military unit and click a highlighted enemy. The combat forecast shows the damage and possible losses. Choose Confirm attack to commit, or return to the map to reconsider. An attack spends the unit’s remaining movement.'],
    ['Take a city', 'Melee units strike adjacent targets and can take counterdamage. Rangers can strike from two hexes away without a counterattack. Defeat the garrison first. A ranged attack can reduce a city to one health point. A surviving melee attacker can capture it.'],
    ['Upgrade in the field', 'After the required discovery, select a veteran in your territory and pay the displayed capital cost to upgrade it. The unit keeps its health proportion and spends the rest of its movement.'],
    ['Recover', 'Units regain movement at the start of their faction’s turn. A unit in a friendly city heals up to 12 health. Each friendly city recovers up to 6.']
  ]},
  coast: {label:'At sea', entries:[
    ['Choose a harbor site', 'Found on the shore or connect a city to your own coast within two hexes. Choose Harbor in city production. The harbor reserves an adjacent water hex and earns capital.'],
    ['Put a crew to work', 'Train a Fishing crew at a harbor. Sail to open water within two water hexes of a friendly harbor and build a Fishery. Each crew has two charges.'],
    ['Launch a fleet', 'A harbor trains Revenue cutters. Add a Shipyard and research Steam Power to build Steam frigates. Ships bombard the shore; bring a land unit to occupy a city.']
  ]},
  research: {label:'Research & victory', entries:[
    ['Choose a specialization', 'Workshop Engineering opens Steam Power and then Radio Networks. Field Tactics leads to Ballistics. Learn both Steam Power and Ballistics to unlock Motorization and train an Armored Column.'],
    ['Build up science', 'Cities, population and discoveries contribute science. Culture funds a separate civic project at the same time. Switch projects without losing saved points. Surplus science and culture carry over.'],
    ['Choose a civic path', 'Municipal Charter leads to County Federation for another district order, or Park Conservancies for terrain bonuses. Completing a project from a later era advances your faction.'],
    ['Win by domination', 'Control every participating faction’s original capital to win immediately.'],
    ['Win on civic points', `If a faction reaches ${TARGET_SCORE} civic points, finish the current round and compare scores. The same scoring applies after round ${MAX_ROUNDS}. The highest score wins, and a tie shares victory.`],
    ['Count civic points', 'Score 2 per district, 1 per development level and 2 per landmark. Cities earn 3 each, plus 1 per resident, 2 per finished building and 1 per land improvement.']
  ]}
};
function countLabel(n, singular, plural = singular + 's') {
  return n + ' ' + (n === 1 ? singular : plural);
}
function content() {
  const state = getState();
  if (modal === 'multiplayer') return multiplayerContent();
  if (modal === 'supplies') return {kicker:'Economy',title:'Supply ledger',body:ledgerBody(state,currentSeat(),getResourceLedger(state,currentSeat()),supplyCity,pending,escapeHTML)};
  if (modal === 'help') {
    const tabs = `<div class="modal-tabs" role="tablist" aria-label="Field guide chapters">${Object.entries(guideSections).map(([key,section]) =>
      `<button type="button" class="modal-tab" role="tab" aria-selected="${guideTab === key}" data-act="guide-${key}">${section.label}</button>`).join('')}</div>`;
    return {kicker:'Field guide', title:'How to play', body:tabs +
      list(guideSections[guideTab].entries.map(([title, text]) => row(title, text))) + actions(button('back', 'Return to map', 'primary'))};
  }
  if (modal === 'log') return {
    kicker: 'Campaign records', title: 'Event log',
    body: state.log.length ? list([...state.log].reverse().map(entry => row(escapeHTML(eventText(entry)),
      'Round ' + escapeHTML(entry.round), Number.isInteger(entry.seat) && FACTIONS[entry.seat] ? factionMark(entry.seat) : ''))) : muted('No events yet.')
  };
  if (modal === 'standings') {
    const winnersFirst = seat => Number(state.winners?.includes(seat));
    const ranked = state.players.map((p, seat) => ({seat, name:p.name, stats:getStats(state,seat)}))
      .sort((a,b)=>winnersFirst(b.seat)-winnersFirst(a.seat) || b.stats.score-a.stats.score);
    const winners = (state.winners || []).map(seat => FACTION_NAMES[seatFaction(seat)]);
    const label = winners.join(' and ') + (state.victoryReason === 'survival' ? ' is the last civilization standing.' : state.victoryReason === 'domination' ? ' captured every original capital.' : winners.length > 1 ? ' tied on civic points and share victory.' : ' won on civic points.');
    return { kicker: 'Campaign records', title: state.phase === 'finished' ? 'Campaign complete' : 'Faction standings',
      body: desc(state.phase === 'finished' ? label : `Holding every original capital wins immediately. Civic points are compared at the end of the round when a faction reaches ${TARGET_SCORE}, or after round ${MAX_ROUNDS}.`) +
        list(ranked.map(({seat,name,stats}) => row(factionMark(seat) + FACTION_NAMES[seatFaction(seat)],
          [mode === 'online' && '<span translate="no">'+escapeHTML(name)+'</span>', seat===currentSeat()?countLabel(stats.cities,'city','cities'):'In sight', countLabel(stats.units,'unit'), countLabel(stats.territories,'district')].filter(Boolean).join(' · '), (seat===currentSeat()||state.phase==='finished') ? escapeHTML(state.players[seat].score ?? stats.score)+' pts' : '—'))) +
        actions(button('back','Return to map','primary')) };
  }
  if (modal === 'campaign-atlas') {
    const saved=campaignSave(selectedMap);
    const status=saved ? getMap(selectedMap).name+' · Round '+saved.round : 'No campaign started on this map.';
    return {kicker:'California campaigns', title:'Campaign atlas',
      body:mapPicker(selectedMap)+muted(status)+actions(button('load-region',saved?'Resume campaign':'Start campaign','primary'))};
  }
  if (modal === 'restart') return {kicker:'Solo campaign', title:'Start a new campaign?',
    body:mapPicker(selectedMap) + desc('Starting over replaces the saved campaign on the selected map. Your other regions keep their progress.') + actions(button('restart','Start new campaign','primary'),button('menu','Keep playing'))};
  return {kicker:'Command center', title:'Game menu', body:actions(
    button('multiplayer', room ? 'Multiplayer room' : 'Play with friends', 'primary'),button('standings','Faction standings'),button('log','Event log'),
    button('help','Field guide'), button('supplies','Supply ledger'), mode === 'solo' ? button('campaign-atlas','Campaign atlas') : '', mode === 'solo' ? button('confirm-restart','New solo campaign') : button('to-solo','Return to solo'))};
}

function drawDialog() {
  if (!modal || !dialog) return;
  const scrolled = dialog.querySelector('.modal-body')?.scrollTop || 0;
  const { kicker, title, body } = content();
  dialog.innerHTML = `<div class="modal-shell"><div class="modal-head"><div><div class="modal-kicker">${kicker}</div><h2 class="modal-title" id="game-dialog-title" tabindex="-1">${title}</h2></div><button type="button" class="modal-close" aria-label="Close dialog" data-act="back">×</button></div><div class="modal-body">${body}${modal === 'menu' ? languageControl() : ''}${errorMessage ? `<p class="modal-error" role="alert" tabindex="-1">${escapeHTML(errorMessage)}</p>` : ''}</div></div>`;
  dialog.setAttribute('aria-labelledby','game-dialog-title');
  dialog.querySelector('.modal-body').scrollTop = scrolled;
}
function keepForm() {
  const form = dialog.querySelector('form[data-room-form]');
  if (!form) return;
  formName = form.elements.name.value;
  if (form.elements.code) joinCode = canonicalCode(form.elements.code.value);
}
async function copyInvite() {
  if (!room) return;
  try {
    await navigator.clipboard.writeText(roomURL(room.code));
    toast?.('Invite link copied.');
  } catch {
    inviteOpen = true;
    drawDialog();
    const input = dialog.querySelector('[data-invite-link]');
    input?.focus();
    input?.select();
    toast?.('Select and copy the invite link.');
  }
}
function modalAction(act) {
  if(act==='supplies'){open('supplies');return}
  if(act.startsWith('cargo-')){
    const [,resource,market]=act.split('-');
    const city=dialog.querySelector('[name=supply-city]')?.value;
    if(city)supplyCity=city;
    doAction({type:'shipment',resource,market,city});return;
  }
  if (act === 'language-en' || act === 'language-zh-CN') {
    setLanguage(act.slice(9));
    drawDialog();
    emit();
    dialog.querySelector('[data-act="language-'+getLanguage()+'"]')?.focus();
    return;
  }
  if (act.startsWith('guide-') && Object.hasOwn(guideSections,act.slice(6))) {
    guideTab = act.slice(6);
    drawDialog();
    dialog.querySelector('.modal-body').scrollTop = 0;
    return;
  }
  if (act === 'tab-create' || act === 'tab-join') {
    if (pending) return;
    keepForm();
    roomTab = act.slice(4);
    errorMessage = '';
    drawDialog();
  } else if (act === 'back') close();
  else if (act === 'copy') copyInvite();
  else if (act === 'show-link') { inviteOpen = !inviteOpen; drawDialog(); }
  else if (act === 'to-solo' && !pending) { returnToSolo(); toast?.('Solo campaign resumed. Use the room code to return to your seat.'); }
  else if (act === 'start') mutate('start');
  else if (act === 'campaign-atlas') open('campaign-atlas');
  else if (act === 'load-region') {
    const target=campaignSave(selectedMap)||freshSolo(selectedMap);
    archiveSolo();
    solo=target;
    save(SOLO_KEY, solo);
    resultShown='';
    returnToSolo();
  }
  else if (act === 'confirm-restart') open('restart');
  else if (act === 'restart') {
    archiveSolo();
    solo = freshSolo(selectedMap);
    resultShown = '';
    save(SOLO_KEY, solo);
    returnToSolo();
    toast?.('New campaign started.');
  } else if (['menu','multiplayer','standings','log','help'].includes(act)) open(act);
}

async function init({ render, toast: showToast }) {
  renderView = render;
  toast = showToast;
  if (initialized) { emit(); return; }
  initialized = true;
  installMapStyles();
  installLanguage();
  dialog = document.getElementById('modal');
  dialog.addEventListener('change', e => {
    if (e.target.name !== 'mapId') return;
    selectedMap=e.target.value;
    if (modal === 'campaign-atlas') {
      drawDialog();
      dialog.querySelector('input[name="mapId"]:checked')?.focus();
    }
  });
  solo = storedSolo();
  formName = String(read(NAME_KEY, '') || '');
  dialog.addEventListener('click', e => {
    const btn = e.target.closest('button[data-act]');
    if (btn) modalAction(btn.dataset.act);
    else if (e.target === dialog) {
      const bounds = dialog.getBoundingClientRect();
      if (e.clientX < bounds.left || e.clientX > bounds.right || e.clientY < bounds.top || e.clientY > bounds.bottom) close();
    }
  });
  dialog.addEventListener('submit', e => {
    if (e.target.matches('[data-room-form]')) { e.preventDefault(); seatRequest(e.target); }
  });
  dialog.addEventListener('cancel', () => { modal = ''; errorMessage = ''; });
  dialog.addEventListener('close', () => { if (!dialog.open) modal = ''; });
  document.addEventListener('visibilitychange', () => {
    if (mode === 'online' && !document.hidden && !polling) { clearTimeout(pollTimer); poll(); }
  });
  const invite = canonicalCode(new URL(location.href).searchParams.get('room'));
  const code = invite || canonicalCode(read(LAST_ROOM_KEY, ''));
  const savedToken = validCode(code) ? read(SEATS_KEY, {})[code] : null;
  emit();
  if (savedToken) {
    pending = true;
    emit();
    try {
      const result = await requestRoom({ code, auth:savedToken });
      connect(result.room,savedToken);
    } catch (error) {
      if ([401,403,404].includes(error.status)) { forgetSeat(code); save(LAST_ROOM_KEY,null); }
      open('multiplayer','join',code);
      showError(error.message);
    } finally {
      pending = false;
      if (modal) drawDialog();
      emit();
    }
  } else if (invite) {
    open('multiplayer','join',invite);
    if (!validCode(invite)) showError('This invitation has an invalid room code.');
  }
  if (mode === 'solo') runBots();
  if (!modal) checkFinished();
}
export const Game = {init, doAction, eventText, endTurn:()=>doAction('end'), open, close};
window.Game = Game;
