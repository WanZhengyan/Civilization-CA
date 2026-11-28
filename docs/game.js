import {installSoundtrack,soundtrackControls} from './music-controls.js';
import {fishingGuide,inlandGuide,freightGuide,voyageGuide} from './maritime-guide.js';
import {captureRoomOrder,isComputerActing,recoveryMessage,roomSeatTurn,teamMemberStatus} from './room-turn.js';
import {DEFAULT_MAP_SIZE,validNewMapSize} from './maps.js';
import {advancementGuide,recoveryGuide} from './unit-service-copy.js';
import {naturalWonderArt} from './natural-wonder-art.js';
import {discoveredNaturalWonders} from './natural-wonders.js';
import {invitationCode, launchDestination} from './launch.js';
import {armyHandbook} from './army-handbook.js';
import {ledgerBody} from './resource-ledger.js';
import {getResourceLedger} from './rules.js';
import {getLanguage, installLanguage, languageControl, observeCityNames, setLanguage} from './i18n.js';
import {SCIENCE_PROJECT} from './victory-rules.js';
import {victoryPanel} from './victory-panel.js';
import {modeLabels,modePicker,civilizationPicker,civilizationName,compareCivilizations,validCivilization} from './campaign-choices.js';
import {mapPicker, sizePicker, sizeName, rivalPicker, installMapStyles} from './regions-ui.js';
import {newSolo, restoreSolo, soloSlotKey, SOLO_KEY} from './solo-saves.js';
import {changeRoomSetup,difficultyField,difficultyLabel,newRoomSetup,roomSetupFields,teamLabel,validRoomTeams} from './room-setup.js';
import { campaignView, FACTIONS, UNIT_TYPES, BUILDINGS, IMPROVEMENTS, applyAction, chooseBotAction, getStats, getMap } from './rules.js';

import {getEra, getScoreTarget, TARGET_SCORE, MAX_ROUNDS} from './rules.js';

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

function archiveSolo() {
  if (solo) save(soloSlotKey(getMap(solo).id,solo.mapSize), solo);
}
function campaignSave(mapId, size) {
  const matches = state => state && getMap(state).id === mapId && (state.mapSize || 'standard') === size;
  if (matches(solo)) return solo;
  const saved = read(soloSlotKey(mapId,size),null);
  return matches(saved) ? restoreSolo(saved) : null;
}
function selectCampaignSettings(state) {
  selectedMap = getMap(state).id;
  selectedSize=validNewMapSize(state?.mapSize)?state.mapSize:DEFAULT_MAP_SIZE;
  selectedRivals = state?.players ? state.players.length - 1 : 3;
  selectedMode = 'standard';
  selectedCivilization = 'random';
  selectedDifficulty = state?.difficulty || 'normal';
}

let soundtrack;
let renderView, locateDistrict, toast, dialog, solo, room = null, token = null;
let mode = 'home', modal = '', roomTab = 'create', joinCode = '', formName = '';
let selectedMap = 'la';
let selectedSize = DEFAULT_MAP_SIZE, selectedRivals = 3, selectedDifficulty = 'normal';
let selectedMode='standard', selectedCivilization='random', roomVictoryMode='standard', joinCivilization='random';
let roomSetup=newRoomSetup();
let supplyCity='';
let pending = false, errorMessage = '', playingBots = false;
let unconfirmedOrder=null;
let pollTimer, polling = false, roomEpoch = 0, offline = false, initialized = false;
let inviteOpen = false, resultShown = '', guideTab = 'start';
let renderedSource, renderedSeat, renderedView;
function getState() {
  const source=mode==='online' && room?.game ? room.game : solo;
  const seat=currentSeat();
  if (source!==renderedSource || renderedSeat!==seat) {
    renderedSource=source;
    renderedSeat=seat;
    renderedView=campaignView(source,seat);
  }
  return renderedView;
}
const currentSeat = () => mode === 'online' && room ? room.you : 0;
function updateRoomShortcut() {
  const code = read(LAST_ROOM_KEY, '');
  const shortcut = document.querySelector('[data-title="reconnect"]');
  if (!shortcut) return;
  shortcut.hidden = !(validCode(code) && read(SEATS_KEY,{})[code]);
  shortcut.querySelector('[data-last-room]').textContent = shortcut.hidden ? '' : code;
}

function showTitle(visible) {
  if (visible) { updateRoomShortcut(); soundtrack?.music.setScene(null); }
  const screen = document.getElementById('title-screen');
  const leavingTitle = !visible && !screen.hidden;
  screen.hidden = !visible;
  document.body.classList.toggle('on-title', visible);
  document.dispatchEvent(new Event('civitas-screen'));
  if (leavingTitle) requestAnimationFrame(() => {
    if (screen.hidden && !dialog?.open) document.getElementById('board-nav')?.focus({preventScroll:true});
  });
}

function emit() {
  if (mode === 'home' || (mode === 'online' && !room?.game)) return;
  if (modal==='supplies' && dialog?.open) drawDialog();
  const state = getState();
  soundtrack?.music.setScene(state ? getEra(state,currentSeat()).id : null);
  if (state) observeCityNames(state.cities || [], getMap(state).byId);
  renderView?.({
    state, seat: currentSeat(), room, session: mode==='solo' ? solo.seed : room?.code,
    mode, roomStatus:mode==='online' ? (offline?'Reconnecting…':unconfirmedOrder && !pending?'Checking order…':'') : '',
    busy: pending || (mode==='online' && offline) || (mode==='online' && !!unconfirmedOrder) || (mode === 'solo' && playingBots) || (mode === 'online' && !room?.game)
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
function updateURL(code, board = false) {
  const url = new URL(location.href);
  if (code) url.searchParams.set('room', code);
  else url.searchParams.delete('room');
  if (board) url.hash = 'campaign';
  else if (url.hash === '#campaign') url.hash = '';
  history.replaceState(null, '', url);
}
function checkFinished() {
  if (mode === 'home') return;
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
  if (playingBots || mode !== 'solo' || !solo || solo.phase !== 'playing' || !solo.players[solo.turn].bot) return;
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

async function requestRoom({ op, code, name, revision, action, auth, ticket, mapId, mapSize, seats, orderKey, actionId, victoryMode, civilization, seat }) {
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
      body: isGet ? undefined : JSON.stringify({ op, code, name, revision, action, ticket, mapId, mapSize, seats, orderKey, actionId, victoryMode, civilization, seat })
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
  showTitle(!room.game);
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

function journalKey(code,seat) { return 'civitas.room-order.'+code+'.'+seat; }
function rememberOrder(request) {
  unconfirmedOrder=request;
  if(!room) return;
  try {
    const key=journalKey(room.code,room.you);
    if(request) sessionStorage.setItem(key,JSON.stringify(request));
    else sessionStorage.removeItem(key);
  } catch { /* This tab can recover in memory when storage is unavailable. */ }
}
function restoreOrder(incoming) {
  try {
    const key=journalKey(incoming.code,incoming.you);
    const request=JSON.parse(sessionStorage.getItem(key) || 'null');
    if(request?.op==='action' && request.code===incoming.code && (request.orderKey || request.actionId)) return request;
    sessionStorage.removeItem(key);
  } catch { /* Starting in a fresh tab is safe. */ }
  return null;
}

function settleOrder() {
  if(!unconfirmedOrder) return true;
  const message=recoveryMessage(room,unconfirmedOrder);
  if(!message) return false;
  rememberOrder(null);
  emit();
  toast?.(message);
  return true;
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
  unconfirmedOrder=restoreOrder(incoming);
  syncRoom(incoming);
  if (incoming.phase === 'lobby' && showLobby) open('multiplayer');
  else if (modal === 'multiplayer') close();
  settleOrder();
  schedulePoll();
}

function schedulePoll() {
  clearTimeout(pollTimer);
  if (mode !== 'online' || !room || (room.phase === 'finished' && !unconfirmedOrder)) return;
  const computerTurn=!offline && isComputerActing(room.game);
  pollTimer = setTimeout(poll, document.hidden ? 7000 : computerTurn ? 450 : 1400);
}

async function poll() {
  if (polling || mode !== 'online' || !room) return;
  const epoch = roomEpoch;
  polling = true;
  try {
    const data = await requestRoom({ code: room.code, revision: room.revision, auth: token });
    if (epoch !== roomEpoch) return;
    if (offline) { offline = false; emit(); toast?.('Reconnected to the room.'); }
    if (!data.unchanged) syncRoom(data.room);
    if(unconfirmedOrder && !pending && !settleOrder()) {
      await mutate('action',unconfirmedOrder.action,unconfirmedOrder);
    }
  } catch (error) {
    if (epoch !== roomEpoch) return;
    if ([401, 403, 404].includes(error.status)) {
      const code = room.code;
      forgetSeat(code);
      enterTitle();
      open('multiplayer', 'join', code);
      showError(error.message);
    } else if (!offline) {
      offline = true;
      emit();
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
  // A room can be the first thing a visitor opens. Let them choose their
  // first solo map instead of silently creating one when leaving the room.
  if (!solo) {
    enterTitle();
    open('campaign-atlas');
    return;
  }
  showTitle(false);
  room = token = unconfirmedOrder = null;
  offline = inviteOpen = false;
  updateURL(null,true);
  close();
  emit();
  runBots();
  checkFinished();
}

function enterSoloCampaign(target) {
  archiveSolo();
  solo = target;
  resultShown = '';
  save(SOLO_KEY,solo);
  returnToSolo();
}

function enterTitle() {
  if (pending) return;
  archiveSolo();
  roomEpoch++;
  clearTimeout(pollTimer);
  polling = false;
  mode = 'home';
  room = token = unconfirmedOrder = null;
  offline = inviteOpen = false;
  updateURL(null);
  close();
  showTitle(true);
  window.scrollTo(0,0);
  document.querySelector('[data-title="solo"]')?.focus({preventScroll:true});
}

async function seatRequest(form) {
  if (pending) return;
  const values = new FormData(form);
  if (values.get('mapId')) selectedMap = values.get('mapId');
  if (values.get('mapSize')) selectedSize = values.get('mapSize');
  const name = String(values.get('name') || '').trim();
  const code = invitationCode(values.get('code'));
  formName = name;
  if (!name || name.length > 24) return showError('Choose a player name between 1 and 24 characters.');
  if (roomTab === 'join' && !validCode(code)) return showError('Enter the six-character room code.');
  if (roomTab === 'create' && !validRoomTeams(roomSetup)) return showError('Assign the seats to at least two different teams.');
  const seats=roomTab==='create' && roomSetup.seats.length ? roomSetup.seats : undefined;
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
    const intent = [roomTab, roomTab === 'join' ? code : selectedMap, name].join('|') +
      (roomTab==='create'?'|'+selectedSize+'|'+roomVictoryMode:'|'+joinCivilization)+(seats ? '|'+JSON.stringify(seats) : '');
    let ticket = read(TICKET_KEY, null);
    if (ticket?.intent !== intent) {
      const bytes = crypto.getRandomValues(new Uint8Array(24));
      ticket = {intent, token:Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')};
      save(TICKET_KEY, ticket);
    }
    const data = await requestRoom({ op: roomTab, name, ticket:ticket.token, ...(roomTab === 'join' ? {code,civilization:joinCivilization} : {mapId:selectedMap,mapSize:selectedSize,seats,victoryMode:roomVictoryMode,civilization:seats?.[0].civilization || 'random'}) });
    if (seats && !data.room.configured) {
      save(TICKET_KEY,null);
      throw new Error('This server cannot create the requested roster. Reload the game and try again.');
    }
    const adjustedSize=roomTab==='create' && (data.room.mapSize||'standard')!==selectedSize;
    connect(data.room, data.token);
    save(TICKET_KEY, null);
    if(adjustedSize)showError('This room server opened a different chart size. Its map size is shown in the lobby.');
  } catch (error) { showError(error.message); }
  finally {
    pending = false;
    if (modal === 'multiplayer') drawDialog();
    emit();
  }
}

async function mutate(op, action, retry=null) {
  if (pending || !room || !token || (unconfirmedOrder && !retry)) return;
  const epoch = roomEpoch;
  const request = retry || (op==='action' ? captureRoomOrder(room,action) : {op,code:room.code,revision:room.revision,...(op==='civilization'?action:{})});
  const journaled=Boolean(request.actionId || request.orderKey);
  if(journaled) rememberOrder(request);
  pending = true;
  errorMessage = '';
  emit();
  if (modal === 'multiplayer') drawDialog();
  try {
    const result = await requestRoom({...request,auth:token});
    if (epoch === roomEpoch) {
      if(journaled) rememberOrder(null);
      syncRoom(result.room);
      if(retry) toast?.('Your previous order was confirmed.');
    }
  } catch (error) {
    if (epoch !== roomEpoch) return;
    if(journaled && (!error.status || error.status>=500)){
      // The server may have committed this action before the connection dropped.
      // Refresh first; polling replays the saved envelope only while its key lives.
      if(!retry) toast?.('Connection interrupted. Your order will be checked on reconnect.');
      return;
    }
    if (error.status === 409 || error.status === 422 || !error.status) {
      try {
        const fresh=await requestRoom({code:room.code,auth:token});
        if(epoch!==roomEpoch) return;
        syncRoom(fresh.room);
        if(journaled && error.status===409 && settleOrder()) return;
      } catch {
        // A revision conflict can be a duplicate of a committed order. Keep
        // its journal until a successful poll can check the seat's receipts.
        if(journaled && error.status===409) return;
      }
    }
    if(journaled) rememberOrder(null);
    showError(error.message);
  } finally {
    if (epoch === roomEpoch) {
      pending = false;
      if(unconfirmedOrder && room?.phase==='finished') schedulePoll();
      if (modal === 'multiplayer') drawDialog();
      emit();
    }
  }
}

function doAction(type, tile) {
  const state = getState();
  if (mode === 'home' || pending || (mode==='online' && (offline || unconfirmedOrder)) || !state || roomSeatTurn(state,currentSeat()) !== 'active') return;
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
  if (changed && ['multiplayer','campaign-atlas','restart'].includes(kind) && !['campaign-atlas','restart'].includes(previousModal) && mode !== 'home') selectCampaignSettings(getState());
  if (changed && kind === 'multiplayer') inviteOpen = false;
  drawDialog();
  if (!dialog.open) dialog.showModal();
  if (changed && ['campaign-atlas','restart'].includes(kind)) dialog.querySelector('.modal-body').scrollTop=0;
  if (changed) dialog.querySelector('.modal-title')?.focus();
}
function dismissDialog() {
  if (modal === 'multiplayer' && pending) return;
  if (modal === 'multiplayer' && mode === 'online' && room?.phase === 'lobby') enterTitle();
  else close();
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
const row = (title, subtitle, value = '', body='') =>
  `<li class="modal-row"><div><strong>${title}</strong>${subtitle ? `<small>${subtitle}</small>` : ''}${body}</div>${value ? `<span class="modal-number">${value}</span>` : ''}</li>`;
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
    const roster = room.players.map(p => {
      const name=p.open ? '<span>Waiting for player</span>' : p.bot ? '<span>Computer</span> '+(p.id+1) : '<span translate="no">'+escapeHTML(p.name)+'</span>';
      const attributes=[room.configured && 'Seat '+(p.id+1),room.configured && teamLabel(p.team),p.bot && difficultyLabel(p.difficulty || 'normal'),!lobby && FACTION_NAMES[seatFaction(p.id)]].filter(Boolean);
      const canChoose=lobby && room.victoryMode && (p.id===room.you || (host && p.bot));
      if(lobby && room.victoryMode && !p.open && !canChoose) attributes.push(civilizationName(p.civilization));
      const pick=canChoose?civilizationPicker('lobby-civilization-'+p.id,p.civilization,room.players.map(other=>other.civilization),pending):'';
      return row((lobby ? '' : factionMark(p.id))+name,attributes.map(word=>'<span>'+escapeHTML(word)+'</span>').join(' · ') || 'Civilization drawn at start',
        [p.id===room.host && 'Host',p.id===room.you && 'You',teamMemberStatus(room.game,p.id),room.configured && !lobby && !room.game?.teamPhase && p.id===room.game?.firstSeat && 'Drew first turn'].filter(Boolean).map(word=>'<span>'+word+'</span>').join(' · '),pick);
    });
    const sharing = `<div class="modal-room"><span class="modal-muted">Room code</span><strong class="modal-code" translate="no">${escapeHTML(room.code)}</strong></div>` +
      actions(button('copy', 'Copy invite link'), button('show-link', inviteOpen ? 'Hide link' : 'Show link')) +
      (inviteOpen ? `<label class="modal-field">Invite link<input class="modal-input" data-invite-link readonly value="${escapeHTML(roomURL(room.code))}"></label>` : '');
    const ready=room.canStart ?? room.players.length>=2;
    const status = lobby
      ? host ? (ready ? 'All required seats are ready.' : room.configured ? 'Invite a friend to each open human seat before starting.' : 'Send the invite link to a friend. Two players can start a campaign.')
             : 'You have a seat. The host will start the campaign.'
      : room.phase === 'finished' ? 'This campaign has ended.' : 'Campaign in progress.';
    const footer = lobby && host ? button('start', pending ? 'Starting…' : 'Start campaign', 'primary', pending || !ready)
      : (lobby ? '' : button('back', 'Return to map', 'primary'));
    const target=room.victoryMode ? muted('<span>Victory conditions</span> · <strong>'+modeLabels[room.victoryMode]+'</strong>') : room.configured ? muted('<span>Legacy civic rules</span> · '+'<span>Team civic target</span> · '+getScoreTarget(room.game || {teams:room.players.map(p=>p.team)})) : '';
    const teamHelp=room.game?.teamPhase && room.phase==='playing' ? muted('Allies act together. Mark ready when you finish. The next team starts once every active ally is ready.') : '';
    return { title: lobby ? 'Room lobby' : 'Your room', kicker: 'Multiplayer', body:
      sharing + muted(campaignSummary(room.game ? getMap(room.game) : getMap(room.mapId,room.mapSize),room.mapSize)) +target+ list(roster) + (lobby && room.victoryMode?compareCivilizations():'') + teamHelp + muted(status) + actions(footer, button('title-screen', 'Title screen', 'secondary', pending)) };
  }
  const joining = roomTab === 'join';
  const disabled = pending ? ' disabled' : '';
  const codeField = joining ? `<label class="modal-field">Room code<input class="modal-input" type="text" name="code" aria-label="Room code or invite link" placeholder="Room code or invite link" autocomplete="off" spellcheck="false" autocapitalize="characters" maxlength="2048" value="${escapeHTML(joinCode)}" required${disabled}></label>` : '';
  const tabs = `<div class="modal-tabs" role="tablist" aria-label="Room options">${['create','join'].map((t, i) =>
    `<button type="button" class="modal-tab" role="tab" aria-selected="${t === roomTab}" data-act="tab-${t}"${disabled}>${i ? 'Join room' : 'Create room'}</button>`).join('')}</div>`;
  const playerField = `<label class="modal-field">Player name<input class="modal-input" type="text" name="name" placeholder="Your name" maxlength="24" autocomplete="nickname" value="${escapeHTML(formName)}" required${disabled}></label>`;
  return { kicker: 'Multiplayer', title: joining ? 'Join room' : 'Create room', body: tabs +
    desc(joining ? 'Enter a room code or invitation link. New players take the first open human seat. This device remembers your seat.' : 'Choose the number of seats, then set a player and team for each.') +
    `<form class="modal-form" data-room-form>${joining ? playerField+codeField+civilizationPicker('joinCivilization',joinCivilization,[],pending)+compareCivilizations() : roomSetupFields(roomSetup,pending)+modePicker('roomVictoryMode',roomVictoryMode,false,pending)+playerField+campaignPicker(pending)}<button class="modal-primary" type="submit"${disabled || (!joining && !validRoomTeams(roomSetup) ? ' disabled' : '')}>${pending ? 'Connecting…' : joining ? 'Join room' : 'Create room'}</button></form>` };
}

function campaignPicker(disabled=false) {
  return mapPicker(selectedMap,disabled,selectedSize) + sizePicker(selectedMap,selectedSize,disabled);
}

function campaignSummary(map,size) {
  return `<span>${escapeHTML(map.name)}</span> · <span>${sizeName(size)}</span> · ${map.tiles.length} <span>playable hexes</span>`;
}

function soloSettingsSummary(rivals,victory,difficulty,legacyTarget) {
  return `<span>Computer opponents</span> ${rivals}${rivals ? ' · <span>'+difficultyLabel(difficulty)+'</span>' : ''} · ${victory?'<span>'+modeLabels[victory]+'</span>':'<span>Legacy civic rules</span> · '+legacyTarget+' <span>civic points</span>'}`;
}

function savedCampaignCard(saved,resumable) {
  if (!saved) return '';
  const locality = campaignSummary(getMap(saved),saved.mapSize);
  const settings = soloSettingsSummary(saved.players.length-1,saved.victoryMode,saved.difficulty,getScoreTarget(saved));
  const oldCoastline = saved.mapShape !== 'regional' ? muted('This save uses the original map. Start a new campaign here to play the regional coastline.') : '';
  return '<section class="solo-save-card"><div class="solo-save-heading"><h3>Saved campaign</h3>'+
    (resumable ? button('load-region','Resume campaign') : '')+'</div>'+muted(locality)+
    '<p><span>Round '+escapeHTML(saved.round)+'</span> · '+settings+'</p>'+oldCoastline+'</section>';
}

const guideSections = {
  start: {label:'First turn', entries:[
    ['Choose your first city site', 'Every civilization starts with one settler on a different shore or valley. Found your capital here, or explore first. Your cities begin earning income and training units after you settle.'],
    ['Found a city', 'With movement remaining, a settler can found a city on friendly or neutral land at least three hexes from any city. Choose Found capital for your first city or Found city for a later settlement. Nearby open land joins your territory.'],
    ['Read city markers', 'City markers use the owner’s color. A crown marks the first capital and stays with that city after capture. The green hex beside your city name estimates turns to the next district at its current population. Select the city to see the target and expansion progress. Zoom in when names overlap.'],
    ['Explore the fog', 'Each unit sees two hexes in every direction. Dark tiles are uncharted. Shaded tiles keep the terrain you explored, but enemies there are hidden.'],
    ['Survey for deposits', 'Resources are hidden at the start. Choose Survey resources on your settler to spend one movement point and reveal deposits in sight. Founding your first city also unlocks surveying. Deposits you have seen remain marked as your units move on.'],
    ['Choose your map', 'Each region and size has its own solo save. Choose a victory condition, a civilization and up to three opponents. In multiplayer the host sets the map and the victory condition.'],
    ['Give your capital a project', 'Open Cities in the Empire roster, select your capital and choose production. Your cities add food and production when you end your turn.'],
    ['Choose research', 'Open Technology and Civics beside the map. Choose a project in each council. Once you found your first city, your faction earns science and culture separately every turn.'],
    ['Fund a government program', 'In Civics, open Government policy. Municipal Charter unlocks Public lectures. Public Works unlocks Public contracts. Compare the gain with the cost in each city, then ratify a program. Open Full civic tree to inspect future policies and universities.'],
    ['Plan your turn', 'Start with two district orders per turn to claim, develop or contest land. County Federation adds a third. Units use their own movement points. End turn collects income and passes play to the next faction.']
  ]},
  city: {label:'City growth', entries:[
    ['Food and production', 'Each citizen eats two food every turn. Cities store surplus harvest for new citizens. A deficit uses the food reserve first. If it runs out, the city loses one citizen. Its founding household stays. Production advances the city queue.'],
    ['Develop a district', 'Select visible land you own. If a unit or city shares the hex, open District development in Field command. Each upgrade spends one district order and raises the level by one. Levels 1, 2 and 3 cost 5, 8 and 11 capital respectively. Level 3 is the maximum.'],
    ['Compare development returns', 'Each new level adds 1 civic point. Coast, lowland and urban districts also earn 1 more capital per turn. Woodland, foothills and mountains add 1 to base influence income. Check the preview for the change under your current policy.'],
    ['Grow city borders', 'Each resident adds one border point at the end of your turn. A city starts at eight points per district. Each new district raises the next cost by two, up to sixteen. Only visible, unclaimed land within three connected land steps qualifies. If the frontier is blocked, explore or secure a clear route. Progress pauses until a parcel opens.'],
    ['Improve nearby land', 'A builder has three charges. Work a land tile connected to a friendly city by at most two steps through your territory. Match the improvement to the deposit. Grain needs a farm, citrus an orchard, timber a lumber camp, stone a quarry, and iron a mine.'],
    ['Use stored goods', 'Each connected, improved deposit adds one good to your stockpile at the end of your turn. Open the Supply ledger to sell two matching goods for five capital or send them to one of your cities. You can make one shipment per turn.'],
    ['Plan housing', 'A new city has room for three citizens. A granary adds two places. Public Works unlocks residential quarters, which add three. A full city keeps one growth reserve and can grow after more housing opens. Choose a housing investment in the citizen panel.'],
    ['Assign citizens', 'Select your city and open Manage citizens. Food, industry and science priorities change which controlled districts are worked. Each citizen works one district or a specialist job in town. The same district cannot support two cities.'],
    ['Choose a construction tile', 'Choose a building in City production, then select one of the outlined map tiles and confirm. Municipal buildings can share the city center. Campuses need their own empty parcel. A harbor reserves a shore berth.'],
    ['Change production or buy', 'You can change the current project. This city keeps its invested production until you resume the same item. Buying an ordinary project uses treasury gold and credits work already done. Universities must use city production.'],
    ['Choose a building', 'A granary provides food, a workshop adds production, a monument earns influence and walls strengthen city defenses. Each city can build one of each.'],
    ['Make room for recruits', 'Land units deploy in the city or an adjacent open, passable hex in friendly or neutral territory. Ships deploy at the harbor or in neighboring open water. Clear a deployment space before ending your turn.']
  ]},
  formations: {label:'Unit handbook'},
  battle: {label:'Field tactics', entries:[
    ['Train a scout', 'Train a Scout after founding a city. It has three movement points to a Militia unit’s two. Move again after revealing new ground. Topographic Mapping makes foothills cost only one point for scouts and mounted scouts.'],
    ['Choose a frontier formation', 'Trail skirmishers cross woods and hills for one movement point. Pike Guards make poor targets for cavalry and gain a bonus when attacking mounted scouts.'],
    ['Support an assault', 'Siege Engineers can capture a walled city after its garrison falls. Keep a Signal Corps one hex from a friendly attacker to add 8 damage against rival civilizations. Check the forecast to see the active bonuses.'],
    ['Read the terrain', 'Check the selected unit’s movement allowance. Land units spend one point on coast, lowlands or urban land and two in woodland or foothills. Ships travel on open water. Occupied hexes block movement.'],
    ['Preview an attack', 'Select a military unit and click a highlighted enemy. The combat forecast shows the damage and possible losses. Choose Confirm attack to commit, or return to the map to reconsider. An attack spends the unit’s remaining movement.'],
    ['Take a city', 'Rangers, ranged infantry, artillery and armed ships deal damage without losing HP to retaliation, even against an adjacent target. Every attack spends the remaining movement. Melee attackers can take counterdamage. Defeat the garrison first. Shooting can reduce cities and camps to 1 HP. Send a surviving capture-capable land unit to take them.'],
    advancementGuide,
    ['Repel a raid', 'A lookout near an established city may return to its camp. Intercept it before it reports, or attack the camp before the party leaves two rounds later. A military defender within one hex of the city, or city walls, repels the raid. Raiders leave civilian units alone.'],
    ['Clear a camp', 'Watch for tan tents with a red pennant. A lookout marks an active camp nearby. Select a military unit and preview the attack. Ranged units weaken a camp; a surviving close-combat unit can clear it and earn 12 capital.'],
    recoveryGuide
  ]},
  universities: {label:'Wonders', entries:[
    ['Charter a university', 'Municipal Charter unlocks UCLA. Workshop Engineering unlocks Stanford University, Park Conservancies unlocks UC Berkeley, and Steam Power unlocks Caltech. Choose a city and open University wonders in its production menu.'],
    ['Survey the campus', 'Choose an empty land tile in your territory within two hexes of the host city. Deposits, improvements, city centers and reserved sites are protected. A matching terrain grants one additional point in the listed specialty every turn.'],
    ['Compete for a charter', 'Pay the charter fee and assign city production. The first campus of its kind to open wins the charter for this world. A competing city stops work and recovers its fee. Its spent production is lost.'],
    ['Read the opening report', 'A completed campus appears on the map. Select the campus tile to inspect its effect. Capturing its host city transfers the campus with the city.']
  ]},
  coast: {label:'At sea', entries:[
    ['Choose a harbor site', 'Found on the shore or connect a city to your own coast within two hexes. Choose Harbor in city production. The harbor reserves an adjacent water hex and earns capital.'],
    fishingGuide,
    freightGuide,
    voyageGuide,
    inlandGuide,
    ['Choose a warship', 'An ironclad is slow and tough and excels at coastal sieges. An escort destroyer moves four hexes and deals extra damage to armed ships. Both launch from a shipyard.'],
    ['Launch a fleet', 'A harbor trains Revenue cutters. Research Steam Power to unlock the Shipyard, then build one to train Steam frigates. Ships bombard the shore; bring a land unit to occupy a city.']
  ]},
  research: {label:'Research & victory', entries:[
    ['Choose a specialization', state=>!state || state.researchPace===2
      ? 'Follow Steam Power with Industrial Metallurgy and Electrical Engineering to unlock Radio Networks. The other branch of Rocketry runs through District Railways and Motorization.'
      : 'Workshop Engineering opens Steam Power and then Radio Networks. Field Tactics leads to Ballistics. Learn both Steam Power and Ballistics to unlock Motorization and train an Armored Column.'],
    ['Build up science', 'Cities, population and discoveries contribute science. Culture funds a separate civic project at the same time. Switch projects without losing saved points. Surplus science and culture carry over.'],
    ['Choose a civic path', state=>!state || state.researchPace===2
      ? 'Land Registry leads to County Federation, then Teachers Colleges and Public Libraries. Libraries increase the culture produced by monuments. On another branch, Park Conservancies rewards cities with suitable land.'
      : 'Municipal Charter leads to County Federation for another district order, or Park Conservancies for terrain bonuses. Completing a project from a later era advances your faction.'],
    ['Win by domination', state=>state?.teams ? 'A team wins immediately when its members collectively hold every original capital.' : 'In a campaign with rivals, control every participating civilization’s original capital to win immediately.'],
    ['Win on civic points', state=>{
      if(state?.teams)return '<span>Living teammates combine their civic points. Compare team totals at the end of the round when a team reaches the target, or after round 30. Tied teams share victory.</span> <strong>Team civic target</strong> · '+getScoreTarget(state);
      if(state?.practice)return 'Reach the civic target to complete practice. At round 30, practice ends with your final score.';
      return `If a faction reaches ${getScoreTarget(state)} civic points, finish the current round and compare scores. The same scoring applies after round ${MAX_ROUNDS}. The highest score wins, and a tie shares victory.`;
    }],
    ['Count civic points', 'Score 2 per district, 1 per development level and 2 per landmark. Cities earn 3 each, plus 1 per resident, 2 per finished building and 1 per land improvement.']
  ]}
};
function wonderJournal(state) {
  const discoveries=state ? discoveredNaturalWonders(state) : [];
  const region=getMap(state || 'la');
  const entries=discoveries.map(site=>{
    const label=region.byId[site.tile]?.name;
    const coordinate='('+site.tile.split(',').join(', ')+')';
    return '<li class="journal-entry">'+
      '<img src="'+escapeHTML(naturalWonderArt(site.id))+'" width="72" height="72" alt="">'+
      '<div><strong>'+escapeHTML(site.name)+'</strong><small>'+escapeHTML(site.effect)+'</small>'+
      '<span>'+(label?'<span>'+escapeHTML(label)+'</span> · ':'')+coordinate+'</span></div>'+
      button('locate-wonder-'+site.id,'Show on map')+'</li>';
  });
  const intro=state && !state.naturalWonderVersion ? 'Start a new campaign to discover natural wonders. This save keeps its original terrain.' :
    'Explore to record natural wonders here. Work a district next to a discovered site to gain its local bonus.';
  return '<h3 class="journal-heading">Natural wonders</h3>'+desc(intro)+
    (entries.length?'<ul class="wonder-journal">'+entries.join('')+'</ul>':'')+
    '<h3 class="journal-heading">University wonders</h3>';
}
function countLabel(n, singular, plural = singular + 's') {
  return n + ' ' + (n === 1 ? singular : plural);
}
function teamStandings(state){
  const finished=state.phase==='finished', winners=new Set((state.winners||[]).map(seat=>state.teams[seat]));
  const teams=[...new Set(state.teams)].sort((a,b)=>Number(winners.has(b))-Number(winners.has(a)) || a-b);
  const groups=teams.map(team=>{
    const members=state.players.map((player,seat)=>({player,seat})).filter(({seat})=>state.teams[seat]===team);
    const score=finished ? members.reduce((sum,{player})=>sum+(player.eliminated ? 0 : player.score || 0),0) : null;
    const standing=finished?' · <span>'+score+' pts</span>':'';
    const relation=team===state.teams[currentSeat()]?' · <span>Your team</span>':'';
    const rows=members.map(({player,seat})=>{
      const name=player.bot?'<span>Computer</span>':'<span translate="no">'+escapeHTML(player.name)+'</span>';
      const you=seat===currentSeat()?' · <span>You</span>':'';
      const score=finished || seat===currentSeat() ? escapeHTML(player.score ?? getStats(state,seat).score)+' pts' : '';
      return row(factionMark(seat)+'<span>'+FACTION_NAMES[seatFaction(seat)]+'</span>',name+you,score);
    });
    return '<section class="room-team-record"><h3><span>'+teamLabel(team)+'</span>'+relation+standing+'</h3>'+list(rows)+'</section>';
  });
  const result=finished ? desc('<span>'+(winners.size>1?'Shared victory':'Winning team')+'</span> · '+
    [...winners].map(team=>'<span>'+teamLabel(team)+'</span>').join(' · '))+
    muted(({domination:'All original capitals controlled',survival:'Last surviving team',civic:'Team civic points'})[state.victoryReason] || 'Team civic points')
    : muted('<span>Team civic target</span> · '+getScoreTarget(state));
  return {kicker:'Campaign records',title:finished?'Campaign complete':'Team standings',
    body:result+groups.join('')+actions(button('back','Return to map','primary'))};
}
function content() {
  const state = getState();
  if (modal === 'multiplayer') return multiplayerContent();
  if (modal === 'supplies') return {kicker:'Economy',title:'Supply ledger',body:ledgerBody(state,currentSeat(),getResourceLedger(state,currentSeat()),supplyCity,pending,escapeHTML,getStats(state,currentSeat()))};
  if (modal === 'help') {
    const tabs = `<div class="modal-tabs" role="tablist" aria-label="Field guide chapters">${Object.entries(guideSections).map(([key,section]) =>
      `<button type="button" class="modal-tab" role="tab" aria-selected="${guideTab === key}" data-act="guide-${key}">${section.label}</button>`).join('')}</div>`;
    let entries=guideSections[guideTab].entries;
    if(state && state.campaignVariety!==1)entries=entries.filter(entry=>entry!==freightGuide && entry!==voyageGuide);
    if(guideTab==='research' && (!state || state.victoryMode)){
      entries=entries.filter(([title])=>!['Win by domination','Win on civic points'].includes(title));
      if(!state || (!state.practice && state.victoryMode!=='science')) entries.push(['Conquest victory','Your side wins by controlling every original capital or by being the last side with a surviving civilization.']);
      if(!state || state.victoryMode!=='conquest') entries.push(['Science victory',
        '<span>Research Radio Networks and Motorization, then Rocketry. In City production, choose Orbital Survey. Finish it in one city to win for your entire side.</span> <strong>Production required</strong> · '+SCIENCE_PROJECT.required]);
    }
    return {kicker:'Field guide', title:'How to play', body:tabs +
      (guideTab==='start' && (!state || state.civilizationTraits===1) ? compareCivilizations() : '') +
      (guideTab === 'universities' ? wonderJournal(state) : '') +
      (guideTab === 'formations' ? armyHandbook(escapeHTML) : list(entries.map(([title, text]) => row(title, typeof text === 'function' ? text(state) : text)))) + actions(button('back', 'Return to map', 'primary'))};
  }
  if (modal === 'log') return {
    kicker: 'Campaign records', title: 'Event log',
    body: actions(button('battle-reports',getLanguage()==='zh-CN'?'战报':'Battle reports')) + (state.log.length ? list([...state.log].reverse().map(entry => row(escapeHTML(eventText(entry)),
      'Round ' + escapeHTML(entry.round), Number.isInteger(entry.seat) && FACTIONS[entry.seat] ? factionMark(entry.seat) : ''))) : muted('No events yet.'))
  };
  if (modal === 'standings') {
    if(state.victoryMode) return {kicker:'Campaign records',title:state.phase==='finished'?'Campaign complete':'Victory progress',
      body:victoryPanel(state,currentSeat(),escapeHTML)+actions(button('back','Return to map','primary'))};
    if(state.teams) return teamStandings(state);
    if (state.practice) {
      const finished = state.phase === 'finished';
      const score = state.players[0].score ?? getStats(state,0).score;
      const title = finished ? (state.winners?.includes(0) ? 'Practice goal reached' : 'Practice complete') : 'Faction standings';
      return {kicker:'Campaign records',title,body:
        list([row(factionMark(0)+FACTION_NAMES[seatFaction(0)],'Civic points',escapeHTML(score)+' / '+getScoreTarget(state))])+
        (finished ? '' : desc('Reach the civic target to complete practice. At round 30, practice ends with your final score.'))+
        actions(button('back','Return to map','primary'))};
    }
    const winnersFirst = seat => Number(state.winners?.includes(seat));
    const ranked = state.players.map((p, seat) => ({seat, name:p.name, stats:getStats(state,seat)}))
      .sort((a,b)=>winnersFirst(b.seat)-winnersFirst(a.seat) || b.stats.score-a.stats.score);
    const winners = (state.winners || []).map(seat => FACTION_NAMES[seatFaction(seat)]);
    const label = winners.join(' and ') + (state.victoryReason === 'survival' ? ' is the last civilization standing.' : state.victoryReason === 'domination' ? ' captured every original capital.' : winners.length > 1 ? ' tied on civic points and share victory.' : ' won on civic points.');
    return { kicker: 'Campaign records', title: state.phase === 'finished' ? 'Campaign complete' : 'Faction standings',
      body: desc(state.phase === 'finished' ? label : `Holding every original capital wins immediately. Civic points are compared at the end of the round when a faction reaches ${getScoreTarget(state)}, or after round ${MAX_ROUNDS}.`) +
        list(ranked.map(({seat,name,stats}) => row(factionMark(seat) + FACTION_NAMES[seatFaction(seat)],
          [mode === 'online' && '<span translate="no">'+escapeHTML(name)+'</span>', seat===currentSeat()?countLabel(stats.cities,'city','cities'):'In sight', countLabel(stats.units,'unit'), countLabel(stats.territories,'district')].filter(Boolean).join(' · '), (seat===currentSeat()||state.phase==='finished') ? escapeHTML(state.players[seat].score ?? stats.score)+' pts' : '—'))) +
        actions(button('back','Return to map','primary')) };
  }
  if (modal === 'campaign-atlas') {
    const saved=campaignSave(selectedMap,selectedSize);
    const archived=campaignSave(selectedMap,'standard');
    const classic=archived?'<section class="solo-classic-save"><h3>Classic campaign</h3>'+
      muted(campaignSummary(getMap(archived),'standard'))+actions(button('load-classic','Resume classic map'))+'</section>':'';
    return {kicker:'California campaigns', title:'Solo game setup',
      body:savedCampaignCard(saved,true)+classic+'<section class="solo-new-setup"><h3>New campaign settings</h3>'+
        rivalPicker(selectedRivals)+(selectedRivals ? difficultyField(selectedDifficulty) : '')+modePicker('soloVictoryMode',selectedMode,selectedRivals===0)+civilizationPicker('soloCivilization',selectedCivilization)+compareCivilizations()+sizePicker(selectedMap,selectedSize)+
        mapPicker(selectedMap,false,selectedSize)+actions(button('start-configured',saved?'Start new campaign':'Start campaign','primary'))+
        '</section>'};
  }
  if (modal === 'restart') return {kicker:'Solo campaign', title:'Replace saved campaign?',
    body:savedCampaignCard(campaignSave(selectedMap,selectedSize),false)+
      '<section class="solo-new-setup"><h3>New campaign settings</h3>'+muted(campaignSummary(getMap(selectedMap,selectedSize),selectedSize))+
      muted(soloSettingsSummary(selectedRivals,selectedMode,selectedDifficulty)+' · <span>'+civilizationName(selectedCivilization)+'</span>')+'</section>'+
      desc('Starting over replaces the solo save for this region and size.')+
      actions(button('campaign-atlas','Edit settings'),button('restart','Replace and start','primary'))};
  return {kicker:'Command center', title:'Game menu', body:actions(
    button('multiplayer', room ? 'Multiplayer room' : 'Play with friends', 'primary'),button('standings',state?.victoryMode?'Victory progress':'Faction standings'),button('log','Event log'),
    button('help','Field guide'), button('supplies','Supply ledger'), button('title-screen','Title screen'), mode === 'solo' ? button('campaign-atlas','Solo game setup') : button('to-solo','Return to solo'))};
}

function drawDialog() {
  if (!modal || !dialog) return;
  const scrolled = dialog.querySelector('.modal-body')?.scrollTop || 0;
  const { kicker, title, body } = content();
  dialog.innerHTML = `<div class="modal-shell"><div class="modal-head"><div><div class="modal-kicker">${kicker}</div><h2 class="modal-title" id="game-dialog-title" tabindex="-1">${title}</h2></div><button type="button" class="modal-close" aria-label="Close dialog" data-act="back"${pending && modal==='multiplayer' ? ' disabled' : ''}>×</button></div><div class="modal-body">${body}${modal === 'menu' ? languageControl()+soundtrackControls(soundtrack?.music) : ''}${errorMessage ? `<p class="modal-error" role="alert" tabindex="-1">${escapeHTML(errorMessage)}</p>` : ''}</div></div>`;
  if (modal==='menu') soundtrack?.refresh();
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
  if (act.startsWith('locate-wonder-')) {
    const match=discoveredNaturalWonders(getState()).find(site=>site.id===act.slice('locate-wonder-'.length));
    if (match) {
      dismissDialog();
      locateDistrict?.(match.tile);
    }
    return;
  }
  if(act==='plan-rocketry'){
    dismissDialog();
    document.dispatchEvent(new CustomEvent('civitas-plan-research',{detail:{item:'rocketry'}}));
    return;
  }
  if(act==='battle-reports'){dismissDialog();document.dispatchEvent(new Event('civitas-battle-history'));return;}
  if(act==='title-screen'){enterTitle();return}
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
  } else if (act === 'back') dismissDialog();
  else if (act === 'copy') copyInvite();
  else if (act === 'show-link') { inviteOpen = !inviteOpen; drawDialog(); }
  else if (act === 'to-solo' && !pending) { returnToSolo(); }
  else if (act === 'start') mutate('start');
  else if (act === 'campaign-atlas') open('campaign-atlas');
  else if ((act==='load-region'||act==='load-classic') && modal==='campaign-atlas') {
    const saved=campaignSave(selectedMap,act==='load-classic'?'standard':selectedSize);
    if (saved) enterSoloCampaign(saved);
    else drawDialog();
  } else if ((act === 'start-configured' && modal === 'campaign-atlas') || (act === 'restart' && modal === 'restart')) {
    if (act === 'start-configured' && campaignSave(selectedMap,selectedSize)) open('restart');
    else {
      enterSoloCampaign(newSolo(selectedMap,selectedSize,selectedRivals,TARGET_SCORE,selectedDifficulty,{victoryMode:selectedMode,civilization:selectedCivilization}));
      toast?.('New campaign started.');
    }
  } else if (['menu','multiplayer','standings','log','help'].includes(act)) open(act);
}

async function reconnectRoom(code) {
  const savedToken = read(SEATS_KEY,{})[code];
  if (!savedToken || pending) return;
  open('multiplayer','join',code);
  pending = true;
  drawDialog();
  try {
    const result = await requestRoom({code,auth:savedToken});
    connect(result.room,savedToken);
  } catch (error) {
    if ([401,403,404].includes(error.status)) {
      forgetSeat(code);
      if (read(LAST_ROOM_KEY,'') === code) save(LAST_ROOM_KEY,null);
      updateRoomShortcut();
    }
    showError(error.message);
  } finally {
    pending = false;
    if (modal) drawDialog();
    emit();
  }
}

async function init({ render, locate, toast: showToast }) {
  renderView = render;
  locateDistrict = locate;
  toast = showToast;
  if (initialized) { emit(); return; }
  initialized = true;
  installMapStyles();
  installLanguage();
  dialog = document.getElementById('modal');
  soundtrack=installSoundtrack(dialog);
  dialog.addEventListener('change', e => {
    const {name,value} = e.target;
    if (name==='rivals' || name==='soloDifficulty') {
      if(name==='rivals') {
        selectedRivals=Number(value);
        if (!selectedRivals && selectedMode==='conquest') selectedMode='standard';
      }
      else selectedDifficulty=value;
      drawDialog();
      dialog.querySelector(name==='rivals'?'input[name="rivals"]:checked':'select[name="soloDifficulty"]')?.focus({preventScroll:true});
      return;
    }
    if(modal==='multiplayer' && roomTab==='create' && !room && !pending){
      const next=changeRoomSetup(roomSetup,name,value);
      if(next){
        keepForm();roomSetup=next;errorMessage='';drawDialog();
        dialog.querySelector(name==='roomSeatCount' ? '[name="roomSeatCount"]:checked' : 'select[name="'+name+'"]')?.focus({preventScroll:true});
        return;
      }
    }
    if (['soloVictoryMode','roomVictoryMode','soloCivilization','joinCivilization'].includes(name)) {
      keepForm();
      if(name==='soloVictoryMode' && Object.hasOwn(modeLabels,value) && (selectedRivals || value!=='conquest')) selectedMode=value;
      if(name==='roomVictoryMode' && Object.hasOwn(modeLabels,value)) roomVictoryMode=value;
      if(name==='soloCivilization' && validCivilization(value)) selectedCivilization=value;
      if(name==='joinCivilization' && validCivilization(value)) joinCivilization=value;
      drawDialog();
      dialog.querySelector('[name="'+name+'"]'+(name.endsWith('Mode')?':checked':''))?.focus({preventScroll:true});
      return;
    }
    const pick=/^lobby-civilization-([0-3])$/.exec(name || '');
    if (pick && validCivilization(value) && room?.phase==='lobby') {
      mutate('civilization',{civilization:value,seat:Number(pick[1])});
      return;
    }
    if (name !== 'mapId' && name !== 'mapSize') return;
    keepForm();
    if (name === 'mapId') selectedMap=value;
    else selectedSize=value;
    drawDialog();
    dialog.querySelector(`input[name="${name}"]:checked`)?.focus({preventScroll:true});
  });
  solo = restoreSolo(read(SOLO_KEY,null));
  formName = String(read(NAME_KEY, '') || '');
  const title = document.getElementById('title-screen');
  const syncLocale = () => title.querySelectorAll('[data-title-lang]').forEach(button => {
    button.setAttribute('aria-pressed',String(button.dataset.titleLang === getLanguage()));
  });
  syncLocale();
  document.addEventListener('civitas-language',syncLocale);
  document.getElementById('title-nav').addEventListener('click',enterTitle);
  title.addEventListener('click', event => {
    const locale = event.target.closest('[data-title-lang]')?.dataset.titleLang;
    if (locale) { setLanguage(locale); return; }
    const action = event.target.closest('[data-title]')?.dataset.title;
    if (pending || !action) return;
    if (action === 'solo') { selectCampaignSettings(solo); open('campaign-atlas'); }
    if (action === 'reconnect') reconnectRoom(read(LAST_ROOM_KEY,''));
    if (action === 'create' || action === 'join') {
      joinCode = '';
      selectCampaignSettings(solo);
      open('multiplayer',action);
    }
  });
  dialog.addEventListener('click', e => {
    const btn = e.target.closest('button[data-act]');
    if (btn) modalAction(btn.dataset.act);
    else if (e.target === dialog) {
      const bounds = dialog.getBoundingClientRect();
      if (e.clientX < bounds.left || e.clientX > bounds.right || e.clientY < bounds.top || e.clientY > bounds.bottom) dismissDialog();
    }
  });
  dialog.addEventListener('submit', e => {
    if (e.target.matches('[data-room-form]')) { e.preventDefault(); seatRequest(e.target); }
  });
  dialog.addEventListener('cancel', e => { e.preventDefault(); dismissDialog(); });
  dialog.addEventListener('close', () => { if (!dialog.open) modal = ''; });
  document.addEventListener('visibilitychange', () => {
    if (mode === 'online' && !document.hidden && !polling) { clearTimeout(pollTimer); poll(); }
  });
  updateRoomShortcut();
  const entry = launchDestination(location.href, Boolean(solo), read(SEATS_KEY,{}));
  const address = new URL(location.href);
  if (address.searchParams.has('setup')) {
    address.searchParams.delete('setup');
    address.searchParams.delete('region');
    history.replaceState(null,'',address);
  }
  if (entry.screen === 'setup') {
    selectCampaignSettings(solo);
    if (entry.region) selectedMap=entry.region;
    if (entry.mode === 'solo') open('campaign-atlas');
    else open('multiplayer',entry.mode);
  }
  if (entry.screen === 'reconnect') await reconnectRoom(entry.code);
  if (entry.screen === 'solo') returnToSolo();
  if (entry.screen === 'join') {
    open('multiplayer','join',entry.code);
    if (!entry.code) showError('This invitation has an invalid room code.');
  }
  if (mode === 'solo') runBots();
  if (!modal && mode !== 'home') checkFinished();
}
export const Game = {init, doAction, eventText, endTurn:()=>doAction('end'), open, close};
window.Game = Game;
